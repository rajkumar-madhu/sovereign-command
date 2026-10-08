import type { ClusterSnapshot } from "@/lib/stage1-client";
import { isLiveCluster, LIVE_CLUSTER_TENANT_ID, snapshotAgeLabel } from "@/lib/live-ops";

export type LogHealth = "Healthy" | "Degraded" | "Critical" | "Monitoring";
export type LogSeverity = "P0" | "P1" | "P2" | "P3";
export type LayerTone = "healthy" | "watch" | "critical" | "na";
export type ParsedLogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "FATAL" | "UNKNOWN";

export type ParsedLogLine = {
  id: string;
  raw: string;
  timestamp?: string;
  level: ParsedLogLevel;
  logger?: string;
  pipeline?: string;
  message: string;
};

export type ContainerLogDump = {
  source: "live-k8s" | "unavailable";
  remediator: "held";
  readOnly: true;
  cluster: string;
  context: string;
  generatedAt: string;
  tenantId: string;
  namespace: string;
  pod: string;
  container?: string;
  tailLines: number;
  text: string;
  error?: string;
};

export type LogSourceCandidate = {
  namespace: string;
  name: string;
  kind: "logstash" | "filebeat" | "elasticsearch" | "attention" | "pod";
  restarts: number;
};

export type ProductLogLine = {
  id: string;
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO";
  component: string;
  namespace: string;
  object: string;
  message: string;
};

export type ProductLogAnalysis = {
  live: boolean;
  cluster: string;
  snapshotAge: string;
  product: string;
  module: string;
  environment: string;
  client: string;
  analysisDate: string;
  window: string;
  preparedBy: string;
  overall: LogHealth;
  severity: LogSeverity;
  executive: string;
  affectedUsers: string;
  affectedFunctions: string[];
  symptoms: string[];
  businessLevel: string;
  failedRequests: number;
  delayedRequests: number;
  sources: Array<{ source: string; component: string; location: string; status: string }>;
  requestFlow: string;
  affectedFlow: string;
  from: string;
  to: string;
  scope: Array<{ label: string; included: boolean }>;
  levels: Array<{ level: string; count: number; pct: string }>;
  totalLogs: number;
  totalErrors: number;
  errorPct: string;
  warnPct: string;
  categories: Array<{ category: string; count: number; severity: string; component: string }>;
  topErrors: Array<{
    message: string;
    component: string;
    count: number;
    first: string;
    last: string;
    endpoint: string;
    tenant: string;
    impact: string;
    cause: string;
  }>;
  http: Array<{ code: string; meaning: string; count: number; endpoint: string }>;
  apis: Array<{
    endpoint: string;
    requests: number;
    success: number;
    failed: number;
    avg: string;
    p95: string;
    p99: string;
  }>;
  latency: { p50: string; p95: string; p99: string; max: string; notes: string[] };
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  podOutput: string;
  restartOutput: string;
  eventOutput: string;
  resources: Array<{ component: string; cpu: string; memory: string; limit: string; status: string }>;
  ingress: string;
  network: string;
  cache: string;
  queue: string;
  deps: Array<{ name: string; status: string; latency: string; errors: string }>;
  correlation: string;
  timeline: Array<{ time: string; component: string; event: string; impact: string }>;
  rootCause: string;
  contributing: string[];
  appEvidence: string;
  dbEvidence: string;
  monEvidence: string;
  resolution: string;
  corrective: Array<{ action: string; owner: string; priority: string; due: string; status: string }>;
  preventive: string[];
  logQuality: string[];
  sampleJson: string;
  scorecard: Array<{ layer: string; tone: LayerTone; observation: string }>;
  critical: string[];
  major: string[];
  minor: string[];
  conclusion: {
    status: LogHealth;
    issue: string;
    rootCause: string;
    resolution: string;
    risk: string;
    next: string;
  };
  evidence: string[];
  lines: ProductLogLine[];
  attention: number;
  namespaces: number;
  nodes: number;
  streamSource: string;
  pipelines: string[];
};

