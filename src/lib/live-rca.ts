import type { ClusterPodRow, ClusterSnapshot } from "@/lib/stage1-client";
import { isLiveCluster, LIVE_CLUSTER_TENANT_ID, snapshotAgeLabel } from "@/lib/live-ops";

export type RcaSeverity = "P0" | "P1" | "P2" | "P3";
export type RcaStatus = "Resolved" | "Monitoring" | "Workaround Applied" | "Open";

export type LiveRcaField = { label: string; value: string };
export type LiveRcaWhy = { why: string; answer: string };
export type LiveRcaEvent = { time: string; event: string; owner: string };
export type LiveRcaAction = {
  action: string;
  priority: string;
  owner: string;
  due: string;
  status: string;
};
export type LiveRcaCheck = { label: string; ok: boolean };

export type LiveRcaReport = {
  live: boolean;
  cluster: string;
  snapshotAge: string;
  generatedAt?: string;
  incidentId: string;
  title: string;
  environment: string;
  application: string;
  client: string;
  severity: RcaSeverity;
  incidentDate: string;
  startIst: string;
  endIst: string;
  duration: string;
  reportedBy: string;
  resolvedBy: string;
  status: RcaStatus;
  description: string;
  affectedServices: string;
  affectedUsers: string;
  impact: string[];
  impactDuration: string;
  detectionHow: string;
  detectionTime: string;
  monitoringAlert: string;
  autoDetected: boolean;
  monitoringGap: string;
  timeline: LiveRcaEvent[];
  nodeOutput: string;
  nodeFinding: string;
  podOutput: string;
  podFinding: string;
  eventOutput: string;
  logOutput: string;
  svcFinding: string;
  ingressFinding: string;
  database: string;
  dbConnectivity: string;
  networkFinding: string;
  rootCause: string;
  contributing: string[];
  fiveWhys: LiveRcaWhy[];
  finalRootCause: string;
  immediateFix: string;
  resolutionCommands: string;
  k8sChecks: LiveRcaCheck[];
  appChecks: LiveRcaCheck[];
  dbChecks: LiveRcaCheck[];
  netChecks: LiveRcaCheck[];
  monChecks: LiveRcaCheck[];
  corrective: LiveRcaAction[];
  preventive: string[];
  newMonitoring: string[];
  wentWell: string[];
  wentPoorly: string[];
  improve: string[];
  evidence: string[];
  conclusionCause: string;
  conclusionResolution: string;
  conclusionPrevent: string;
  preparedBy: string;
  reviewedBy: string;
  approvedBy: string;
  rcaDate: string;
  incidentStatus: string;
  summaryFields: LiveRcaField[];
  attention: number;
  namespaces: number;
  nodes: number;
};

const IST = "Asia/Kolkata";

function formatIst(iso: string | undefined, withTime = true): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
}

