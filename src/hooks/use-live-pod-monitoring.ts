import { useEffect, useMemo, useState } from "react";
import {
  appendRestartPoint,
  buildHistoricalRestartSeries,
  derivePodMonitors,
  eventsFromPod,
  filterEventsByRange,
  filterSeriesByRange,
  LIVE_POD_MONITOR_TICK_MS,
  mergeLiveIntoHistory,
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
import type { TimeRange } from "@/components/ops/time-range-control";

export type LivePodMonitoringSnapshot = {
  pod: LivePodStatus | null;
  /** Full series (historical + live polls). */
  series: PodMonitorPoint[];
  /** Series filtered to the customer date range. */
  seriesInRange: PodMonitorPoint[];
  monitors: PodMonitor[];
  events: PodMonitorEvent[];
  eventsInRange: PodMonitorEvent[];
  updatedAt: number;
  live: boolean;
  historyFromMs: number;
  historyToMs: number;
};

export function useLivePodMonitoring(
  tenantId: string,
  enabled = true,
  opts?: {
    incidentOpenedIso?: string;
    range?: TimeRange;
  },
): LivePodMonitoringSnapshot {
  const [pod, setPod] = useState<LivePodStatus | null>(null);
  const [liveSeries, setLiveSeries] = useState<PodMonitorPoint[]>([]);
  const [events, setEvents] = useState<PodMonitorEvent[]>([]);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const live = stage1ApiConfigured();

  const historyFromMs = useMemo(() => {
    if (opts?.incidentOpenedIso) {
      const t = new Date(opts.incidentOpenedIso).getTime();
      if (!Number.isNaN(t)) return t;
    }
    return Date.now() - 60 * 60_000;
  }, [opts?.incidentOpenedIso]);

  const historyToMs = Date.now();

  useEffect(() => {
    if (!enabled || !live || !tenantId.trim()) return;

    let cancelled = false;

    async function poll() {
      const evidence = await fetchLiveEvidence(STAGE1_EXECUTION_ID, tenantId);
      if (cancelled || !evidence?.length) return;
      const nextPod = livePodFromEvidence(evidence);
      if (!nextPod) return;
      const restarts = restartCount(nextPod);
      const now = Date.now();
      setPod(nextPod);
      setLiveSeries((prev) => appendRestartPoint(prev, restarts, now));
      setEvents(eventsFromPod(nextPod, now));
      setUpdatedAt(now);
    }

    void poll();
    const id = window.setInterval(() => void poll(), LIVE_POD_MONITOR_TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, live, tenantId]);

  const series = useMemo(() => {
    const restarts = pod ? restartCount(pod) : liveSeries.at(-1)?.restarts ?? 0;
    const history = buildHistoricalRestartSeries({
      restarts,
      fromMs: historyFromMs,
      toMs: historyToMs,
      points: 48,
    });
    return mergeLiveIntoHistory(history, liveSeries);
  }, [pod, liveSeries, historyFromMs, historyToMs]);

  const rangeFrom = opts?.range?.from.getTime() ?? historyFromMs;
  const rangeTo = opts?.range?.to.getTime() ?? historyToMs;

  const seriesInRange = useMemo(
    () => filterSeriesByRange(series, rangeFrom, rangeTo),
    [series, rangeFrom, rangeTo],
  );

  const eventsInRange = useMemo(
    () => filterEventsByRange(events, rangeFrom, rangeTo),
    [events, rangeFrom, rangeTo],
  );

  return {
    pod,
    series,
    seriesInRange,
    monitors: derivePodMonitors(pod),
    events,
    eventsInRange,
    updatedAt,
    live,
    historyFromMs,
    historyToMs,
  };
}
