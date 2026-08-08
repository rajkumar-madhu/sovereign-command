/**
 * Simulated live telemetry stream for Command Centre visualizations.
 * No Datadog/API keys required — random-walk series that tick on an interval.
 */

export type TelemetryPoint = {
  /** Short clock label for X axis, e.g. "14:32:05" */
  t: string;
  /** Epoch ms for ordering */
  ts: number;
  cpu: number;
  latencyMs: number;
  errorRate: number;
  throughput: number;
  agentBusy: number;
};

export type MonitorState = "ok" | "warn" | "alert";

export type LiveMonitor = {
  id: string;
  name: string;
  query: string;
  state: MonitorState;
  value: string;
  threshold: string;
};

export type LiveEvent = {
  id: string;
  ts: number;
  label: string;
  severity: "info" | "warn" | "critical";
};

const WINDOW = 36;
const TICK_MS = 1500;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function walk(prev: number, delta: number, min: number, max: number) {
  return clamp(prev + (Math.random() - 0.48) * delta, min, max);
}

function formatClock(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function seedPoint(now: Date, i: number): TelemetryPoint {
  const ts = now.getTime() - (WINDOW - 1 - i) * TICK_MS;
  const d = new Date(ts);
  const phase = i / WINDOW;
  return {
    t: formatClock(d),
    ts,
    cpu: clamp(42 + Math.sin(phase * Math.PI * 2) * 12 + Math.random() * 6, 18, 92),
    latencyMs: clamp(180 + Math.cos(phase * Math.PI * 2) * 40 + Math.random() * 25, 80, 520),
    errorRate: clamp(0.4 + Math.sin(phase * 4) * 0.3 + Math.random() * 0.35, 0.05, 4.2),
    throughput: clamp(820 + Math.sin(phase * Math.PI) * 140 + Math.random() * 60, 400, 1400),
    agentBusy: clamp(58 + Math.cos(phase * 3) * 15 + Math.random() * 8, 20, 95),
  };
}

export function createInitialSeries(now = new Date()): TelemetryPoint[] {
  return Array.from({ length: WINDOW }, (_, i) => seedPoint(now, i));
}

export function nextTelemetryPoint(prev: TelemetryPoint): TelemetryPoint {
  const now = new Date();
  return {
    t: formatClock(now),
    ts: now.getTime(),
    cpu: walk(prev.cpu, 4.5, 18, 94),
    latencyMs: walk(prev.latencyMs, 28, 75, 580),
    errorRate: walk(prev.errorRate, 0.28, 0.05, 5.5),
    throughput: walk(prev.throughput, 55, 380, 1500),
    agentBusy: walk(prev.agentBusy, 5, 18, 96),
  };
}

export function appendTelemetryPoint(series: TelemetryPoint[], point: TelemetryPoint): TelemetryPoint[] {
  return [...series.slice(-(WINDOW - 1)), point];
}

const MONITOR_DEFS: Omit<LiveMonitor, "state" | "value">[] = [
  {
    id: "mon-cpu",
    name: "Fleet CPU anomaly",
    query: "avg(last_5m):cpu.utilization{scope:agents}",
    threshold: "> 85%",
  },
  {
    id: "mon-lat",
    name: "Gateway latency p95",
    query: "avg(last_5m):gateway.latency.p95",
    threshold: "> 400ms",
  },
  {
    id: "mon-err",
    name: "Error rate spike",
    query: "sum(last_5m):errors.rate{env:production}",
    threshold: "> 2.5%",
  },
  {
    id: "mon-pipe",
    name: "Log pipeline lag",
    query: "avg(last_5m):pipeline.lag.p95",
    threshold: "> 3s",
  },
];

export function deriveMonitors(latest: TelemetryPoint): LiveMonitor[] {
  const cpuState: MonitorState = latest.cpu >= 85 ? "alert" : latest.cpu >= 72 ? "warn" : "ok";
  const latState: MonitorState =
    latest.latencyMs >= 400 ? "alert" : latest.latencyMs >= 280 ? "warn" : "ok";
  const errState: MonitorState =
    latest.errorRate >= 2.5 ? "alert" : latest.errorRate >= 1.2 ? "warn" : "ok";
  const lagSec = clamp(0.6 + (latest.latencyMs / 400) * 1.4 + Math.random() * 0.3, 0.4, 4.5);
  const pipeState: MonitorState = lagSec >= 3 ? "alert" : lagSec >= 2 ? "warn" : "ok";

  const values = [
    `${latest.cpu.toFixed(1)}%`,
    `${Math.round(latest.latencyMs)}ms`,
    `${latest.errorRate.toFixed(2)}%`,
    `${lagSec.toFixed(1)}s`,
  ];
  const states: MonitorState[] = [cpuState, latState, errState, pipeState];

  return MONITOR_DEFS.map((def, i) => ({
    ...def,
    state: states[i]!,
    value: values[i]!,
  }));
}

const EVENT_TEMPLATES: { label: string; severity: LiveEvent["severity"] }[] = [
  { label: "Collector heartbeat · eu-west-1", severity: "info" },
  { label: "Agent sidecar scrape completed", severity: "info" },
  { label: "Latency probe elevated · model gateway", severity: "warn" },
  { label: "Retry budget consumed · tool invoke", severity: "warn" },
  { label: "P1 signature match · kubelet not ready", severity: "critical" },
  { label: "Trace sample ingested · investigation span", severity: "info" },
  { label: "Approval SLA tick · pending queue", severity: "warn" },
  { label: "Integrity check · evidence artefact", severity: "info" },
];

let eventSeq = 0;

export function nextLiveEvent(now = Date.now()): LiveEvent {
  const pick = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]!;
  eventSeq += 1;
  return {
    id: `evt-${now}-${eventSeq}`,
    ts: now,
    label: pick.label,
    severity: pick.severity,
  };
}

export const LIVE_TELEMETRY_TICK_MS = TICK_MS;
export const LIVE_TELEMETRY_WINDOW = WINDOW;