function attentionPods(snapshot: ClusterSnapshot): ClusterPodRow[] {
  return snapshot.pods.filter(
    (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
  );
}

function pad(cols: string[], widths: number[]): string {
  return cols.map((c, i) => c.padEnd(widths[i] ?? 16)).join("  ").trimEnd();
}

export function buildLiveRca(snapshot: ClusterSnapshot | null, nowMs = 0): LiveRcaReport {
  const live = isLiveCluster(snapshot);
  const cluster = snapshot?.cluster || LIVE_CLUSTER_TENANT_ID;
  const generatedAt = snapshot?.generatedAt;
  const age = snapshotAgeLabel(generatedAt, nowMs);
  const attention = live ? snapshot.counts.notReady + snapshot.counts.crashLoop : 0;
  const crash = live ? snapshot.counts.crashLoop : 0;
  const notReady = live ? snapshot.counts.notReady : 0;
  const problem = live ? attentionPods(snapshot) : [];
  const warnings = live ? snapshot.warningEvents.slice(0, 8) : [];
  const primary = problem[0];
  const ns = primary?.namespace ?? (live ? snapshot.namespaces[0] : "—");
  const date = formatIst(generatedAt, false);
  const time = formatIst(generatedAt, true);

  const offline = !live;
  const title = offline
    ? "Live Kubernetes inventory unreachable from this Command Center"
    : crash > 0
      ? `CrashLoopBackOff on ${primary?.name ?? "workload"}`
      : notReady > 0
        ? `Not-ready pods on ${cluster} (${notReady})`
        : `${cluster} estate healthy — no attention pods`;

  const incidentId = offline ? "INC-LIVE-OFF" : crash > 0 ? "INC-LIVE-CLB" : notReady > 0 ? "INC-LIVE-NR" : "INC-LIVE-OK";
  const severity: RcaSeverity = offline ? "P2" : crash > 0 ? "P1" : notReady > 0 ? "P2" : "P3";
  const status: RcaStatus = offline ? "Open" : attention > 0 ? "Monitoring" : "Resolved";

  const nodeOutput = live
    ? [
        pad(["NAME", "STATUS", "ROLES", "VERSION", "INTERNAL-IP"], [28, 10, 18, 12, 16]),
        ...snapshot.nodes.map((n) =>
          pad(
            [n.name, n.status, n.roles.join(",") || "<none>", n.version, n.internalIP ?? ""],
            [28, 10, 18, 12, 16],
          ),
        ),
      ].join("\n")
    : "Waiting for kubectl snapshot from the existing Finspot-dev context.";

  const podOutput = live
    ? [
        pad(["NAMESPACE", "NAME", "READY", "STATUS", "RESTARTS"], [18, 36, 8, 16, 10]),
        ...(problem.length > 0 ? problem : snapshot.pods.slice(0, 8)).map((p) =>
          pad(
            [p.namespace, p.name, p.ready, p.crashLoop ? "CrashLoopBackOff" : p.phase, String(p.restarts)],
            [18, 36, 8, 16, 10],
          ),
        ),
      ].join("\n")
    : "No live pod inventory.";

  const eventOutput = live
    ? warnings.length > 0
      ? warnings
          .map(
            (e) =>
              `${e.lastTimestamp ?? generatedAt}  ${e.namespace}  ${e.reason}  ${e.object}\n  ${e.message}`,
          )
          .join("\n")
      : "No Warning events in the current snapshot."
    : "Events unavailable until the live snapshot arrives.";

  const logOutput = offline
    ? `[${new Date().toISOString()}] stage1: cluster/snapshot source=unavailable
[${new Date().toISOString()}] remediator=held readOnly=true
[${new Date().toISOString()}] note: this UI host cannot reach 172.16.0.71; Finspot-dev inventory stays local-VPN only.`
    : `[${generatedAt}] source=live-k8s cluster=${cluster} context=${snapshot.context}
[${generatedAt}] counts nodes=${snapshot.counts.nodes} namespaces=${snapshot.counts.namespaces} pods=${snapshot.counts.pods} crashLoop=${crash} notReady=${notReady}
[${generatedAt}] remediator=held readOnly=true
${problem
  .slice(0, 5)
  .map(
    (p) =>
      `[${generatedAt}] attention ns=${p.namespace} pod=${p.name} phase=${p.phase} ready=${p.ready} restarts=${p.restarts} reason=${p.reason ?? "-"}`,
  )
  .join("\n")}`;

  const rootCause = offline
    ? "The public Command Center on wecrew-prod can render the UI but cannot open the existing Finspot-dev kubectl API (172.16.0.71:6443). Stage-1 live inventory therefore stays source=unavailable on this host. No seed tenant is substituted."
    : crash > 0
      ? `Pod ${primary?.name} in namespace ${ns} is CrashLoopBackOff. The remediator is held; no write or restart was executed.`
      : notReady > 0
        ? `${notReady} pod(s) are not ready on ${cluster}. Inventory is read-only; remediator remains held.`
        : `No CrashLoopBackOff or not-ready pods in the current ${cluster} snapshot. This package is a sealed health RCA, not a demo tenant report.`;

  const fiveWhys: LiveRcaWhy[] = offline
    ? [
        {
          why: "Why did live inventory fail?",
          answer: "GET /cluster/snapshot did not return source=live-k8s from this host.",
        },
        {
          why: "Why did that happen?",
          answer: "The Stage-1 API on this plane cannot reach the Finspot-dev API server.",
        },
        {
          why: "Why was that condition present?",
          answer: "Finspot-dev is on a private VPN path. Public wecrew-prod was never given that kubeconfig.",
        },
        {
          why: "Why was it not detected earlier?",
          answer: "The UI previously fell back to seed Nordic/Helios clients, which hid the missing live client.",
        },
        {
          why: "Why did existing controls not prevent it?",
          answer: "Seed fallback was treated as a valid estate instead of failing closed to the connected kubectl context.",
        },
      ]
    : [
        {
          why: "Why is this RCA open?",
          answer:
            attention > 0
              ? `${attention} attention pod(s) are present on ${cluster}.`
              : "No attention pods; this is a healthy-estate seal.",
        },
        {
          why: "Why did those pods fail (or stay healthy)?",
          answer:
            primary?.reason ||
            (attention > 0 ? "Ready probe or phase is not Running." : "All sampled workloads are Running/Succeeded."),
        },
        {
          why: "Why was that condition present?",
          answer: "Observed from kubectl get/list on the existing Finspot-dev context. No new kube client was minted.",
        },
        {
          why: "Why was it not auto-remediated?",
          answer: "Sovereign Mode holds the remediator. Secret/ConfigMap reads and write verbs stay denied.",
        },
        {
          why: "Why did existing controls not write?",
          answer: "POL-RO-002 and POL-RO-003 require dual control and block Kubernetes writes at the gateway.",
        },
      ];

  const startIso = warnings[0]?.lastTimestamp || generatedAt;
  const report: LiveRcaReport = {
    live,
    cluster,
    snapshotAge: age,
    generatedAt,
    incidentId,
    title,
    environment: "Production / private VPN",
    application: "Sovereign Command · Stage-1 k8s-read",
    client: `${cluster} · existing kubectl`,
    severity,
    incidentDate: date,
    startIst: formatIst(startIso),
    endIst: attention > 0 || offline ? "—" : time,
    duration: offline ? "Ongoing while this host is off-VPN" : age === "offline" ? "—" : `Snapshot age ${age}`,
    reportedBy: "Command Center live inventory",
    resolvedBy: attention > 0 || offline ? "—" : "No remediation required",
    status,
    description: rootCause,
    affectedServices: offline
      ? "Live cluster snapshot, Policy meters, Command Centre inventory"
      : `Namespace ${ns} · ${problem.length || 0} attention pod(s)`,
    affectedUsers: "Platform SRE / Finspot-dev operators (read-only)",
    impact: offline
      ? [
          "Live node/namespace/pod meters stay at zero on this host",
          "No seed clients are shown",
          "Remediator remains held",
          "No data loss — inventory is read-only",
        ]
      : attention > 0
        ? [
            `${notReady} not-ready / ${crash} CrashLoop pods`,
            `${warnings.length} warning events in the snapshot window`,
            "No autonomous remediation",
            "No secret or ConfigMap reads",
          ]
        : ["No user-facing outage from this snapshot", "Estate score healthy", "Remediator held"],
    impactDuration: offline ? "Until a Stage-1 API on the Finspot VPN path is used" : `Current poll ${age}`,
    detectionHow: "Stage-1 GET /cluster/snapshot (kubectl get nodes/namespaces/pods/events)",
    detectionTime: time,
    monitoringAlert: offline ? "source=unavailable" : `${notReady} not-ready · ${crash} crashloop`,
    autoDetected: true,
    monitoringGap: offline
      ? "Public ingress has no Finspot API reachability probe."
      : "No Prometheus/Grafana on this slice — kubectl snapshot only.",
    timeline: [
      { time: formatIst(generatedAt), event: live ? "Live snapshot received" : "Snapshot unavailable", owner: "Stage-1" },
      {
        time: formatIst(generatedAt),
        event: live ? `${snapshot.counts.nodes} nodes · ${snapshot.counts.namespaces} namespaces · ${snapshot.counts.pods} pods` : "No seed fallback applied",
        owner: "k8s-read",
      },
      {
        time: formatIst(generatedAt),
        event: attention > 0 ? `${attention} attention pods classified` : "No attention pods",
        owner: "Inventory",
      },
      { time: formatIst(generatedAt), event: "Remediator held — RCA is read-only", owner: "Policy" },
    ],
    nodeOutput,
    nodeFinding: live
      ? snapshot.nodes.every((n) => n.status === "Ready")
        ? "All nodes Ready"
        : "One or more nodes not Ready"
      : "Issue identified — no live nodes",
    podOutput,
    podFinding: live
      ? attention > 0
        ? `${problem.length} attention pod(s)`
        : "No attention pods"
      : "Offline",
    eventOutput,
    logOutput,
    svcFinding: "Service mesh not in this snapshot. Inventory is nodes / namespaces / pods / warning events only.",
    ingressFinding:
      "This RCA does not rewrite cluster Ingress. Production Command Center ingress remains sovereign.wecrew.in.",
    database: "None in Stage-1 slice (no PostgreSQL dependency for inventory).",
    dbConnectivity: "Not applicable",
    networkFinding: offline
      ? "UI host cannot route to Finspot-dev API 172.16.0.71:6443. Local VPN path works."
      : "kubectl context finspot-dev answered list/get.",
    rootCause,
    contributing: offline
      ? [
          "Public cluster isolated from customer kube API by design",
          "Earlier UI hid the gap by loading seed tenants",
          "No synthetic probe for snapshot.source === live-k8s on the public host",
        ]
      : [
          "Read-only MCP verbs only",
          "Remediator hold prevents auto-restart",
          attention > 0 ? "Workload ready probes failing" : "No contributing failure",
        ],
    fiveWhys,
    finalRootCause: fiveWhys[4]?.answer ?? rootCause,
    immediateFix: offline
      ? "Use the Command Center against a Stage-1 API that already has the Finspot-dev kubectl context. Do not copy that kubeconfig onto public wecrew-prod."
      : "No write performed. Operators may inspect the named attention pods outside this console.",
    resolutionCommands: offline
      ? `# From a host on the Finspot VPN with the existing context
kubectl --context finspot-dev get nodes,ns,pods -A
curl -sS "$STAGE1/cluster/snapshot?tenantId=finspot-dev"`
      : `# Read-only verification (already used by Stage-1)
kubectl --context ${snapshot?.context || "finspot-dev"} get nodes -o wide
kubectl --context ${snapshot?.context || "finspot-dev"} get pods -A --field-selector=status.phase!=Running`,
    k8sChecks: [
      { label: "Nodes Ready", ok: live && (snapshot?.nodes.every((n) => n.status === "Ready") ?? false) },
      { label: "Pods inventoried", ok: live },
      { label: "No CrashLoopBackOff", ok: live && crash === 0 },
      { label: "Read-only snapshot", ok: true },
      { label: "Remediator held", ok: true },
    ],
    appChecks: [
      { label: "Command Center UI reachable", ok: true },
      { label: "Live snapshot on this host", ok: live },
      { label: "Seed tenants removed", ok: true },
    ],
    dbChecks: [{ label: "Database not in this slice", ok: true }],
    netChecks: [
      { label: "kubectl context answers", ok: live },
      { label: "No Finspot kubeconfig on public prod", ok: true },
    ],
    monChecks: [
      { label: "15s cluster snapshot poll", ok: true },
      { label: "source=live-k8s on this host", ok: live },
    ],
    corrective: [
      {
        action: offline
          ? "Keep Finspot kubeconfig off public wecrew-prod"
          : "Watch attention pods; do not auto-restart",
        priority: "P0",
        owner: "Platform SRE",
        due: date,
        status: "Completed",
      },
      {
        action: "Alert when snapshot.source != live-k8s for more than two polls",
        priority: "P1",
        owner: "Observability",
        due: "—",
        status: "Open",
      },
    ],
    preventive: [
      "Fail closed when the live kubectl context is missing — never load seed estates.",
      "Keep remediator held without dual control.",
      "Pin Command Center images in Harbor and smoke /login /command /policies /rca after rollout.",
    ],
    newMonitoring: [
      "snapshot.source != live-k8s",
      "notReady > 0",
      "crashLoop > 0",
      "Warning event burst",
    ],
    wentWell: [
      "Remediator stayed held",
      "No secret or ConfigMap reads",
      "Seed Nordic/Helios clients are not shown",
    ],
    wentPoorly: offline
      ? ["Public host cannot see Finspot-dev", "Operators may assume seed data is the estate"]
      : ["No Grafana/Loki on this slice", "RCA is snapshot-scoped, not a full MELT trace"],
    improve: [
      "Surface snapshot.source in the top bar",
      "Page the RCA from attention-pod rows",
      "Add a VPN-side Stage-1 replica if public operators need live meters",
    ],
    evidence: live
      ? [
          `snapshot ${generatedAt}`,
          `${snapshot.counts.nodes} nodes`,
          `${snapshot.counts.namespaces} namespaces`,
          `${snapshot.counts.pods} pods`,
          `${warnings.length} warning events`,
        ]
      : ["No live snapshot on this host", "source=unavailable"],
    conclusionCause: rootCause,
    conclusionResolution: offline
      ? "Left remediator held and refused seed fallback."
      : "Sealed a read-only RCA from the existing kubectl snapshot.",
    conclusionPrevent: "Treat missing live-k8s source as an incident, not a reason to load demo tenants.",
    preparedBy: "Sovereign Command · verification (read-only)",
    reviewedBy: "—",
    approvedBy: "—",
    rcaDate: date,
    incidentStatus: status.toUpperCase(),
    attention,
    namespaces: live ? snapshot.counts.namespaces : 0,
    nodes: live ? snapshot.counts.nodes : 0,
    summaryFields: [],
  };

  report.summaryFields = [
    { label: "Incident Title", value: report.title },
    { label: "Incident ID", value: report.incidentId },
    { label: "Environment", value: report.environment },
    { label: "Application / Service", value: report.application },
    { label: "Client / Project", value: report.client },
    { label: "Severity", value: report.severity },
    { label: "Incident Date", value: report.incidentDate },
    { label: "Incident Start Time", value: `${report.startIst} IST` },
    { label: "Incident End Time", value: report.endIst === "—" ? "—" : `${report.endIst} IST` },
    { label: "Total Duration", value: report.duration },
    { label: "Reported By", value: report.reportedBy },
    { label: "Resolved By", value: report.resolvedBy },
    { label: "Current Status", value: report.status },
  ];

  return report;
}
