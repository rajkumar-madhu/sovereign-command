import type { ClusterSnapshot } from "@/lib/stage1-client";
import { isLiveCluster, liveEstateScore, LIVE_CLUSTER_TENANT_ID } from "@/lib/live-ops";

export type MetricCategory =
  | "Application"
  | "API"
  | "Kubernetes"
  | "Database"
  | "Redis"
  | "RabbitMQ"
  | "Network";

export type MetricId =
  | "k8s.pods"
  | "k8s.ready"
  | "k8s.not_ready"
  | "k8s.crashloop"
  | "k8s.restarts"
  | "k8s.pending"
  | "k8s.nodes"
  | "k8s.namespaces"
  | "k8s.warnings"
  | "k8s.estate"
  | "app.request_rate"
  | "app.error_rate"
  | "app.latency_p95"
  | "app.exceptions"
  | "app.sessions"
  | "api.rps"
  | "api.http_2xx"
  | "api.http_4xx"
  | "api.http_5xx"
  | "api.p50"
  | "api.p95"
  | "api.p99"
  | "api.timeout"
  | "db.connections"
  | "db.query_latency"
  | "db.slow_queries"
  | "db.locks"
  | "redis.memory"
  | "redis.hit_rate"
  | "mq.depth"
  | "mq.publish"
  | "net.bandwidth"
  | "net.packet_loss";

export type MetricDef = {
  id: MetricId;
  label: string;
  category: MetricCategory;
  unit: string;
  live: boolean;
  color: string;
};

export type MetricSample = {
  ts: number;
  t: string;
  generatedAt: string;
  pods: number;
  ready: number;
  notReady: number;
  crashLoop: number;
  restarts: number;
  pending: number;
  nodes: number;
  namespaces: number;
  warnings: number;
  estate: number;
};

export type TimePreset = {
  id: string;
  label: string;
  ms: number | null;
};

export const TIME_PRESETS: TimePreset[] = [
  { id: "live", label: "LIVE", ms: null },
  { id: "5m", label: "Last 5 minutes", ms: 5 * 60_000 },
  { id: "15m", label: "Last 15 minutes", ms: 15 * 60_000 },
  { id: "30m", label: "Last 30 minutes", ms: 30 * 60_000 },
  { id: "1h", label: "Last 1 hour", ms: 60 * 60_000 },
  { id: "3h", label: "Last 3 hours", ms: 3 * 60 * 60_000 },
  { id: "6h", label: "Last 6 hours", ms: 6 * 60 * 60_000 },
  { id: "12h", label: "Last 12 hours", ms: 12 * 60 * 60_000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60_000 },
  { id: "3d", label: "Last 3 days", ms: 3 * 24 * 60 * 60_000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60_000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60_000 },
  { id: "90d", label: "Last 90 days", ms: 90 * 24 * 60 * 60_000 },
];

export const REFRESH_OPTIONS = [
  { id: "5s", label: "5 sec", ms: 5_000 },
  { id: "10s", label: "10 sec", ms: 10_000 },
  { id: "15s", label: "15 sec", ms: 15_000 },
  { id: "30s", label: "30 sec", ms: 30_000 },
  { id: "1m", label: "1 min", ms: 60_000 },
  { id: "5m", label: "5 min", ms: 5 * 60_000 },
  { id: "manual", label: "Manual", ms: 0 },
] as const;

