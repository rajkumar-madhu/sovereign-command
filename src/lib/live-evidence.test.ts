import { describe, expect, it } from "bun:test";
import type { ClusterSnapshot } from "./stage1-client";
import { buildLiveEvidence, filterLiveEvidence } from "./live-evidence";

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
        nodeName: "node-a",
      },
    ],
    warningEvents: [
      {
        namespace: "wecrew",
        type: "Warning",
        reason: "Unhealthy",
        object: "pod/api",
        message: "Readiness probe failed",
        lastTimestamp: "2026-09-20T12:00:00.000Z",
      },
    ],
    counts: { nodes: 1, namespaces: 1, pods: 1, crashLoop: 0, notReady: 1 },
    ...partial,
  };
}

describe("buildLiveEvidence", () => {
  it("builds artefacts from the Finspot snapshot without seed clients", () => {
    const report = buildLiveEvidence(snapshot(), Date.parse("2026-09-20T12:00:18.000Z"));
    expect(report.live).toBe(true);
    expect(report.incidentId).toBe("INC-LIVE-NR");
    expect(report.tenant).toContain("finspot-dev");
    expect(report.snapshotAge).toBe("18s");
    expect(report.artefacts.some((a) => a.pod === "api")).toBe(true);
    expect(report.database.toLowerCase()).toContain("outside");
    expect(JSON.stringify(report).toLowerCase()).not.toContain("nordic");
    expect(JSON.stringify(report)).not.toContain("T-001");
    expect(report.summary.find((s) => s.type === "Database Logs")?.status).toContain("Not in");
  });

  it("fails closed when the snapshot is unavailable", () => {
    const report = buildLiveEvidence(null);
    expect(report.live).toBe(false);
    expect(report.incidentId).toBe("INC-LIVE-OFF");
    expect(report.rootCause).toContain("cannot reach");
    expect(report.artefacts[0]?.body).not.toContain("postgres");
    expect(report.artefacts.every((a) => !a.body.includes("T-001"))).toBe(true);
  });

  it("filters artefacts by type and severity", () => {
    const report = buildLiveEvidence(snapshot());
    const events = filterLiveEvidence(report.artefacts, {
      windowMin: 0,
      severity: "WARN",
      type: "events",
      namespace: "all",
    });
    expect(events.length).toBe(1);
    expect(events[0]?.evidence).toContain("Unhealthy");
  });
});
