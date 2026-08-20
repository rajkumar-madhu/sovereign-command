import type { LivePodStatus } from "@/lib/live-pod-context";
import { podStatusLabel, restartCount } from "@/lib/live-pod-context";

export type PodMonitorState = "ok" | "warn" | "alert";

export type PodMonitor = {
  id: string;
  name: string;
  query: string;
  state: PodMonitorState;
  value: string;
  threshold: string;
};

export type PodMonitorPoint = {
  t: string;
  ts: number;
  restarts: number;
};

export type PodMonitorEvent = {
  id: string;
  ts: number;
  label: string;
  severity: "info" | "warn" | "critical";
};

const RESTART_WINDOW = 36;
const HISTORY_CAP = 96;

function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function derivePodMonitors(pod: LivePodStatus | null): PodMonitor[] {
  if (!pod) {
    return [
      {
        id: "mon-pod-ready",
        name: "Pod ready",
        query: "kube_pod_status_ready{pod=payments-auth}",
        state: "warn",
        value: "—",
        threshold: "== 1",
      },
      {
        id: "mon-restarts",
        name: "Container restarts",
        query: "kube_pod_container_status_restarts_total",
        state: "warn",
        value: "—",
        threshold: "< 5",
      },
      {
        id: "mon-phase",
        name: "CrashLoopBackOff",
        query: "kube_pod_container_status_waiting_reason",
        state: "warn",
        value: "—",
        threshold: "!= CrashLoopBackOff",
      },
    ];
  }

  const restarts = restartCount(pod);
  const status = podStatusLabel(pod);
  const ready = pod.containerStatuses?.[0]?.ready ?? false;
  const crashLoop = status === "CrashLoopBackOff";

  return [
    {
      id: "mon-pod-ready",
      name: "Pod ready",
      query: `kube_pod_status_ready{pod="${pod.name}",namespace="${pod.namespace}"}`,
      state: ready ? "ok" : "alert",
      value: ready ? "1/1" : "0/1",
      threshold: "== 1",
    },
    {
      id: "mon-restarts",
      name: "Container restarts",
      query: `kube_pod_container_status_restarts_total{pod="${pod.name}"}`,
      state: restarts >= 100 ? "alert" : restarts >= 14 ? "warn" : "ok",
      value: String(restarts),
      threshold: "< 5",
    },
    {
      id: "mon-phase",
      name: "CrashLoopBackOff",
      query: `kube_pod_container_status_waiting_reason{pod="${pod.name}"}`,
      state: crashLoop ? "alert" : "ok",
      value: status,
      threshold: "!= CrashLoopBackOff",
    },
    {
      id: "mon-node",
      name: "Worker node scheduled",
      query: `kube_pod_info{node="${pod.nodeName ?? "unknown"}"}`,
      state: pod.nodeName ? "ok" : "warn",
      value: pod.nodeName ?? "unscheduled",
      threshold: "node assigned",
    },
  ];
}

export function appendRestartPoint(
  series: PodMonitorPoint[],
  restarts: number,
  now = Date.now(),
): PodMonitorPoint[] {
  const point: PodMonitorPoint = {
    t: formatClock(new Date(now)),
    ts: now,
    restarts,
  };
  const withoutDup =
    series.length && Math.abs(series[series.length - 1]!.ts - now) < 2_000
      ? series.slice(0, -1)
      : series;
  return [...withoutDup, point].slice(-HISTORY_CAP);
}

/** Short in-session seed when no incident onset is known (~9 minutes). */
export function seedRestartSeries(restarts: number, now = Date.now()): PodMonitorPoint[] {
  return Array.from({ length: RESTART_WINDOW }, (_, i) => {
    const ts = now - (RESTART_WINDOW - 1 - i) * 15_000;
    const drift = Math.max(0, restarts - (RESTART_WINDOW - 1 - i));
    return {
      t: formatClock(new Date(ts)),
      ts,
      restarts: Math.max(0, restarts - drift),
    };
  });
}

/**
 * Reconstruct restart growth from incident onset → now (or to a selected end).
 * CrashLoop backoff grows roughly linearly in restart count over long windows.
 */
export function buildHistoricalRestartSeries(opts: {
  restarts: number;
  fromMs: number;
  toMs: number;
  points?: number;
}): PodMonitorPoint[] {
  const { restarts, fromMs, toMs } = opts;
  const span = Math.max(1, toMs - fromMs);
  const points = Math.min(HISTORY_CAP, Math.max(8, opts.points ?? 48));
  return Array.from({ length: points }, (_, i) => {
    const ratio = i / (points - 1);
    const ts = Math.round(fromMs + span * ratio);
    return {
      t: formatClock(new Date(ts)),
      ts,
      restarts: Math.max(0, Math.round(restarts * ratio)),
    };
  });
}

export function filterSeriesByRange(
  series: PodMonitorPoint[],
  fromMs: number,
  toMs: number,
): PodMonitorPoint[] {
  return series.filter((p) => p.ts >= fromMs && p.ts <= toMs);
}

export function mergeLiveIntoHistory(
  history: PodMonitorPoint[],
  live: PodMonitorPoint[],
): PodMonitorPoint[] {
  const byTs = new Map<number, PodMonitorPoint>();
  for (const p of [...history, ...live]) {
    byTs.set(p.ts, p);
  }
  return [...byTs.values()].sort((a, b) => a.ts - b.ts).slice(-HISTORY_CAP);
}

export function eventsFromPod(pod: LivePodStatus | null, now = Date.now()): PodMonitorEvent[] {
  if (!pod?.recentEvents?.length) return [];
  return pod.recentEvents.slice(0, 5).map((e, idx) => ({
    id: `k8s-${e.reason}-${idx}-${now}`,
    ts: e.lastTimestamp ? new Date(e.lastTimestamp).getTime() : now,
    label: `${e.type} · ${e.reason} · ${e.message}`.slice(0, 120),
    severity: e.type === "Warning" ? "critical" : "info",
  }));
}

export function filterEventsByRange(
  events: PodMonitorEvent[],
  fromMs: number,
  toMs: number,
): PodMonitorEvent[] {
  return events.filter((e) => e.ts >= fromMs && e.ts <= toMs);
}

export const LIVE_POD_MONITOR_TICK_MS = 15_000;
