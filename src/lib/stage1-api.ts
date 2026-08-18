import type { ExecutionTrace } from "@/data/types";

function stage1ApiUrl(): string {
  try {
    const runtime =
      typeof process !== "undefined" ? process.env?.STAGE1_API_URL : undefined;
    if (runtime?.trim()) return runtime.replace(/\/$/, "");
    const raw = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_STAGE1_API_URL;
    return raw?.replace(/\/$/, "") ?? "";
  } catch {
    return "";
  }
}

function isExecutionTrace(value: unknown): value is ExecutionTrace {
  if (!value || typeof value !== "object") return false;
  const t = value as ExecutionTrace;
  return typeof t.id === "string" && typeof t.incidentId === "string" && Array.isArray(t.hops);
}

/** Fetch a live Stage-1 trace when VITE_STAGE1_API_URL is set; otherwise null (seed fallback). */
export async function fetchLiveExecution(id: string): Promise<ExecutionTrace | null> {
  const base = stage1ApiUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/executions/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return isExecutionTrace(body) ? body : null;
  } catch {
    return null;
  }
}

export function stage1ApiConfigured(): boolean {
  return Boolean(stage1ApiUrl());
}
