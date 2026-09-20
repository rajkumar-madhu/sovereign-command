import { useEffect, useState } from "react";
import { appendSample, sampleFromSnapshot, type MetricSample } from "@/lib/live-metrics";
import type { ClusterSnapshot } from "@/lib/stage1-client";

const STORAGE_KEY = "sovereign-metrics-history";

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

export function useMetricsHistory(snapshot: ClusterSnapshot | null): MetricSample[] {
  const [history, setHistory] = useState<MetricSample[]>(readStored);

  useEffect(() => {
    const next = sampleFromSnapshot(snapshot, Date.now());
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
  }, [snapshot]);

  return history;
}
