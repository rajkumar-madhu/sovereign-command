import { describe, expect, test } from "bun:test";
import {
  appendRestartPoint,
  buildHistoricalRestartSeries,
  derivePodMonitors,
  eventsFromPod,
  filterEventsByRange,
  filterSeriesByRange,
  seedRestartSeries,
} from "./live-pod-monitoring";
import type { LivePodStatus } from "./live-pod-context";

const samplePod: LivePodStatus = {
  name: "payments-auth-7d9f8c6b4-xq2n1",
  tenantId: "tn-nordic",
  customerId: "cu-fsprod",
  application: "payments-auth",
  phase: "Running",
  source: "live-k8s",
  namespace: "tn-nordic",
  cluster: "kind-wecrew",
  nodeName: "wecrew-control-plane",
  containerStatuses: [
    { ready: false, restartCount: 516, state: { waiting: { reason: "CrashLoopBackOff" } } },
  ],
  recentEvents: [
    {
      type: "Warning",
      reason: "BackOff",
      message: "Back-off restarting failed container",
      lastTimestamp: "2026-08-20T03:10:00Z",
    },
  ],
};

describe("live-pod-monitoring", () => {
  test("derives alert monitors for CrashLoopBackOff", () => {
    const monitors = derivePodMonitors(samplePod);
    expect(monitors.find((m) => m.id === "mon-phase")?.state).toBe("alert");
    expect(monitors.find((m) => m.id === "mon-restarts")?.state).toBe("alert");
  });

  test("builds restart series from polls", () => {
    const seeded = seedRestartSeries(10);
    const next = appendRestartPoint(seeded, 11);
    expect(next.at(-1)?.restarts).toBe(11);
  });

  test("builds historical series from onset to now", () => {
    const fromMs = new Date("2026-08-09T08:12:00Z").getTime();
    const toMs = new Date("2026-08-20T06:00:00Z").getTime();
    const series = buildHistoricalRestartSeries({ restarts: 500, fromMs, toMs, points: 10 });
    expect(series[0]?.restarts).toBe(0);
    expect(series.at(-1)?.restarts).toBe(500);
    expect(series[0]?.ts).toBe(fromMs);
  });

  test("filters series and events by customer date range", () => {
    const fromMs = new Date("2026-08-20T00:00:00Z").getTime();
    const toMs = new Date("2026-08-20T23:59:59Z").getTime();
    const series = buildHistoricalRestartSeries({
      restarts: 100,
      fromMs: new Date("2026-08-09T08:12:00Z").getTime(),
      toMs: new Date("2026-08-20T12:00:00Z").getTime(),
      points: 20,
    });
    const inRange = filterSeriesByRange(series, fromMs, toMs);
    expect(inRange.length).toBeGreaterThan(0);
    expect(inRange.every((p) => p.ts >= fromMs && p.ts <= toMs)).toBe(true);

    const events = eventsFromPod(samplePod);
    const eventsIn = filterEventsByRange(events, fromMs, toMs);
    expect(eventsIn.length).toBe(1);
  });

  test("maps kube events to monitor feed", () => {
    const events = eventsFromPod(samplePod);
    expect(events[0]?.label).toContain("BackOff");
    expect(events[0]?.severity).toBe("critical");
  });
});
