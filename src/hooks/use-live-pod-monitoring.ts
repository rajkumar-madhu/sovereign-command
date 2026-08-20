import { useEffect, useState } from "react";
import {
  appendRestartPoint,
  derivePodMonitors,
  eventsFromPod,
  LIVE_POD_MONITOR_TICK_MS,
  seedRestartSeries,
  type PodMonitor,
  type PodMonitorEvent,
  type PodMonitorPoint,
} from "@/lib/live-pod-monitoring";
import {
  livePodFromEvidence,
  restartCount,
  type LivePodStatus,
} from "@/lib/live-pod-context";
import { fetchLiveEvidence, stage1ApiConfigured, STAGE1_EXECUTION_ID } from "@/lib/stage1-api";

export type LivePodMonitoringSnapshot = {
  pod: LivePodStatus | null;
  series: PodMonitorPoint[];
  monitors: PodMonitor[];
  events: PodMonitorEvent[];
  updatedAt: number;
  live: boolean;
};

export function useLivePodMonitoring(
  tenantId: string,
  enabled = true,
): LivePodMonitoringSnapshot {
  const [pod, setPod] = useState<LivePodStatus | null>(null);
  const [series, setSeries] = useState<PodMonitorPoint[]>([]);
  const [events, setEvents] = useState<PodMonitorEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const live = stage1ApiConfigured();

  useEffect(() => {
    if (!enabled || !live || !tenantId.trim()) return;

    let cancelled = false;

    async function poll() {
      const evidence = await fetchLiveEvidence(STAGE1_EXECUTION_ID, tenantId);
      if (cancelled || !evidence?.length) return;
      const nextPod = livePodFromEvidence(evidence);
      if (!nextPod) return;
      const restarts = restartCount(nextPod);
      setPod(nextPod);
      setSeries((prev) =>
        prev.length ? appendRestartPoint(prev, restarts) : seedRestartSeries(restarts),
      );
      setEvents(eventsFromPod(nextPod));
      setUpdatedAt(Date.now());
    }

    void poll();
    const id = window.setInterval(() => void poll(), LIVE_POD_MONITOR_TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, live, tenantId]);

  return {
    pod,
    series,
    monitors: derivePodMonitors(pod),
    events,
    updatedAt,
    live,
  };
}