function normalizeLevel(value: string): ParsedLogLevel {
  const u = value.trim().toUpperCase();
  if (u === "ERROR" || u === "ERR") return "ERROR";
  if (u === "WARN" || u === "WARNING") return "WARN";
  if (u === "INFO") return "INFO";
  if (u === "DEBUG" || u === "TRACE") return "DEBUG";
  if (u === "FATAL") return "FATAL";
  return "UNKNOWN";
}

function looksLikePipeline(value: string): boolean {
  return /filebeat|pipeline|noren|appsentinel/i.test(value) && !value.includes(".");
}

export function parseLogstashDump(text: string): ParsedLogLine[] {
  if (!text.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((raw, index) => {
      const match = raw.match(
        /^\[(\d{4}-\d{2}-\d{2}T[\d:,]+)\]\[(\w+)\s*\](?:\[([^\]]+)\])?(?:\[([^\]]+)\])?\s*(.*)$/,
      );
      if (match) {
        const first = match[3]?.trim();
        const second = match[4]?.trim();
        let logger = first;
        let pipeline: string | undefined;
        if (second) {
          logger = first;
          pipeline = second;
        } else if (first && looksLikePipeline(first)) {
          logger = undefined;
          pipeline = first;
        }
        return {
          id: `ls-${index}`,
          raw,
          timestamp: match[1],
          level: normalizeLevel(match[2] ?? ""),
          ...(logger ? { logger } : {}),
          ...(pipeline ? { pipeline } : {}),
          message: match[5] ?? "",
        };
      }
      const level: ParsedLogLevel = /error|fatal/i.test(raw)
        ? "ERROR"
        : /warning|warn/i.test(raw)
          ? "WARN"
          : raw.trim()
            ? "INFO"
            : "UNKNOWN";
      return { id: `ls-${index}`, raw, level, message: raw };
    })
    .filter((line) => line.raw.length > 0);
}