export const METRIC_CATALOG: MetricDef[] = [
  { id: "k8s.pods", label: "Pod count", category: "Kubernetes", unit: "pods", live: true, color: "#2b4cff" },
  { id: "k8s.ready", label: "Ready pods", category: "Kubernetes", unit: "pods", live: true, color: "#0f7a55" },
  { id: "k8s.not_ready", label: "Not-ready pods", category: "Kubernetes", unit: "pods", live: true, color: "#ff5b2e" },
  { id: "k8s.crashloop", label: "CrashLoop", category: "Kubernetes", unit: "pods", live: true, color: "#c41e3a" },
  { id: "k8s.restarts", label: "Restarts", category: "Kubernetes", unit: "count", live: true, color: "#d97706" },
  { id: "k8s.pending", label: "Pending pods", category: "Kubernetes", unit: "pods", live: true, color: "#7c3aed" },
  { id: "k8s.nodes", label: "Nodes", category: "Kubernetes", unit: "nodes", live: true, color: "#0e1116" },
  { id: "k8s.namespaces", label: "Namespaces", category: "Kubernetes", unit: "ns", live: true, color: "#2b4cff" },
  { id: "k8s.warnings", label: "Warning events", category: "Kubernetes", unit: "events", live: true, color: "#d97706" },
  { id: "k8s.estate", label: "Estate score", category: "Kubernetes", unit: "%", live: true, color: "#0f7a55" },
  { id: "app.request_rate", label: "Request rate", category: "Application", unit: "/sec", live: false, color: "#94a3b8" },
  { id: "app.error_rate", label: "Error rate", category: "Application", unit: "%", live: false, color: "#94a3b8" },
  { id: "app.latency_p95", label: "Response time", category: "Application", unit: "ms", live: false, color: "#94a3b8" },
  { id: "app.exceptions", label: "Exceptions", category: "Application", unit: "count", live: false, color: "#94a3b8" },
  { id: "app.sessions", label: "Active sessions", category: "Application", unit: "count", live: false, color: "#94a3b8" },
  { id: "api.rps", label: "RPS", category: "API", unit: "/sec", live: false, color: "#94a3b8" },
  { id: "api.http_2xx", label: "HTTP 2xx", category: "API", unit: "count", live: false, color: "#94a3b8" },
  { id: "api.http_4xx", label: "HTTP 4xx", category: "API", unit: "count", live: false, color: "#94a3b8" },
  { id: "api.http_5xx", label: "HTTP 5xx", category: "API", unit: "count", live: false, color: "#94a3b8" },
  { id: "api.p50", label: "P50", category: "API", unit: "ms", live: false, color: "#94a3b8" },
  { id: "api.p95", label: "P95", category: "API", unit: "ms", live: false, color: "#94a3b8" },
  { id: "api.p99", label: "P99", category: "API", unit: "ms", live: false, color: "#94a3b8" },
  { id: "api.timeout", label: "Timeout rate", category: "API", unit: "%", live: false, color: "#94a3b8" },
  { id: "db.connections", label: "Connections", category: "Database", unit: "conn", live: false, color: "#94a3b8" },
  { id: "db.query_latency", label: "Query latency", category: "Database", unit: "ms", live: false, color: "#94a3b8" },
  { id: "db.slow_queries", label: "Slow queries", category: "Database", unit: "count", live: false, color: "#94a3b8" },
  { id: "db.locks", label: "Locks", category: "Database", unit: "count", live: false, color: "#94a3b8" },
  { id: "redis.memory", label: "Memory", category: "Redis", unit: "MB", live: false, color: "#94a3b8" },
  { id: "redis.hit_rate", label: "Hit rate", category: "Redis", unit: "%", live: false, color: "#94a3b8" },
  { id: "mq.depth", label: "Queue depth", category: "RabbitMQ", unit: "msg", live: false, color: "#94a3b8" },
  { id: "mq.publish", label: "Publish rate", category: "RabbitMQ", unit: "/sec", live: false, color: "#94a3b8" },
  { id: "net.bandwidth", label: "Bandwidth", category: "Network", unit: "Mbps", live: false, color: "#94a3b8" },
  { id: "net.packet_loss", label: "Packet loss", category: "Network", unit: "%", live: false, color: "#94a3b8" },
];

const SAMPLE_KEYS: Record<MetricId, keyof MetricSample | null> = {
  "k8s.pods": "pods",
  "k8s.ready": "ready",
  "k8s.not_ready": "notReady",
  "k8s.crashloop": "crashLoop",
  "k8s.restarts": "restarts",
  "k8s.pending": "pending",
  "k8s.nodes": "nodes",
  "k8s.namespaces": "namespaces",
  "k8s.warnings": "warnings",
  "k8s.estate": "estate",
  "app.request_rate": null,
  "app.error_rate": null,
  "app.latency_p95": null,
  "app.exceptions": null,
  "app.sessions": null,
  "api.rps": null,
  "api.http_2xx": null,
  "api.http_4xx": null,
  "api.http_5xx": null,
  "api.p50": null,
  "api.p95": null,
  "api.p99": null,
  "api.timeout": null,
  "db.connections": null,
  "db.query_latency": null,
  "db.slow_queries": null,
  "db.locks": null,
  "redis.memory": null,
  "redis.hit_rate": null,
  "mq.depth": null,
  "mq.publish": null,
  "net.bandwidth": null,
  "net.packet_loss": null,
};

export function metricDef(id: MetricId): MetricDef {
  return METRIC_CATALOG.find((m) => m.id === id) ?? METRIC_CATALOG[0]!;
}

