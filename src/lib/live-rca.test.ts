import { describe, expect, it } from "bun:test";
import type { ClusterSnapshot } from "./stage1-client";
import { buildLiveRca } from "./live-rca";

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
        reason: "Error",
      },
    ],
    warningEvents: [],
    counts: { nodes: 1, namespaces: 1, pods: 1, crashLoop: 0, notReady: 1 },
    ...partial,
  };
}

describe("buildLiveRca", () => {
  it("builds a not-ready RCA from the live snapshot without seed tenants", () => {
    const rca = buildLiveRca(snapshot(), Date.parse("2026-09-20T12:00:18.000Z"));
    expect(rca.live).toBe(true);
    expect(rca.incidentId).toBe("INC-LIVE-NR");
    expect(rca.client).toContain("finspot-dev");
    expect(rca.title.toLowerCase()).not.toContain("nordic");
    expect(rca.attention).toBe(1);
    expect(rca.snapshotAge).toBe("18s");
  });

  it("fails closed when the snapshot is unavailable", () => {
    const rca = buildLiveRca(null);
    expect(rca.live).toBe(false);
    expect(rca.incidentId).toBe("INC-LIVE-OFF");
    expect(rca.status).toBe("Open");
    expect(rca.rootCause).toContain("unavailable");
  });
});
