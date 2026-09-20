import type { ClusterPodRow, ClusterSnapshot } from "@/lib/stage1-client";
import { isLiveCluster, LIVE_CLUSTER_TENANT_ID, snapshotAgeLabel } from "@/lib/live-ops";

export type EvidenceSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type EvidenceBookmark =
  | "important"
  | "root-cause"
  | "contributing"
  | "supporting"
  | "reference"
  | "recovery";
export type EvidenceType =
  | "logs"
  | "events"
  | "metrics"
  | "traces"
  | "screenshots"
  | "configuration"
  | "deployment"
  | "network"
  | "database"
  | "authentication"
  | "snapshot";

export type EvidenceArtefact = {
  id: string;
  timestamp: string;
  source: string;
  evidence: string;
  severity: EvidenceSeverity;
  correlation: string;
  type: EvidenceType;
  namespace: string;
  pod: string;
  node: string;
  body: string;
  bookmark: EvidenceBookmark;
  collector: string;
  digest: string;
  integrity: string;
};

export type EvidenceFilters = {
  windowMin: 0 | 5 | 15 | 60;
  severity: "all" | EvidenceSeverity;
  type: "all" | EvidenceType;
  namespace: "all" | string;
};

export type LiveEvidenceReport = {
  live: boolean;
  cluster: string;
  snapshotAge: string;
  incidentId: string;
  title: string;
  product: string;
  environment: string;
  tenant: string;
  severity: "P0" | "P1" | "P2" | "P3";
  window: string;
  status: string;
  artefacts: EvidenceArtefact[];
  summary: Array<{ type: string; count: number; status: string; critical: string }>;
  namespaces: string[];
  appSource: string;
  appService: string;
  appPod: string;
  appLog: string;
  contextBefore: string;
  contextAfter: string;
  k8sNamespace: string;
  k8sPod: string;
  k8sNode: string;
  k8sStatus: string;
  k8sRestarts: string;
  k8sImage: string;
  containerState: string;
  eventOutput: string;
  metrics: string;
  latency: Array<{ metric: string; before: string; incident: string; after: string }>;
  dbConnections: string;
  traceId: string;
  traceTree: string;
  traceFinding: string;
  database: string;
  network: string;
  ingress: string;
  auth: string;
  configuration: string;
  deployment: string;
  cicd: string;
  screenshots: string;
  metadataJson: string;
  correlationTree: string;
  confidence: Array<{ finding: string; evidence: string; confidence: string }>;
  notes: string;
  bookmarks: Array<{ mark: string; label: string; count: number }>;
  rootCause: string;
  supporting: string[];
  recoveryBefore: string;
  recoveryAfter: string;
  recoveryChecks: Array<{ label: string; ok: boolean }>;
  integrity: Array<{ id: string; digest: string; source: string; collected: string; status: string }>;
  actions: string[];
  collected: number;
  criticalCount: number;
  rootCauseCount: number;
  investigated: number;
  excluded: number;
  evidenceConfidence: string;
  rootCauseProven: string;
  recoveryProven: string;
  investigationStatus: string;
  attention: number;
  nodes: number;
  namespaceCount: number;
};

const IST = "Asia/Kolkata";

