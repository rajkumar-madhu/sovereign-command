import { useEffect, useState } from "react";
import { appendSample, sampleFromSnapshot, type MetricSample } from "@/lib/live-metrics";
import {
  fetchPrometheusMetrics,
  type ClusterSnapshot,
  type PrometheusMetricDump,
} from "@/lib/stage1-client";

const STORAGE_KEY = "sovereign-metrics-history";
const POLL_MS = 15_000;

function readStored(): MetricSample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MetricSample[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function promOverlay(dump: PrometheusMetricDump | null) {
  if (!dump || dump.source !== "live-prometheus") {
    return {
      live: false,
      cpuCores: null,
      memBytes: null,
      postgresUp: null,
      mysqlUp: null,
      redisUp: null,
      targetsUp: null,
      restarts1h: null,
      postgresConnections: null,
      mysqlConnections: null,
      redisMemoryBytes: null,
    };
  }
  return {
    live: true,
    cpuCores: dump.values.cpuCores,
    memBytes: dump.values.memBytes,
    postgresUp: dump.values.postgresUp,
    mysqlUp: dump.values.mysqlUp,
    redisUp: dump.values.redisUp,
    targetsUp: dump.values.targetsUp,
    restarts1h: dump.values.restarts1h,
    postgresConnections: dump.values.postgresConnections,
    mysqlConnections: dump.values.mysqlConnections,
    redisMemoryBytes: dump.values.redisMemoryBytes,
  };
}

export function useMetricsHistory(
  snapshot: ClusterSnapshot | null,
  tenantId: string,
  enabled = true,
): { history: MetricSample[]; prom: PrometheusMetricDump | null } {
  const [history, setHistory] = useState<MetricSample[]>(readStored);
  const [prom, setProm] = useState<PrometheusMetricDump | null>(null);

  useEffect(() => {
    if (!enabled || !tenantId) {
      setProm(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next = await fetchPrometheusMetrics(tenantId);
      if (!cancelled) setProm(next);
    };
    void load();
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [tenantId, enabled]);

  useEffect(() => {
    const next = sampleFromSnapshot(snapshot, Date.now(), promOverlay(prom));
    if (!next) return;
    setHistory((prev) => {
      const merged = appendSample(prev, next);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore quota */
      }
      return merged;
    });
  }, [snapshot, prom]);

  return { history, prom };
}
