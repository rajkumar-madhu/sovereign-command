import { useEffect, useState } from "react";
import {
  LIVE_TELEMETRY_TICK_MS,
  appendTelemetryPoint,
  createInitialSeries,
  deriveMonitors,
  nextLiveEvent,
  nextTelemetryPoint,
  type LiveEvent,
  type LiveMonitor,
  type TelemetryPoint,
} from "@/lib/live-telemetry";

export type LiveTelemetrySnapshot = {
  series: TelemetryPoint[];
  latest: TelemetryPoint;
  monitors: LiveMonitor[];
  events: LiveEvent[];
  updatedAt: number;
};

const EVENT_CAP = 8;

export function useLiveTelemetry(enabled = true): LiveTelemetrySnapshot {
  const [series, setSeries] = useState<TelemetryPoint[]>(() => createInitialSeries());
  const [events, setEvents] = useState<LiveEvent[]>(() =>
    Array.from({ length: 4 }, () => nextLiveEvent(Date.now() - Math.random() * 12_000)),
  );
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1]!;
        return appendTelemetryPoint(prev, nextTelemetryPoint(last));
      });
      setUpdatedAt(Date.now());
      // Occasional event (~40% of ticks)
      if (Math.random() < 0.4) {
        setEvents((prev) => [nextLiveEvent(), ...prev].slice(0, EVENT_CAP));
      }
    }, LIVE_TELEMETRY_TICK_MS);

    return () => window.clearInterval(id);
  }, [enabled]);

  const latest = series[series.length - 1]!;
  const monitors = deriveMonitors(latest);

  return { series, latest, monitors, events, updatedAt };
}
