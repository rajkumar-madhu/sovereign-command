import type { AuditEntry, EvidenceArtifact, ExecutionTrace } from "@/data/types";

export const STAGE1_APPROVAL_ID = "apr-clb-01";
export const STAGE1_EXECUTION_ID = "exec-clb-01";
export const STAGE1_CORRELATION_ID = "corr-clb-01";
export const STAGE1_INCIDENT_ID = "inc-clb-01";

export interface LiveAuditEvent {
  id: string;
  correlationId: string;
  executionId: string;
  at: string;
  tenantId: string;
  agentId: string;
  action: string;
  decision: string;
  outcome: string;
}

export interface LiveEvidenceArtefact {
  id: string;
  tenantId: string;
  incidentId: string;
  kind: string;
  collectedAt: string;
  hash: string;
  body: string;
  provenance: string;
}

export interface LiveEvidenceBundle {
  remediator: "held";
  wouldExecute: boolean;
  executionId: string;
  tenantId: string;
  generatedAt?: string;
  chain: { genesis: string; head: string; remediator: "held"; links: unknown[] };
  evidence: LiveEvidenceArtefact[];
  audit: LiveAuditEvent[];
}

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

function mapLiveDecision(decision: string): AuditEntry["decision"] {
  const d = decision.toLowerCase();
  if (d === "deny" || d === "denied") return "denied";
  if (d === "allow" || d === "allowed") return "allowed";
  return "approval-required";
}

function toolFromAction(action: string): string {
  const token = action.trim().split(/\s+/)[0] ?? "stage1";
  return token.includes(".") ? token.split(".")[0]! : token;
}

function isLiveAuditEvent(value: unknown): value is LiveAuditEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as LiveAuditEvent;
  return (
    typeof e.id === "string" &&
    typeof e.correlationId === "string" &&
    typeof e.at === "string" &&
    typeof e.tenantId === "string" &&
    typeof e.agentId === "string" &&
    typeof e.action === "string" &&
    typeof e.decision === "string" &&
    typeof e.outcome === "string"
  );
}

export function toAuditEntries(events: LiveAuditEvent[]): AuditEntry[] {
  return events.map((e) => ({
    id: `live-${e.id}`,
    correlationId: e.correlationId,
    time: e.at,
    user: "system",
    agentId: e.agentId,
    tenantId: e.tenantId,
    tool: toolFromAction(e.action),
    action: e.action,
    decision: mapLiveDecision(e.decision),
    outcome: e.outcome,
  }));
}

