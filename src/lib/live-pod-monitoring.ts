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
  return [...series.slice(-(RESTART_WINDOW - 1)), point];
}

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

export function eventsFromPod(pod: LivePodStatus | null, now = Date.now()): PodMonitorEvent[] {
  if (!pod?.recentEvents?.length) return [];
  return pod.recentEvents.slice(0, 5).map((e, idx) => ({
    id: `k8s-${e.reason}-${idx}-${now}`,
    ts: e.lastTimestamp ? new Date(e.lastTimestamp).getTime() : now,
    label: `${e.type} · ${e.reason} · ${e.message}`.slice(0, 120),
    severity: e.type === "Warning" ? "critical" : "info",
  }));
}

export const LIVE_POD_MONITOR_TICK_MS = 15_000;
