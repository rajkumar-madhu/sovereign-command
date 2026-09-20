import { describe, expect, it } from "bun:test";
import type { ClusterSnapshot } from "./stage1-client";
import {
  METRIC_CATALOG,
  appendSample,
  filterSamples,
  resolutionForRange,
  sampleFromSnapshot,
  sampleValue,
} from "./live-metrics";

function snapshot(partial?: Partial<ClusterSnapshot>): ClusterSnapshot {
  return {
    source: "live-k8s",
    remediator: "held",
    readOnly: true,
    cluster: "finspot-dev",
    context: "finspot-dev",
    generatedAt: "2026-09-20T12:00:00.000Z",
    tenantId: "finspot-dev",
    nodes: [{ name: "node-a", status: "Ready", roles: ["worker"], version: "v1.31.0" }],
    namespaces: ["wecrew"],
    pods: [
      {
        name: "api",
        namespace: "wecrew",
        phase: "Failed",
        ready: "0/1",
        restarts: 2,
        crashLoop: false,
      },
    ],
    warningEvents: [
      {
        namespace: "wecrew",
        type: "Warning",
        reason: "Unhealthy",
        object: "pod/api",
        message: "probe failed",
        lastTimestamp: "2026-09-20T12:00:00.000Z",
      },
    ],
    counts: { nodes: 1, namespaces: 1, pods: 1, crashLoop: 0, notReady: 1 },
    ...partial,
  };
}

describe("live-metrics", () => {
  it("samples live inventory without inventing HTTP or DB series", () => {
    const sample = sampleFromSnapshot(snapshot());
    expect(sample?.pods).toBe(1);
    expect(sample?.notReady).toBe(1);
    expect(sample?.warnings).toBe(1);
    expect(sampleValue(sample!, "k8s.pods")).toBe(1);
    expect(sampleValue(sample!, "api.rps")).toBeNull();
    expect(METRIC_CATALOG.filter((m) => m.live).every((m) => m.category === "Kubernetes")).toBe(true);
    expect(METRIC_CATALOG.some((m) => m.id === "api.http_5xx" && !m.live)).toBe(true);
  });

  it("fails closed when the snapshot is unavailable", () => {
    expect(sampleFromSnapshot(null)).toBeNull();
  });

  it("appends unique snapshots and filters by window", () => {
    const a = sampleFromSnapshot(snapshot())!;
    const b = sampleFromSnapshot(snapshot({ generatedAt: "2026-09-20T12:00:15.000Z" }))!;
    const hist = appendSample(appendSample([], a), b);
    expect(hist).toHaveLength(2);
    const same = appendSample(hist, { ...b, pods: 99 });
    expect(same).toHaveLength(2);
    expect(same[1]?.pods).toBe(99);
    expect(filterSamples(hist, a.ts, a.ts)).toHaveLength(1);
    expect(resolutionForRange(60 * 60_000)).toBe("10 sec");
  });
});