export async function fetchLiveAudit(
  executionId: string,
  tenantId: string,
): Promise<AuditEntry[] | null> {
  const base = stage1ApiUrl();
  if (!base || !tenantId.trim()) return null;
  try {
    const res = await fetch(
      `${base}/executions/${encodeURIComponent(executionId)}/audit?tenantId=${encodeURIComponent(tenantId)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || !("audit" in body) || !Array.isArray(body.audit)) {
      return null;
    }
    const events = body.audit.filter(isLiveAuditEvent);
    return events.length ? toAuditEntries(events) : [];
  } catch {
    return null;
  }
}

function isLiveEvidenceArtefact(value: unknown): value is LiveEvidenceArtefact {
  if (!value || typeof value !== "object") return false;
  const e = value as LiveEvidenceArtefact;
  return (
    typeof e.id === "string" &&
    typeof e.tenantId === "string" &&
    typeof e.hash === "string" &&
    typeof e.body === "string" &&
    typeof e.kind === "string" &&
    typeof e.collectedAt === "string"
  );
}

export function toEvidenceArtifacts(
  events: LiveEvidenceArtefact[],
  seed: EvidenceArtifact[],
): EvidenceArtifact[] {
  return events.map((e) => {
    const prior = seed.find((s) => s.id === e.id);
    return {
      id: e.id,
      name: prior?.name ?? `${e.id}.txt`,
      kind: prior?.kind ?? e.kind,
      collected: e.collectedAt,
      hash: e.hash,
      body: e.body,
      incidentId: e.incidentId,
      resource: prior?.resource,
    };
  });
}

export async function fetchLiveEvidence(
  executionId: string,
  tenantId: string,
  seed: EvidenceArtifact[] = [],
): Promise<EvidenceArtifact[] | null> {
  const base = stage1ApiUrl();
  if (!base || !tenantId.trim()) return null;
  try {
    const res = await fetch(
      `${base}/executions/${encodeURIComponent(executionId)}/evidence?tenantId=${encodeURIComponent(tenantId)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || !("evidence" in body) || !Array.isArray(body.evidence)) {
      return null;
    }
    const events = body.evidence.filter(isLiveEvidenceArtefact);
    return events.length ? toEvidenceArtifacts(events, seed) : [];
  } catch {
    return null;
  }
}

export async function fetchLiveEvidenceBundle(
  executionId: string,
  tenantId: string,
): Promise<LiveEvidenceBundle | null> {
  const base = stage1ApiUrl();
  if (!base || !tenantId.trim()) return null;
  try {
    const res = await fetch(
      `${base}/executions/${encodeURIComponent(executionId)}/evidence-bundle?tenantId=${encodeURIComponent(tenantId)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || !("chain" in body) || !("evidence" in body)) {
      return null;
    }
    const payload = body as LiveEvidenceBundle;
    if (payload.remediator !== "held") return null;
    return payload;
  } catch {
    return null;
  }
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface LiveHypothesis {
  id: string;
  claim: string;
  status: "supported" | "rejected" | "unknown";
  evidenceIds: string[];
  reason: string;
}

export interface LiveRcaPackage {
  incidentId: string;
  rootCause: string;
  confidence: number;
  supporting: LiveHypothesis[];
  rejected: LiveHypothesis[];
  unknowns: string[];
  recommendation: string;
  productionWriteRequired: boolean;
}

export interface LiveRcaResult {
  remediator: "held";
  wouldExecute: boolean;
  executionId: string;
  tenantId: string;
  incidentId?: string;
  rca: LiveRcaPackage | null;
}

function isLiveHypothesis(value: unknown): value is LiveHypothesis {
  if (!value || typeof value !== "object") return false;
  const h = value as LiveHypothesis;
  return (
    typeof h.id === "string" &&
    typeof h.claim === "string" &&
    typeof h.reason === "string" &&
    Array.isArray(h.evidenceIds)
  );
}

function isLiveRcaPackage(value: unknown): value is LiveRcaPackage {
  if (!value || typeof value !== "object") return false;
  const r = value as LiveRcaPackage;
  return (
    typeof r.incidentId === "string" &&
    typeof r.rootCause === "string" &&
    typeof r.confidence === "number" &&
    Array.isArray(r.supporting) &&
    Array.isArray(r.rejected) &&
    typeof r.recommendation === "string"
  );
}

export async function fetchLiveRca(
  executionId: string,
  tenantId: string,
): Promise<LiveRcaResult | null> {
  const base = stage1ApiUrl();
  if (!base || !tenantId.trim()) return null;
  try {
    const res = await fetch(
      `${base}/executions/${encodeURIComponent(executionId)}/rca?tenantId=${encodeURIComponent(tenantId)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || !("rca" in body) || !("remediator" in body)) {
      return null;
    }
    const payload = body as LiveRcaResult;
    if (payload.remediator !== "held") return null;
    if (payload.rca && !isLiveRcaPackage(payload.rca)) return null;
    if (payload.rca) {
      payload.rca.supporting = payload.rca.supporting.filter(isLiveHypothesis);
      payload.rca.rejected = payload.rca.rejected.filter(isLiveHypothesis);
    }
    return payload;
  } catch {
    return null;
  }
}

export interface LivePolicyEvaluation {
  action: string;
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  reason: string;
  killSwitchIdle: boolean;
}

export interface LivePolicyResult {
  remediator: "held";
  wouldExecute: boolean;
  executionId: string;
  tenantId: string;
  environment?: string;
  evaluations: LivePolicyEvaluation[];
}

function isLivePolicyEvaluation(value: unknown): value is LivePolicyEvaluation {
  if (!value || typeof value !== "object") return false;
  const e = value as LivePolicyEvaluation;
  return (
    typeof e.action === "string" &&
    (e.decision === "ALLOW" || e.decision === "DENY" || e.decision === "REQUIRE_APPROVAL") &&
    typeof e.reason === "string"
  );
}

export async function fetchLivePolicy(
  executionId: string,
  tenantId: string,
): Promise<LivePolicyResult | null> {
  const base = stage1ApiUrl();
  if (!base || !tenantId.trim()) return null;
  try {
    const res = await fetch(
      `${base}/executions/${encodeURIComponent(executionId)}/policy?tenantId=${encodeURIComponent(tenantId)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== "object" || !("evaluations" in body) || !("remediator" in body)) {
      return null;
    }
    const payload = body as LivePolicyResult;
    if (payload.remediator !== "held") return null;
    if (!Array.isArray(payload.evaluations)) return null;
    return {
      ...payload,
      wouldExecute: false,
      evaluations: payload.evaluations.filter(isLivePolicyEvaluation),
    };
  } catch {
    return null;
  }
}

type SeedRca = {
  incidentId: string;
  title: string;
  confidence: number;
  risk: "low" | "medium" | "high" | "critical";
  productionWriteRequired: boolean;
  rootCause: string;
  evidence: Array<{
    id: string;
    claim: string;
    status: "verified" | "partial";
    artifacts: string[];
    check: string;
    capturedAt: string;
    hostname?: string;
    ipAddress?: string;
    logs: string;
    output: string;
  }>;
  rejected: Array<{
    id: string;
    claim: string;
    artifacts: string[];
    reason: string;
    output: string;
  }>;
  recommendation: string;
  owner: string;
};

/** Overlay live Stage-1 compileRca onto the seed CrashLoop RCA package. */
export function overlayLiveRca(seed: SeedRca, live: LiveRcaPackage, artefacts: LiveEvidenceArtefact[]): SeedRca {
  const locus = seed.evidence[0];
  const capturedAt = artefacts[0]?.collectedAt ?? locus?.capturedAt ?? new Date().toISOString();
  return {
    ...seed,
    confidence: live.confidence,
    productionWriteRequired: false,
    rootCause: live.rootCause,
    recommendation: `${live.recommendation} Stage-1 remediator remains held.`,
    evidence: live.supporting.map((h) => ({
      id: h.id,
      claim: h.claim,
      status: "verified" as const,
      artifacts: h.evidenceIds,
      check: "stage1 compileRca · sealed evidence",
      capturedAt,
      hostname: locus?.hostname,
      ipAddress: locus?.ipAddress,
      logs: h.reason,
      output: artefacts
        .filter((a) => h.evidenceIds.includes(a.id))
        .map((a) => `${a.id} ${a.hash}`)
        .join("\n"),
    })),
    rejected: live.rejected.map((h) => ({
      id: h.id,
      claim: h.claim,
      artifacts: h.evidenceIds,
      reason: h.reason,
      output: "Stage-1 remediator held",
    })),
  };
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
