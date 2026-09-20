/** Same-origin Stage-1 proxy. GET/HEAD only, allowlisted paths, session-scoped tenant. */

import { sessionFromRequest } from "./ops-auth";

export const STAGE1_PROXY_PREFIX = "/stage1-api";

export const STAGE1_ALLOWED_PATH =
  /^\/(health|cluster\/(?:snapshot|logs)\?tenantId=[A-Za-z0-9_-]+(?:&namespace=[A-Za-z0-9._-]+)?(?:&pod=[A-Za-z0-9._-]+)?|cluster\/metrics\?tenantId=[A-Za-z0-9_-]+(?:&window=[0-9]+[mhd])?(?:&series=[A-Za-z0-9_,]+)?|executions\/exec-clb-01)$/;

export function stage1Upstream(): string {
  return (process.env.STAGE1_API_URL ?? "http://127.0.0.1:8091").replace(/\/$/, "");
}

export function rewriteStage1Path(pathname: string, search: string): string | null {
  if (!pathname.startsWith(STAGE1_PROXY_PREFIX)) return null;
  const rest = pathname.slice(STAGE1_PROXY_PREFIX.length) || "/";
  const path = `${rest}${search}`;
  return STAGE1_ALLOWED_PATH.test(path) ? path : null;
}

export function scopedStage1Path(path: string, tenantId: string): string | null {
  const url = new URL(path, "http://stage1.local");
  const requested = url.searchParams.get("tenantId");
  if (requested && requested !== tenantId) return null;
  if (requested) return `${url.pathname}${url.search}`;
  if (url.pathname === "/health" || url.pathname === "/executions/exec-clb-01") {
    return `${url.pathname}${url.search}`;
  }
  url.searchParams.set("tenantId", tenantId);
  const next = `${url.pathname}?${url.searchParams.toString()}`;
  return STAGE1_ALLOWED_PATH.test(next) ? next : null;
}

export async function proxyStage1Request(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method not allowed" }, 405);
  }
  const session = sessionFromRequest(request);
  if (!session) {
    return json(
      { source: "unavailable", remediator: "held", readOnly: true, error: "operator token required" },
      401,
    );
  }
  const url = new URL(request.url);
  const path = rewriteStage1Path(url.pathname, url.search);
  if (!path) {
    return json({ error: "path not allowed" }, 404);
  }
  const scoped = scopedStage1Path(path, session.tenantId);
  if (!scoped) {
    return json({ error: "tenant scope mismatch" }, 403);
  }
  try {
    const res = await fetch(`${stage1Upstream()}${scoped}`, {
      method: request.method,
      headers: { accept: "application/json" },
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return json({ source: "unavailable", remediator: "held", readOnly: true, error: "stage1 upstream unreachable" }, 502);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
