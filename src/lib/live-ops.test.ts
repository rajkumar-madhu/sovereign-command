import { describe, expect, it } from "bun:test";
import type { ClusterSnapshot } from "./stage1-client";
import {
  LIVE_CLUSTER_TENANT_ID,
  customersFromSnapshot,
  liveCustomersFromSnapshot,
  liveEstateScore,
  livePolicies,
  liveTenantFromSnapshot,
  namespaceCustomerId,
  snapshotAgeLabel,
  tenantsFromSnapshot,
} from "./live-ops";

function snapshot(partial?: Partial<ClusterSnapshot>): ClusterSnapshot {
  return {
    source: "live-k8s",
    remediator: "held",
    readOnly: true,
    cluster: "finspot-dev",
    context: "finspot-dev",
    generatedAt: "2026-09-20T12:00:00.000Z",
    tenantId: "finspot-dev",
    nodes: [],
    namespaces: ["wecrew", "kube-system"],
    pods: [
      {
        name: "api",
        namespace: "wecrew",
        phase: "Running",
        ready: "1/1",
        restarts: 0,
        crashLoop: false,
      },
      {
        name: "curl-test",
        namespace: "wecrew",
        phase: "Failed",
        ready: "0/1",
        restarts: 2,
        crashLoop: false,
        reason: "Error",
      },
    ],
    warningEvents: [],
    counts: { nodes: 6, namespaces: 2, pods: 2, crashLoop: 0, notReady: 1 },
    ...partial,
  };
}

describe("live-ops", () => {
  it("maps the connected cluster to one tenant and namespaces as customers", () => {
    const snap = snapshot();
    const tenant = liveTenantFromSnapshot(snap);
    expect(tenant.id).toBe(LIVE_CLUSTER_TENANT_ID);
    expect(tenant.customers).toBe(2);
    const customers = liveCustomersFromSnapshot(snap);
    expect(customers.map((c) => c.id)).toEqual(["ns-wecrew", "ns-kube-system"]);
    expect(customers[0]?.openIncidents).toBe(1);
    expect(customers[0]?.agents).toBe(2);
    expect(namespaceCustomerId("wecrew")).toBe("ns-wecrew");
  });

  it("does not fall back to seed clients when the snapshot is unavailable", () => {
    expect(tenantsFromSnapshot(null)).toEqual([]);
    expect(customersFromSnapshot(null)).toEqual([]);
    expect(
      customersFromSnapshot({
        ...snapshot(),
        source: "unavailable",
      }),
    ).toEqual([]);
  });

  it("scores the estate from live not-ready and crashloop counts", () => {
    expect(liveEstateScore(snapshot())).toBe(92);
  });

  it("exposes sovereign read-only policies for the connected cluster", () => {
    const rules = livePolicies("finspot-dev", "2026-09-20T12:00:00.000Z");
    expect(rules.map((r) => r.id)).toEqual([
      "POL-RO-001",
      "POL-RO-002",
      "POL-RO-003",
      "POL-RO-004",
    ]);
    expect(rules.every((r) => r.scope.startsWith("finspot-dev"))).toBe(true);
    expect(rules.some((r) => r.scope.includes("nordic"))).toBe(false);
    expect(snapshotAgeLabel("2026-09-20T12:00:00.000Z", Date.parse("2026-09-20T12:00:18.000Z"))).toBe(
      "18s",
    );
  });
});
