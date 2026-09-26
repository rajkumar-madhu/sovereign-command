/** Same-origin Stage-1 proxy. GET/HEAD only, allowlisted paths, session-scoped tenant. */

import { sessionFromRequest } from "./ops-auth";

export const STAGE1_PROXY_PREFIX = "/stage1-api";

const ALLOWED_PATHS = new Set([
  "/health",
  "/cluster/snapshot",
  "/cluster/logs",
  "/cluster/metrics",
  "/executions/exec-clb-01",
]);

const LOG_PARAMS = new Set(["tenantId", "namespace", "pod", "backend", "window", "q", "limit"]);
const METRICS_PARAMS = new Set(["tenantId", "window", "series"]);
const SNAPSHOT_PARAMS = new Set(["tenantId"]);

function paramsAllowed(pathname: string, searchParams: URLSearchParams): boolean {
  const keys = [...searchParams.keys()];
  if (pathname === "/health" || pathname === "/executions/exec-clb-01") {
    return keys.length === 0;
  }
  if (pathname === "/cluster/snapshot") {
    return keys.every((k) => SNAPSHOT_PARAMS.has(k)) && searchParams.has("tenantId");
  }
  if (pathname === "/cluster/logs") {
    if (!searchParams.has("tenantId")) return false;
    if (!keys.every((k) => LOG_PARAMS.has(k))) return false;
    const backend = searchParams.get("backend");
    if (backend && !/^(es|k8s|auto)$/.test(backend)) return false;
    const window = searchParams.get("window");
    if (window && !/^[0-9]+[mhd]$/.test(window)) return false;
    const q = searchParams.get("q");
    if (q && !/^[A-Za-z0-9._\-\s:/]{0,120}$/.test(q)) return false;
    const limit = searchParams.get("limit");
    if (limit && !/^[1-9][0-9]{0,3}$/.test(limit)) return false;
    const ns = searchParams.get("namespace");
    const pod = searchParams.get("pod");
    if (ns && !/^[A-Za-z0-9._-]+$/.test(ns)) return false;
    if (pod && !/^[A-Za-z0-9._-]+$/.test(pod)) return false;
    return true;
  }
  if (pathname === "/cluster/metrics") {
    if (!searchParams.has("tenantId")) return false;
    if (!keys.every((k) => METRICS_PARAMS.has(k))) return false;
    const window = searchParams.get("window");
    if (window && !/^[0-9]+[mhd]$/.test(window)) return false;
    const series = searchParams.get("series");
    if (series && !/^[A-Za-z0-9_,]+$/.test(series)) return false;
    return true;
  }
  return false;
}

/** Kept for tests — true when the rewritten Stage-1 path is allowlisted. */
export const STAGE1_ALLOWED_PATH = {
  test(path: string): boolean {
    try {
      const url = new URL(path, "http://stage1.local");
      if (!ALLOWED_PATHS.has(url.pathname)) return false;
      return paramsAllowed(url.pathname, url.searchParams);
    } catch {
      return false;
    }
  },
};

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
  if (requested) {
    return STAGE1_ALLOWED_PATH.test(`${url.pathname}${url.search}`)
      ? `${url.pathname}${url.search}`
      : null;
  }
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
      headers: { accept: "application/json", connection: "close" },
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