export function sampleValue(sample: MetricSample, id: MetricId): number | null {
  const key = SAMPLE_KEYS[id];
  if (!key) return null;
  return sample[key] as number;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function sampleFromSnapshot(
  snapshot: ClusterSnapshot | null,
  nowMs = 0,
): MetricSample | null {
  if (!isLiveCluster(snapshot)) return null;
  const ts = Date.parse(snapshot.generatedAt);
  if (!Number.isFinite(ts)) return null;
  const pending = snapshot.pods.filter((p) => p.phase === "Pending").length;
  const restarts = snapshot.pods.reduce((sum, p) => sum + p.restarts, 0);
  const ready = snapshot.counts.pods - snapshot.counts.notReady;
  return {
    ts,
    t: formatClock(ts || nowMs),
    generatedAt: snapshot.generatedAt,
    pods: snapshot.counts.pods,
    ready: Math.max(0, ready),
    notReady: snapshot.counts.notReady,
    crashLoop: snapshot.counts.crashLoop,
    restarts,
    pending,
    nodes: snapshot.counts.nodes,
    namespaces: snapshot.counts.namespaces,
    warnings: snapshot.warningEvents.length,
    estate: liveEstateScore(snapshot),
  };
}

export function appendSample(history: MetricSample[], next: MetricSample, cap = 240): MetricSample[] {
  const last = history[history.length - 1];
  if (last && last.generatedAt === next.generatedAt) {
    return history.map((s, i) => (i === history.length - 1 ? next : s));
  }
  return [...history, next].slice(-cap);
}

export function filterSamples(
  history: MetricSample[],
  fromMs: number,
  toMs: number,
): MetricSample[] {
  return history.filter((s) => s.ts >= fromMs && s.ts <= toMs);
}

export function resolutionForRange(rangeMs: number): string {
  if (rangeMs <= 5 * 60_000) return "1 sec";
  if (rangeMs <= 60 * 60_000) return "10 sec";
  if (rangeMs <= 6 * 60 * 60_000) return "1 min";
  if (rangeMs <= 24 * 60 * 60_000) return "5 min";
  if (rangeMs <= 7 * 24 * 60 * 60_000) return "30 min";
  if (rangeMs <= 30 * 24 * 60 * 60_000) return "2 hours";
  return "6 hours";
}

export function clusterLabel(snapshot: ClusterSnapshot | null): string {
  return snapshot?.cluster || LIVE_CLUSTER_TENANT_ID;
}

export type NamespaceHealth = {
  namespace: string;
  pods: number;
  attention: number;
  tone: "healthy" | "watch" | "critical";
};

export function namespaceHealth(snapshot: ClusterSnapshot | null): NamespaceHealth[] {
  if (!isLiveCluster(snapshot)) return [];
  return snapshot.namespaces
    .map((ns) => {
      const pods = snapshot.pods.filter((p) => p.namespace === ns);
      const attention = pods.filter(
        (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
      ).length;
      return {
        namespace: ns,
        pods: pods.length,
        attention,
        tone: (attention === 0 ? "healthy" : attention > 2 || pods.some((p) => p.crashLoop) ? "critical" : "watch") as
          | "healthy"
          | "watch"
          | "critical",
      };
    })
    .sort((a, b) => b.attention - a.attention || b.pods - a.pods);
}

export function liveKpis(sample: MetricSample | null, live: boolean) {
  if (!live || !sample) {
    return [
      { id: "k8s.estate" as MetricId, label: "Availability", value: "—", hint: "offline" },
      { id: "k8s.pods" as MetricId, label: "Pods", value: "0", hint: "inventory" },
      { id: "k8s.not_ready" as MetricId, label: "Not-ready", value: "0", hint: "attention" },
      { id: "k8s.warnings" as MetricId, label: "Warnings", value: "0", hint: "events" },
    ];
  }
  return [
    { id: "k8s.estate" as MetricId, label: "Availability", value: `${sample.estate}%`, hint: "estate score" },
    { id: "k8s.pods" as MetricId, label: "Pods", value: String(sample.pods), hint: `${sample.ready} ready` },
    { id: "k8s.not_ready" as MetricId, label: "Not-ready", value: String(sample.notReady), hint: `${sample.crashLoop} crashloop` },
    { id: "k8s.warnings" as MetricId, label: "Warnings", value: String(sample.warnings), hint: "k8s events" },
  ];
}
