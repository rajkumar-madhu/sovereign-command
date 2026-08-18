import type { ExecutionTrace } from "@/data/types";

export const STAGE1_APPROVAL_ID = "apr-clb-01";

export interface LiveApproval {
  id: string;
  executionId: string;
  request: string;
  agentId: string;
  tenantId: string;
  customerId?: string;
  requiredRoles: string[];
  approvedRoles: string[];
  signedActorIds?: string[];
  risk: "low" | "medium" | "high" | "critical";
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  remediator: "held";
}

export interface LiveDecideResult {
  approval: LiveApproval;
  remediator: "held";
  wouldExecute: boolean;
  approvalSatisfied?: boolean;
  trace?: ExecutionTrace;
}

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

function isLiveApproval(value: unknown): value is LiveApproval {
  if (!value || typeof value !== "object") return false;
  const a = value as LiveApproval;
  return (
    typeof a.id === "string" &&
    typeof a.request === "string" &&
    typeof a.tenantId === "string" &&
    Array.isArray(a.requiredRoles) &&
    (a.status === "pending" || a.status === "approved" || a.status === "rejected")
  );
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

export async function fetchLiveApproval(
  id: string,
  tenantId: string,
): Promise<LiveApproval | null> {
  const base = stage1ApiUrl();
  if (!base || !tenantId.trim()) return null;
  try {
    const res = await fetch(
      `${base}/approvals/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    return isLiveApproval(body)
      ? { ...body, approvedRoles: body.approvedRoles ?? [], remediator: "held" }
      : null;
  } catch {
    return null;
  }
}

export async function decideLiveApproval(input: {
  id: string;
  decision: "approved" | "rejected";
  tenantId: string;
  actorRoles: string[];
  actorId?: string;
}): Promise<{ ok: true; result: LiveDecideResult } | { ok: false; error: string }> {
  const base = stage1ApiUrl();
  if (!base) return { ok: false, error: "Stage-1 API is not configured" };
  try {
    const res = await fetch(`${base}/approvals/${encodeURIComponent(input.id)}/decide`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        decision: input.decision,
        tenantId: input.tenantId,
        actorRoles: input.actorRoles,
        actorId: input.actorId,
      }),
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const error =
        body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error
          : `Stage-1 decide failed (${res.status})`;
      return { ok: false, error };
    }
    if (!body || typeof body !== "object" || !("approval" in body)) {
      return { ok: false, error: "Stage-1 decide returned an unexpected body" };
    }
    const payload = body as LiveDecideResult;
    if (!isLiveApproval(payload.approval)) {
      return { ok: false, error: "Stage-1 decide returned an invalid approval" };
    }
    return { ok: true, result: payload };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Stage-1 decide failed" };
  }
}

export function stage1ApiConfigured(): boolean {
  return Boolean(stage1ApiUrl());
}
