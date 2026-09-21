import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isOperatorEmail } from "../data/operator-allowlist";

export const OPS_SESSION_COOKIE = "aegis_op";
export const OPS_AUTH_PREFIX = "/auth";

export type OperatorSession = {
  email: string;
  tenantId: string;
  role: "operator";
  exp: number;
};

export type PublicOperatorSession = {
  email: string;
  tenantId: string;
  role: "operator";
  provisioned: true;
};

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export function hashTenantToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function parseTenantTokens(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  const text = raw?.trim();
  if (!text) return map;
  if (text.startsWith("{")) {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    for (const [tenantId, value] of Object.entries(parsed)) {
      const hash = Array.isArray(value) ? value[0] : value;
      if (typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash) && /^[A-Za-z0-9_-]+$/.test(tenantId)) {
        map.set(tenantId, hash);
      }
    }
    return map;
  }
  for (const part of text.split(",")) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const tenantId = part.slice(0, idx).trim();
    const hash = part.slice(idx + 1).trim().toLowerCase();
    if (/^[A-Za-z0-9_-]+$/.test(tenantId) && /^[a-f0-9]{64}$/.test(hash)) {
      map.set(tenantId, hash);
    }
  }
  return map;
}

export function tenantIdForToken(token: string, tokens: Map<string, string>): string | null {
  if (token.trim().length < 16) return null;
  const given = Buffer.from(hashTenantToken(token), "hex");
  for (const [tenantId, hash] of tokens) {
    const expected = Buffer.from(hash, "hex");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return tenantId;
  }
  return null;
}

export function sessionSecret(): string {
  return (process.env.AEGIS_SESSION_SECRET ?? "").trim();
}

export function configuredTenantTokens(): Map<string, string> {
  return parseTenantTokens(process.env.AEGIS_TENANT_TOKENS);
}

export function signSession(session: OperatorSession, secret: string): string {
  const body = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifySession(token: string | undefined, secret: string, nowMs = Date.now()): OperatorSession | null {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OperatorSession;
    if (!isEmail(session.email) || !/^[A-Za-z0-9_-]+$/.test(session.tenantId)) return null;
    if (session.role !== "operator" || session.exp <= nowMs) return null;
    return { ...session, email: normalizeEmail(session.email) };
  } catch {
    return null;
  }
}

export function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return undefined;
}

export function sessionFromRequest(request: Request, nowMs = Date.now()): OperatorSession | null {
  const secret = sessionSecret();
  return verifySession(cookieValue(request.headers.get("cookie"), OPS_SESSION_COOKIE), secret, nowMs);
}

export function sessionCookie(value: string, maxAgeSec: number, secure: boolean): string {
  return [
    `${OPS_SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export async function handleOpsAuth(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${OPS_AUTH_PREFIX}/`)) return null;

  if (url.pathname === `${OPS_AUTH_PREFIX}/session` && request.method === "GET") {
    const session = sessionFromRequest(request);
    if (!session) return json({ provisioned: false }, 200);
    return json({
      email: session.email,
      tenantId: session.tenantId,
      role: session.role,
      provisioned: true,
    } satisfies PublicOperatorSession);
  }

  if (url.pathname === `${OPS_AUTH_PREFIX}/logout` && request.method === "POST") {
    return json({ ok: true, provisioned: false }, 200, {
      "set-cookie": sessionCookie("", 0, url.protocol === "https:"),
    });
  }

  if (url.pathname === `${OPS_AUTH_PREFIX}/bind` && request.method === "POST") {
    const secret = sessionSecret();
    const tokens = configuredTenantTokens();
    if (!secret || tokens.size === 0) {
      return json({ error: "tenant tokens are not configured on this host" }, 503);
    }
    let payload: { email?: unknown; token?: unknown };
    try {
      payload = (await request.json()) as { email?: unknown; token?: unknown };
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
    const token = typeof payload.token === "string" ? payload.token.trim() : "";
    if (!isEmail(email)) return json({ error: "valid work email is required" }, 400);
    if (!isOperatorEmail(email)) {
      return json({ error: "this email is not on the operator allowlist" }, 403);
    }
    const tenantId = tenantIdForToken(token, tokens);
    if (!tenantId) return json({ error: "unknown tenant token" }, 403);
    const session: OperatorSession = {
      email,
      tenantId,
      role: "operator",
      exp: Date.now() + 12 * 60 * 60 * 1000,
    };
    return json(
      {
        email,
        tenantId,
        role: "operator",
        provisioned: true,
      } satisfies PublicOperatorSession,
      200,
      { "set-cookie": sessionCookie(signSession(session, secret), 12 * 60 * 60, url.protocol === "https:") },
    );
  }

  return json({ error: "not found" }, 404);
}