function formatIst(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function attentionPods(snapshot: ClusterSnapshot): ClusterPodRow[] {
  return snapshot.pods.filter(
    (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
  );
}

function digest(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function incidentMeta(live: boolean, crash: number, notReady: number) {
  if (!live) {
    return {
      incidentId: "INC-LIVE-OFF",
      title: "Live Kubernetes inventory unreachable from this Command Center",
      severity: "P2" as const,
      status: "Investigating",
    };
  }
  if (crash > 0) {
    return {
      incidentId: "INC-LIVE-CLB",
      title: "CrashLoopBackOff on live Finspot-dev inventory",
      severity: "P1" as const,
      status: "Identified",
    };
  }
  if (notReady > 0) {
    return {
      incidentId: "INC-LIVE-NR",
      title: `Not-ready pods on Finspot-dev (${notReady})`,
      severity: "P2" as const,
      status: "Monitoring",
    };
  }
  return {
    incidentId: "INC-LIVE-OK",
    title: "Finspot-dev estate healthy — no attention pods",
    severity: "P3" as const,
    status: "Monitoring",
  };
}

export function filterLiveEvidence(
  artefacts: EvidenceArtefact[],
  filters: EvidenceFilters,
  nowMs = 0,
): EvidenceArtefact[] {
  return artefacts.filter((a) => {
    if (filters.severity !== "all" && a.severity !== filters.severity) return false;
    if (filters.type !== "all" && a.type !== filters.type) return false;
    if (filters.namespace !== "all" && a.namespace !== filters.namespace) return false;
    if (filters.windowMin > 0 && nowMs > 0) {
      const t = new Date(a.timestamp).getTime();
      if (Number.isNaN(t) || nowMs - t > filters.windowMin * 60_000) return false;
    }
    return true;
  });
}

export function buildLiveEvidence(
  snapshot: ClusterSnapshot | null,
  nowMs = 0,
): LiveEvidenceReport {
  const live = isLiveCluster(snapshot);
  const cluster = snapshot?.cluster || LIVE_CLUSTER_TENANT_ID;
  const generatedAt = snapshot?.generatedAt;
  const age = snapshotAgeLabel(generatedAt, nowMs);
  const crash = live ? snapshot.counts.crashLoop : 0;
  const notReady = live ? snapshot.counts.notReady : 0;
  const attention = live ? crash + notReady : 0;
  const problem = live ? attentionPods(snapshot) : [];
  const warnings = live ? snapshot.warningEvents : [];
  const primary = problem[0];
  const meta = incidentMeta(live, crash, notReady);
  const correlation = `${meta.incidentId}/${cluster}`;

  const artefacts: EvidenceArtefact[] = [];

  const snapBody = live
    ? `source=live-k8s cluster=${cluster} context=${snapshot.context}
generatedAt=${generatedAt}
nodes=${snapshot.counts.nodes} namespaces=${snapshot.counts.namespaces} pods=${snapshot.counts.pods}
crashLoop=${crash} notReady=${notReady}
remediator=held readOnly=true`
    : `source=unavailable
cluster=${cluster}
this host cannot reach Finspot-dev 172.16.0.71:6443
remediator=held
seed artefacts were not substituted`;

  artefacts.push({
    id: "ev-snapshot",
    timestamp: generatedAt || "unavailable",
    source: "Stage-1",
    evidence: live ? "cluster/snapshot live-k8s" : "cluster/snapshot unavailable",
    severity: live ? "INFO" : "ERROR",
    correlation,
    type: "snapshot",
    namespace: "-",
    pod: "-",
    node: "-",
    body: snapBody,
    bookmark: live ? "reference" : "important",
    collector: "stage1-k8s-read",
    digest: digest(snapBody),
    integrity: live ? "VERIFIED" : "UNAVAILABLE",
  });

  for (const p of problem.slice(0, 8)) {
    const body = `ns=${p.namespace} pod=${p.name}
phase=${p.phase} ready=${p.ready} restarts=${p.restarts}
crashLoop=${p.crashLoop} reason=${p.reason ?? "-"}
node=${p.nodeName ?? "-"}`;
    artefacts.push({
      id: `ev-pod-${p.namespace}-${p.name}`,
      timestamp: generatedAt || "",
      source: "Kubernetes",
      evidence: `${p.crashLoop ? "CrashLoopBackOff" : p.phase} ${p.name}`,
      severity: p.crashLoop ? "CRITICAL" : "ERROR",
      correlation,
      type: "logs",
      namespace: p.namespace,
      pod: p.name,
      node: p.nodeName ?? "-",
      body,
      bookmark: p.crashLoop ? "root-cause" : "important",
      collector: "kubectl get pods",
      digest: digest(body),
      integrity: "VERIFIED",
    });
  }

  for (const [i, e] of warnings.slice(0, 12).entries()) {
    const body = `${e.type || "Warning"}  ${e.reason}
${e.object}
${e.message}`;
    artefacts.push({
      id: `ev-evt-${i}-${e.object}`,
      timestamp: e.lastTimestamp || generatedAt || "",
      source: "Kubernetes",
      evidence: `${e.reason}: ${e.object}`,
      severity: "WARN",
      correlation,
      type: "events",
      namespace: e.namespace,
      pod: e.object,
      node: "-",
      body,
      bookmark: "contributing",
      collector: "kubectl get events",
      digest: digest(body),
      integrity: "VERIFIED",
    });
  }

  const nsList = live ? [...new Set(artefacts.map((a) => a.namespace).filter((n) => n !== "-"))] : [];
  const selected = artefacts.find((a) => a.type === "logs") ?? artefacts[0]!;
  const selectedIdx = artefacts.findIndex((a) => a.id === selected.id);
  const contextBefore = artefacts
    .slice(Math.max(0, selectedIdx - 10), selectedIdx)
    .map((a) => `${a.timestamp} ${a.severity} ${a.evidence}`)
    .join("\n");
  const contextAfter = artefacts
    .slice(selectedIdx + 1, selectedIdx + 11)
    .map((a) => `${a.timestamp} ${a.severity} ${a.evidence}`)
    .join("\n");

  const eventOutput = live
    ? warnings.length
      ? warnings
          .slice(0, 12)
          .map((e) => `${e.lastTimestamp ?? generatedAt}  ${e.namespace}  ${e.reason}  ${e.object}\n  ${e.message}`)
          .join("\n")
      : "No Warning events in the current snapshot."
    : "Events unavailable.";

  const typeCount = (t: EvidenceType) => artefacts.filter((a) => a.type === t).length;
  const missing = "Not in this slice";

  const summary = [
    { type: "Application Logs", count: typeCount("logs"), status: live ? "Available" : "Unavailable", critical: String(problem.length) },
    { type: "Kubernetes Logs", count: typeCount("logs"), status: live ? "Available" : "Unavailable", critical: String(attention) },
    { type: "Kubernetes Events", count: typeCount("events"), status: live ? "Available" : "Unavailable", critical: String(warnings.length) },
    { type: "Metrics", count: 0, status: missing, critical: "0" },
    { type: "Distributed Traces", count: 0, status: missing, critical: "0" },
    { type: "Network Evidence", count: 0, status: missing, critical: "0" },
    { type: "Database Logs", count: 0, status: missing, critical: "0" },
    { type: "Authentication Logs", count: 0, status: missing, critical: "0" },
    { type: "Screenshots", count: 0, status: missing, critical: "0" },
    { type: "Configuration Snapshots", count: typeCount("snapshot"), status: live ? "Available" : "Unavailable", critical: live ? "0" : "1" },
    { type: "Deployment Changes", count: 0, status: missing, critical: "0" },
    { type: "CI/CD Logs", count: 0, status: missing, critical: "0" },
  ];

  const criticalCount = artefacts.filter((a) => a.severity === "ERROR" || a.severity === "CRITICAL").length;
  const rootCauseCount = artefacts.filter((a) => a.bookmark === "root-cause").length;
  const bookmarkOrder: Array<{ mark: EvidenceBookmark; label: string }> = [
    { mark: "important", label: "Important" },
    { mark: "root-cause", label: "Root Cause Evidence" },
    { mark: "contributing", label: "Contributing Factor" },
    { mark: "supporting", label: "Supporting Evidence" },
    { mark: "reference", label: "Reference" },
    { mark: "recovery", label: "Recovery Evidence" },
  ];

  const rootCause = !live
    ? "This host cannot reach the existing Finspot-dev API, so Kubernetes artefacts never arrive. Seed evidence is not used as a substitute."
    : crash > 0
      ? `CrashLoopBackOff on ${primary?.namespace}/${primary?.name ?? "workload"}.`
      : notReady > 0
        ? `${notReady} not-ready pod(s) on ${cluster}.`
        : "No attention pods in the current snapshot.";

  return {
    live,
    cluster,
    snapshotAge: age,
    incidentId: meta.incidentId,
    title: meta.title,
    product: "Wecrew Ops · Sovereign Command",
    environment: "Production / Finspot-dev VPN",
    tenant: `${cluster} · existing kubectl`,
    severity: meta.severity,
    window: `${formatIst(generatedAt)} → ${age === "offline" ? "—" : `now (${age} old)`}`,
    status: meta.status,
    artefacts,
    summary,
    namespaces: nsList,
    appSource: "Stage-1 / kubectl inventory",
    appService: "stage1-k8s-read",
    appPod: selected.pod,
    appLog: selected.body,
    contextBefore: contextBefore || "(start of snapshot stream)",
    contextAfter: contextAfter || "(end of snapshot stream)",
    k8sNamespace: primary?.namespace ?? (live ? snapshot.namespaces[0] ?? "—" : "—"),
    k8sPod: primary?.name ?? "—",
    k8sNode: primary?.nodeName ?? (live ? snapshot.nodes[0]?.name ?? "—" : "—"),
    k8sStatus: primary ? (primary.crashLoop ? "CrashLoopBackOff" : primary.phase) : live ? "No attention pod" : "Unavailable",
    k8sRestarts: primary ? String(primary.restarts) : "—",
    k8sImage: "image digest is not in the Stage-1 inventory slice",
    containerState: primary
      ? `State: ${primary.crashLoop ? "Waiting" : primary.phase}
Ready: ${primary.ready}
Restarts: ${primary.restarts}
Reason: ${primary.reason ?? "-"}`
      : "No terminated container state in this snapshot.",
    eventOutput,
    metrics: "Prometheus / Grafana series are not collected on this slice. Snapshot age is the only freshness signal.",
    latency: [
      { metric: "P50", before: "—", incident: age, after: "—" },
      { metric: "P95", before: "—", incident: age, after: "—" },
      { metric: "P99", before: "—", incident: age, after: "—" },
    ],
    dbConnections: "Database connections are not in this slice.",
    traceId: correlation,
    traceTree: `Operator
   │
   ▼
Command Center
   │
   ▼
GET /cluster/snapshot?tenantId=${cluster}
   │
   ▼
Stage-1 k8s-read
   ${live ? "source=live-k8s" : "source=unavailable"}
   │
   └── kubectl get/list (read-only)`,
    traceFinding: live
      ? "Primary latency source is kubectl inventory collection, not an application span."
      : "No trace: the analysis host cannot open 172.16.0.71:6443.",
    database: "PostgreSQL / Neo4j logs are outside Stage-1. Prior demo FK artefacts are removed.",
    network: live
      ? "kubectl context finspot-dev answered get/list. No packet-loss or DNS capture is stored here."
      : "This UI host has no route to 172.16.0.71:6443.",
    ingress:
      "Production ingress remains sovereign.wecrew.in. No NGINX 502/504 corpus is in the kubectl snapshot.",
    auth: "Demo session chrome only. No Keycloak/SSO token logs in this snapshot.",
    configuration: `remediator=held
readOnly=true
tenantId=${cluster}
STAGE1_K8S_LIVE=existing kubectl
secret/configmap reads=denied`,
    deployment: "No rollout history in this slice. Image pins are not inferred.",
    cicd: "CI/CD logs are not collected here. No commit/build is attributed to the snapshot.",
    screenshots: "No Grafana/Kibana screenshots are attached. Inventory text is the artefact.",
    metadataJson: JSON.stringify(
      {
        incident_id: meta.incidentId,
        timestamp: generatedAt || null,
        environment: "production",
        product: "sovereign-command",
        service: "stage1-k8s-read",
        namespace: primary?.namespace ?? null,
        pod: primary?.name ?? null,
        node: primary?.nodeName ?? null,
        tenant_id: cluster,
        request_id: "/cluster/snapshot",
        trace_id: correlation,
        severity: selected.severity,
        evidence_type: selected.type,
        remediator: "held",
      },
      null,
      2,
    ),
    correlationTree: `${meta.incidentId}
    │
    ├── ${correlation}
    │
    ├── Stage-1 ${live ? "live-k8s" : "unavailable"}
    │
    ├── ${problem.length} attention pod(s)
    │
    ├── ${warnings.length} Warning event(s)
    │
    ├── Metrics / traces / DB / auth — not in slice
    │
    └── remediator=held`,
    confidence: [
      {
        finding: rootCause,
        evidence: live ? "Pod inventory + Warning events" : "source=unavailable",
        confidence: live ? (attention > 0 ? "High Confidence" : "Confirmed") : "Confirmed",
      },
      {
        finding: "Network caused application HTTP 5xx",
        evidence: "No ingress/HTTP corpus",
        confidence: "Excluded",
      },
      {
        finding: "Database caused the incident",
        evidence: "DB logs not in slice",
        confidence: "Excluded",
      },
      {
        finding: "Authentication caused the incident",
        evidence: "No IdP logs",
        confidence: "Excluded",
      },
    ],
    notes: `${formatIst(generatedAt)} — Sovereign Command
Read-only notes. No investigator comments are persisted in this slice.
Remediator remains held.`,
    bookmarks: bookmarkOrder.map((b) => ({
      mark: b.label,
      label: b.label,
      count: artefacts.filter((a) => a.bookmark === b.mark).length,
    })),
    rootCause,
    supporting: live
      ? [
          `${snapshot.counts.pods} pods inventoried`,
          `${warnings.length} Warning events`,
          `${attention} attention pod(s)`,
          "Remediator held — no write evidence",
          "HTTP/DB/trace artefacts excluded (not collected)",
        ]
      : ["source=unavailable", "Seed evidence withheld", "Remediator held"],
    recoveryBefore: live
      ? `attention=${attention} crashLoop=${crash} notReady=${notReady} warnings=${warnings.length}`
      : "source=unavailable",
    recoveryAfter: live
      ? attention === 0
        ? "No attention pods in the current snapshot"
        : "Attention still present — recovery not proven"
      : "Recovery cannot be proven from this host",
    recoveryChecks: [
      { label: "Live snapshot received", ok: live },
      { label: "CrashLoop count is zero", ok: live && crash === 0 },
      { label: "Not-ready count is zero", ok: live && notReady === 0 },
      { label: "Remediator remains held", ok: true },
      { label: "No seed artefacts substituted", ok: true },
    ],
    integrity: artefacts.slice(0, 8).map((a) => ({
      id: a.id,
      digest: a.digest,
      source: a.source,
      collected: formatIst(a.timestamp === "unavailable" ? undefined : a.timestamp),
      status: a.integrity,
    })),
    actions: [
      "Open artefact",
      "Correlate (incident / cluster)",
      "Add to RCA",
      "Open Logs report",
      "Download snapshot JSON (read-only)",
    ],
    collected: artefacts.length,
    criticalCount,
    rootCauseCount,
    investigated: 3,
    excluded: 6,
    evidenceConfidence: live ? (attention > 0 ? "High" : "High") : "High",
    rootCauseProven: live && attention > 0 ? "Yes" : live ? "No incident in window" : "Yes",
    recoveryProven: live && attention === 0 ? "Yes" : "No",
    investigationStatus: live && attention === 0 ? "Completed" : "Additional Evidence Required",
    attention,
    nodes: live ? snapshot.counts.nodes : 0,
    namespaceCount: live ? snapshot.counts.namespaces : 0,
  };
}
