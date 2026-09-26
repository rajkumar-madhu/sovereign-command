import { describe, expect, it } from "bun:test";
import { commandOverview, podNeedsAttention, snapshotFreshness } from "./command-overview";
import type { ClusterPodRow, ClusterSnapshot } from "./stage1-client";

const pod: ClusterPodRow = {
  name: "api",
  namespace: "payments",
  phase: "Running",
  ready: "1/1",
  restarts: 0,
  crashLoop: false,
};
const snapshot: ClusterSnapshot = {
  source: "live-k8s",
  tenantId: "tenant-a",
  cluster: "cluster-a",
  context: "cluster-a",
  generatedAt: "2026-09-25T10:00:00Z",
  readOnly: true,
  remediator: "held",
  nodes: [],
  namespaces: ["payments", "platform", "empty"],
  pods: [
    pod,
    { ...pod, name: "worker", ready: "0/1" },
    { ...pod, name: "migration", phase: "Succeeded", ready: "0/1" },
    { ...pod, name: "crash", namespace: "platform", crashLoop: true },
  ],
  warningEvents: Array.from({ length: 12 }, (_, i) => ({
    namespace: i < 10 ? "payments" : "platform",
    type: "Warning",
    reason: "BackOff",
    message: "Retrying",
    object: `pod-${i}`,
  })),
  counts: { nodes: 0, namespaces: 3, pods: 4, crashLoop: 1, notReady: 2 },
};

describe("command overview", () => {
  it("fails closed for unavailable or mismatched tenant snapshots", () => {
    expect(commandOverview(null, "tenant-a", "all")).toBeNull();
    expect(commandOverview({ ...snapshot, source: "unavailable" }, "tenant-a", "all")).toBeNull();
    expect(commandOverview(snapshot, "tenant-b", "all")).toBeNull();
    expect(commandOverview(snapshot, "", "all")).toBeNull();
  });
  it("scopes all workload metrics and warning records before counting", () => {
    const result = commandOverview(snapshot, "tenant-a", "ns-payments");
    expect(result?.pods.length).toBe(3);
    expect(result?.active.length).toBe(2);
    expect(result?.ready).toBe(1);
    expect(result?.attention.map((item) => item.name)).toEqual(["worker"]);
    expect(result?.crashLoops).toBe(0);
    expect(result?.warnings.length).toBe(10);
    expect(result?.namespaces.map((item) => item.name)).toEqual(["payments"]);
    expect(result?.namespaces[0]?.readiness).toBe(50);
  });
  it("prioritizes crash loops and leaves empty namespace readiness unknown", () => {
    const result = commandOverview(snapshot, "tenant-a", "all");
    expect(result?.attention[0]?.name).toBe("crash");
    expect(result?.namespaces.find((item) => item.name === "empty")?.readiness).toBeNull();
    expect(commandOverview(snapshot, "tenant-a", "ns-missing")?.pods).toEqual([]);
  });
  it("recognizes running pods with unready or unknown container status", () => {
    for (const ready of ["0/1", "1/2", "0/0", "unknown"])
      expect(podNeedsAttention({ ...pod, ready })).toBe(true);
    expect(podNeedsAttention(pod)).toBe(false);
    expect(podNeedsAttention({ ...pod, phase: "Succeeded", ready: "0/1" })).toBe(false);
  });
  it("distinguishes current, delayed, invalid and future timestamps", () => {
    const now = Date.parse("2026-09-25T10:00:30Z");
    expect(snapshotFreshness(snapshot.generatedAt, now)).toBe("current");
    expect(snapshotFreshness(snapshot.generatedAt, now + 60_000)).toBe("delayed");
    expect(snapshotFreshness(undefined, now)).toBe("unknown");
    expect(snapshotFreshness("invalid", now)).toBe("unknown");
    expect(snapshotFreshness("2026-09-25T11:00:00Z", now)).toBe("unknown");
  });
});