export function filterParsedLines(
  lines: ParsedLogLine[],
  opts: { level?: ParsedLogLevel | "ALL"; pipeline?: string; query?: string },
): ParsedLogLine[] {
  const query = opts.query?.trim().toLowerCase();
  return lines.filter((line) => {
    if (opts.level && opts.level !== "ALL" && line.level !== opts.level) return false;
    if (opts.pipeline && line.pipeline !== opts.pipeline) return false;
    if (query && !line.raw.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function pipelinesFromLines(lines: ParsedLogLine[]): string[] {
  return [...new Set(lines.map((line) => line.pipeline).filter((value): value is string => Boolean(value)))].sort();
}

export function logSourceCandidates(snapshot: ClusterSnapshot | null): LogSourceCandidate[] {
  if (!isLiveCluster(snapshot)) return [];
  const ranked = snapshot.pods.map((pod) => {
    const key = `${pod.namespace}/${pod.name}`.toLowerCase();
    const kind: LogSourceCandidate["kind"] = /logstash|analytics-ls/.test(key)
      ? "logstash"
      : /filebeat|analytics-fb/.test(key)
        ? "filebeat"
        : /elastic|analytics-es/.test(key)
          ? "elasticsearch"
          : pod.crashLoop || (pod.phase !== "Running" && pod.phase !== "Succeeded")
            ? "attention"
            : "pod";
    return {
      namespace: pod.namespace,
      name: pod.name,
      kind,
      restarts: pod.restarts,
    };
  });
  const preferred = ranked.filter((row) => row.kind !== "pod");
  const pool = preferred.length ? preferred : ranked.slice(0, 8);
  return pool.sort((a, b) => {
    const order = { logstash: 0, filebeat: 1, elasticsearch: 2, attention: 3, pod: 4 };
    return order[a.kind] - order[b.kind] || a.name.localeCompare(b.name);
  });
}

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

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function buildProductLogAnalysis(
  snapshot: ClusterSnapshot | null,
  nowMs = 0,
  dump?: ContainerLogDump | null,
): ProductLogAnalysis {
  const live = isLiveCluster(snapshot);
  const cluster = snapshot?.cluster || LIVE_CLUSTER_TENANT_ID;
  const generatedAt = snapshot?.generatedAt;
  const age = snapshotAgeLabel(generatedAt, nowMs);
  const attention = live ? snapshot.counts.notReady + snapshot.counts.crashLoop : 0;
  const crash = live ? snapshot.counts.crashLoop : 0;
  const notReady = live ? snapshot.counts.notReady : 0;
  const warnings = live ? snapshot.warningEvents : [];
  const problem = live
    ? snapshot.pods.filter(
        (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
      )
    : [];

  const lines: ProductLogLine[] = live
    ? [
        ...warnings.map((e, i) => ({
          id: `evt-${i}-${e.object}`,
          timestamp: e.lastTimestamp || generatedAt || "",
          level: "WARN" as const,
          component: "kubernetes",
          namespace: e.namespace,
          object: e.object,
          message: `${e.reason}: ${e.message}`,
        })),
        ...problem.map((p) => ({
          id: `pod-${p.namespace}-${p.name}`,
          timestamp: generatedAt || "",
          level: "ERROR" as const,
          component: "pod",
          namespace: p.namespace,
          object: p.name,
          message: `${p.crashLoop ? "CrashLoopBackOff" : p.phase} ready=${p.ready} restarts=${p.restarts} reason=${p.reason ?? "-"}`,
        })),
        {
          id: "snap",
          timestamp: generatedAt || "",
          level: "INFO",
          component: "stage1",
          namespace: "-",
          object: "cluster/snapshot",
          message: `source=live-k8s cluster=${cluster} nodes=${snapshot.counts.nodes} ns=${snapshot.counts.namespaces} pods=${snapshot.counts.pods}`,
        },
      ]
    : [
        {
          id: "offline",
          timestamp: new Date().toISOString(),
          level: "ERROR",
          component: "stage1",
          namespace: "-",
          object: "cluster/snapshot",
          message: "source=unavailable — this host cannot reach Finspot-dev 172.16.0.71:6443",
        },
      ];

  const stream = dump?.source === "live-k8s" && dump.text.trim() ? parseLogstashDump(dump.text) : [];
  const pipelines = pipelinesFromLines(stream);
  const streamSource = dump?.pod ? `${dump.namespace}/${dump.pod}` : "";
  const errors = stream.length
    ? stream.filter((l) => l.level === "ERROR").length
    : lines.filter((l) => l.level === "ERROR").length;
  const warns = stream.length
    ? stream.filter((l) => l.level === "WARN").length
    : lines.filter((l) => l.level === "WARN").length;
  const infos = stream.length
    ? stream.filter((l) => l.level === "INFO").length
    : lines.filter((l) => l.level === "INFO").length;
  const debugs = stream.filter((l) => l.level === "DEBUG").length;
  const fatals = stream.filter((l) => l.level === "FATAL").length;
  const total = stream.length || lines.length;
  const overall: LogHealth = !live
    ? "Monitoring"
    : crash > 0
      ? "Degraded"
      : notReady > 0
        ? "Degraded"
        : "Healthy";
  const severity: LogSeverity = !live ? "P2" : crash > 0 ? "P1" : notReady > 0 ? "P2" : "P3";

  const topFromWarnings = warnings.slice(0, 4).map((e) => ({
    message: `${e.reason}: ${e.message}`,
    component: "Kubernetes",
    count: 1,
    first: formatIst(e.lastTimestamp || generatedAt),
    last: formatIst(e.lastTimestamp || generatedAt),
    endpoint: "k8s-read events",
    tenant: `${cluster} / ${e.namespace}`,
    impact: "Warning event on live inventory",
    cause: e.reason,
  }));
  const topFromPods = problem.slice(0, 3).map((p) => ({
    message: `${p.name} ${p.crashLoop ? "CrashLoopBackOff" : p.phase} ready=${p.ready}`,
    component: "Pod",
    count: Math.max(1, p.restarts),
    first: formatIst(generatedAt),
    last: formatIst(generatedAt),
    endpoint: `pod/${p.namespace}/${p.name}`,
    tenant: `${cluster} / ${p.namespace}`,
    impact: "Attention workload",
    cause: p.reason ?? p.phase,
  }));

  const podOutput = live
    ? [
        "NAMESPACE  NAME  READY  STATUS  RESTARTS",
        ...snapshot.pods.slice(0, 12).map(
          (p) =>
            `${p.namespace}  ${p.name}  ${p.ready}  ${p.crashLoop ? "CrashLoopBackOff" : p.phase}  ${p.restarts}`,
        ),
      ].join("\n")
    : "No live pod inventory.";

  const restartOutput = live
    ? [
        "NAMESPACE  POD  RESTARTS",
        ...[...snapshot.pods]
          .sort((a, b) => b.restarts - a.restarts)
          .slice(0, 10)
          .map((p) => `${p.namespace}  ${p.name}  ${p.restarts}`),
      ].join("\n")
    : "Restart counts unavailable.";

  const eventOutput = live
    ? warnings.length
      ? warnings
          .slice(0, 12)
          .map((e) => `${e.lastTimestamp ?? generatedAt}  ${e.namespace}  ${e.reason}  ${e.object}\n  ${e.message}`)
          .join("\n")
      : "No Warning events in the current snapshot."
    : "Events unavailable.";

  const executive = !live
    ? "During the analysis window the Command Center UI was up, but Stage-1 inventory returned source=unavailable. This host cannot open the existing Finspot-dev kubectl API. Seed application/postgres logs were not substituted."
    : attention > 0
      ? `During the analysis window ${cluster} reported ${notReady} not-ready and ${crash} CrashLoop pods, plus ${warnings.length} Kubernetes Warning events. The frontend stayed available. Remediator remains held.`
      : `During the analysis window ${cluster} inventory was healthy: ${snapshot?.counts.pods ?? 0} pods, ${warnings.length} warnings, 0 CrashLoop. No data plane write occurred.`;

  return {
    live,
    cluster,
    snapshotAge: age,
    product: "Wecrew Ops · Sovereign Command",
    module: "Frontend + Stage-1 k8s-read",
    environment: "Production / Finspot-dev VPN",
    client: `${cluster} · existing kubectl`,
    analysisDate: formatIst(generatedAt || new Date().toISOString()).slice(0, 11),
    window: `${formatIst(generatedAt)} – ${age === "offline" ? "—" : `now (${age} old)`}`,
    preparedBy: "Sovereign Command · log analysis (read-only)",
    overall,
    severity,
    executive,
    affectedUsers: "Platform SRE / Finspot-dev operators",
    affectedFunctions: live
      ? ["Dashboard inventory", "Policy live meters", "RCA package", "Namespace health"]
      : ["Live inventory", "Policy meters", "RCA evidence"],
    symptoms: live
      ? attention > 0
        ? ["Attention pods", "Kubernetes Warning events", "No HTTP 5xx from this slice"]
        : ["No user-facing outage", "Snapshot poll healthy"]
      : ["Live meters at zero on this host", "source=unavailable"],
    businessLevel: live ? (attention > 0 ? "Medium" : "Low") : "Medium",
    failedRequests: errors,
    delayedRequests: warns,
    sources: [
      { source: "Frontend logs", component: "Web UI", location: "Browser / Command Center", status: "Reviewed" },
      { source: "Stage-1 API", component: "cluster/snapshot", location: "Existing kubectl", status: live ? "Reviewed" : "Unavailable" },
      {
        source: "Logstash / container logs",
        component: streamSource || "kubectl logs",
        location: dump?.cluster || cluster,
        status: stream.length ? "Reviewed" : "Unavailable",
      },
      { source: "Kubernetes events", component: "Warning", location: cluster, status: live ? "Reviewed" : "Unavailable" },
      { source: "Pod inventory", component: "Pods", location: cluster, status: live ? "Reviewed" : "Unavailable" },
      { source: "Ingress logs", component: "NGINX", location: "wecrew-prod", status: "Not in snapshot" },
      { source: "Authentication logs", component: "Demo login", location: "Command Center", status: "Not in snapshot" },
      { source: "Database logs", component: "PostgreSQL", location: "—", status: "Not in this slice" },
      { source: "Redis / MQ", component: "Cache / bus", location: "—", status: "Not in this slice" },
    ],
    requestFlow: `Operator
  ↓
Browser (sovereign.wecrew.in / localhost)
  ↓
Command Center SSR
  ↓
GET /cluster/snapshot?tenantId=${cluster}
  ↓
Stage-1 (kubectl --context finspot-dev)
  ↓
API 172.16.0.71:6443
  ↓
nodes / namespaces / pods / warning events`,
    affectedFlow: `Inventory poll
    ↓
Stage-1 k8s-read
    ↓
kubectl get/list
    ↓
${live ? "source=live-k8s" : "source=unavailable"}
    ↓
UI meters / this report`,
    from: formatIst(generatedAt),
    to: age === "offline" ? "—" : `snapshot age ${age}`,
    scope: [
      { label: "Frontend", included: true },
      { label: "Backend (Stage-1)", included: true },
      { label: "Authentication", included: false },
      { label: "Database", included: false },
      { label: "Cache", included: false },
      { label: "Message queue", included: false },
      { label: "Ingress", included: false },
      { label: "Kubernetes", included: live },
      { label: "Third-party APIs", included: false },
      { label: "Scheduled jobs", included: false },
      { label: "CI/CD", included: false },
    ],
    levels: [
      { level: "TRACE", count: 0, pct: "0%" },
      { level: "DEBUG", count: debugs, pct: pct(debugs, total) },
      { level: "INFO", count: infos, pct: pct(infos, total) },
      { level: "WARN", count: warns, pct: pct(warns, total) },
      { level: "ERROR", count: errors, pct: pct(errors, total) },
      { level: "FATAL", count: fatals, pct: pct(fatals, total) },
    ],
    totalLogs: total,
    totalErrors: errors,
    errorPct: pct(errors, total),
    warnPct: pct(warns, total),
    categories: [
      { category: "Application Error", count: live ? 0 : 1, severity: live ? "—" : "P2", component: "Stage-1" },
      { category: "Database Error", count: 0, severity: "—", component: "n/a" },
      { category: "Timeout", count: live ? 0 : 1, severity: live ? "—" : "P2", component: "kubectl API" },
      { category: "Authentication Error", count: 0, severity: "—", component: "n/a" },
      { category: "HTTP 5xx", count: 0, severity: "—", component: "not in slice" },
      { category: "Network Error", count: live ? 0 : 1, severity: live ? "—" : "P2", component: "VPN path" },
      { category: "Dependency Error", count: attention, severity: attention ? "P2" : "—", component: "Pods" },
    ],
    topErrors:
      topFromPods.length || topFromWarnings.length
        ? [...topFromPods, ...topFromWarnings].slice(0, 5)
        : [
            {
              message: live
                ? "No ERROR-class attention pods in this snapshot"
                : "cluster/snapshot source=unavailable",
              component: live ? "Inventory" : "Stage-1",
              count: 1,
              first: formatIst(generatedAt),
              last: formatIst(generatedAt),
              endpoint: "/cluster/snapshot",
              tenant: cluster,
              impact: live ? "None" : "Live meters offline on this host",
              cause: live ? "Healthy snapshot" : "No route to Finspot-dev API",
            },
          ],
    http: [
      ["400", "Bad Request"],
      ["401", "Unauthorized"],
      ["403", "Forbidden"],
      ["404", "Not Found"],
      ["408", "Timeout"],
      ["429", "Too Many Requests"],
      ["500", "Internal Server Error"],
      ["502", "Bad Gateway"],
      ["503", "Service Unavailable"],
      ["504", "Gateway Timeout"],
    ].map(([code, meaning]) => ({
      code,
      meaning,
      count: 0,
      endpoint: "not in k8s inventory slice",
    })),
    apis: [
      {
        endpoint: "/cluster/snapshot",
        requests: live ? 1 : 0,
        success: live ? 1 : 0,
        failed: live ? 0 : 1,
        avg: age,
        p95: age,
        p99: age,
      },
      {
        endpoint: "k8s-read get/list",
        requests: live ? snapshot.counts.nodes + snapshot.counts.pods : 0,
        success: live ? snapshot.counts.pods : 0,
        failed: attention,
        avg: "—",
        p95: "—",
        p99: "—",
      },
    ],
    latency: {
      p50: age,
      p95: age,
      p99: age,
      max: age,
      notes: [
        "Latency here is snapshot age, not HTTP gateway p95.",
        "No Prometheus series on this slice.",
      ],
    },
    frontend: "Command Center SSR/login is independent of the Finspot API. No JS exception stream is collected here.",
    backend: live
      ? `Stage-1 returned source=live-k8s for ${cluster}. Remediator=held readOnly=true.`
      : "Stage-1 snapshot is unavailable on this host. Fail-closed: no seed postgres/application logs.",
    database: "PostgreSQL is not part of the Stage-1 inventory slice. Prior demo FK logs are removed.",
    auth: "Demo session chrome only. No Keycloak/SSO logs in this snapshot.",
    podOutput,
    restartOutput,
    eventOutput,
    resources: [
      { component: "Command Center", cpu: "10m req", memory: "128Mi req", limit: "500m / 512Mi", status: "Pinned" },
      { component: "Stage-1", cpu: "—", memory: "—", limit: "host process", status: live ? "Answering" : "Unreachable" },
      { component: "Finspot nodes", cpu: "—", memory: "—", limit: "cluster", status: live ? `${snapshot.counts.nodes} Ready` : "Unknown" },
    ],
    ingress:
      "Production ingress remains sovereign.wecrew.in / sovereign.api.wecrew.in. This report does not rewrite Ingress. No 502/504 counts in the kubectl snapshot.",
    network: live
      ? "kubectl context finspot-dev answered get/list."
      : "This UI host cannot route to 172.16.0.71:6443. Local VPN path works.",
    cache: "Redis is not in this slice.",
    queue: "No RabbitMQ/Kafka in this slice.",
    deps: [
      { name: "Finspot-dev API", status: live ? "Up" : "Unreachable", latency: age, errors: live ? String(attention) : "1" },
      { name: "Harbor image", status: "Pinned", latency: "—", errors: "0" },
      { name: "Secret/ConfigMap read", status: "Denied", latency: "—", errors: "0" },
    ],
    correlation: `tenant=${cluster}
source=${live ? "live-k8s" : "unavailable"}
remediator=held
request=/cluster/snapshot?tenantId=${cluster}
trace=inventory-poll`,
    timeline: [
      { time: formatIst(generatedAt), component: "Stage-1", event: live ? "Snapshot received" : "Snapshot unavailable", impact: live ? "Minor" : "High" },
      {
        time: formatIst(generatedAt),
        component: "Kubernetes",
        event: live ? `${snapshot.counts.pods} pods · ${warnings.length} warnings` : "No events",
        impact: attention > 0 ? "High" : "Low",
      },
      { time: formatIst(generatedAt), component: "Policy", event: "Remediator held", impact: "None" },
    ],
    rootCause: !live
      ? "The analysis host cannot reach the existing Finspot-dev API, so Kubernetes logs/events never arrive. Seed application logs are not used as a substitute."
      : attention > 0
        ? `${attention} attention pod(s) and ${warnings.length} Warning events on ${cluster}. No HTTP 5xx corpus exists in this read-only inventory.`
        : `No ERROR-class attention pods. Warning count is ${warnings.length}.`,
    contributing: live
      ? ["Read-only MCP verbs", "No Loki/ELK on this slice", "Snapshot is 15s poll, not a continuous tail"]
      : ["Public cluster isolated from customer kube API", "No seed fallback", "No reachability probe on ingress"],
    appEvidence: stream.length
      ? stream
          .slice(0, 12)
          .map((l) => l.raw)
          .join("\n")
      : lines
          .slice(0, 6)
          .map((l) => `${l.timestamp} ${l.level} ${l.component} ${l.message}`)
          .join("\n"),
    dbEvidence: "n/a — database logs are outside Stage-1.",
    monEvidence: live
      ? `nodes=${snapshot.counts.nodes} namespaces=${snapshot.counts.namespaces} pods=${snapshot.counts.pods} crashLoop=${crash} notReady=${notReady} warnings=${warnings.length}`
      : "source=unavailable",
    resolution: live
      ? "No write performed. Operators may inspect named attention pods outside this console."
      : "Keep Finspot kubeconfig off public wecrew-prod. Analyze from a VPN-side Stage-1.",
    corrective: [
      {
        action: live ? "Watch attention pods; remediator stays held" : "Do not copy Finspot kubeconfig to public prod",
        owner: "Platform SRE",
        priority: "P0",
        due: formatIst(generatedAt).slice(0, 11),
        status: "Completed",
      },
      {
        action: "Alert when snapshot.source != live-k8s",
        owner: "Observability",
        priority: "P1",
        due: "—",
        status: "Open",
      },
    ],
    preventive: [
      "Structured JSON on Stage-1 snapshot polls",
      "Fail closed when live-k8s is missing",
      "Request IDs on /cluster/snapshot",
      "Warning-event burst alert",
    ],
    logQuality: [
      "timestamp",
      "log_level",
      "service",
      "environment",
      "tenant_id",
      "namespace",
      "object",
      "reason",
      "message",
      "cluster",
      "source",
    ],
    sampleJson: JSON.stringify(
      {
        timestamp: generatedAt || new Date().toISOString(),
        level: errors ? "ERROR" : warns ? "WARN" : "INFO",
        service: "stage1-k8s-read",
        environment: "production",
        tenant_id: cluster,
        endpoint: "/cluster/snapshot",
        status_code: live ? 200 : 0,
        error_code: live ? (attention ? "ATTENTION_PODS" : "") : "SNAPSHOT_UNAVAILABLE",
        cluster,
        remediator: "held",
      },
      null,
      2,
    ),
    scorecard: [
      { layer: "Frontend", tone: "healthy", observation: "Command Center UI independent of kube API" },
      { layer: "Backend", tone: live ? "healthy" : "watch", observation: live ? "Stage-1 answering" : "Snapshot unavailable" },
      { layer: "API", tone: live ? "healthy" : "watch", observation: "/cluster/snapshot" },
      { layer: "Authentication", tone: "na", observation: "Demo chrome only" },
      { layer: "Database", tone: "na", observation: "Not in slice" },
      { layer: "Redis", tone: "na", observation: "Not in slice" },
      { layer: "RabbitMQ", tone: "na", observation: "Not in slice" },
      { layer: "Kubernetes", tone: !live ? "watch" : attention ? "watch" : "healthy", observation: live ? `${attention} attention` : "Unreachable" },
      { layer: "Network", tone: live ? "healthy" : "critical", observation: live ? "kubectl path up" : "No route to 172.16.0.71" },
      { layer: "External Services", tone: "na", observation: "No third-party inference" },
    ],
    critical: live
      ? crash > 0
        ? [`${crash} CrashLoopBackOff pod(s)`]
        : ["None"]
      : ["Live inventory unreachable from this host"],
    major: live
      ? notReady > 0
        ? [`${notReady} not-ready pod(s)`, `${warnings.length} Warning events`]
        : warnings.length
          ? [`${warnings.length} Warning events`]
          : ["None"]
      : ["Seed logs must stay removed"],
    minor: ["No HTTP status corpus in kubectl snapshot", "No Loki/ELK on this slice"],
    conclusion: {
      status: overall,
      issue: !live ? "Missing live-k8s snapshot" : attention ? "Attention workloads" : "No product outage in window",
      rootCause: !live
        ? "This host cannot reach Finspot-dev"
        : attention
          ? "Not-ready / CrashLoop pods on the live cluster"
          : "Healthy inventory",
      resolution: live ? "Read-only seal; remediator held" : "Fail closed; no seed logs",
      risk: "Operators may expect HTTP/DB logs that this slice does not collect",
      next: "Open RCA package for the same snapshot window",
    },
    evidence: live
      ? [
          `snapshot ${generatedAt}`,
          `${snapshot.counts.pods} pods`,
          `${warnings.length} warnings`,
          `${attention} attention`,
        ]
      : ["source=unavailable"],
    lines,
    attention,
    namespaces: live ? snapshot.counts.namespaces : 0,
    nodes: live ? snapshot.counts.nodes : 0,
    streamSource,
    pipelines,
  };
}
