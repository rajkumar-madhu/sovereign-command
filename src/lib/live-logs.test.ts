import { describe, expect, it } from "bun:test";
import type { ClusterSnapshot } from "./stage1-client";
import {
  buildProductLogAnalysis,
  filterParsedLines,
  parseLogstashDump,
} from "./live-logs";

const LOGSTASH = `OpenJDK 64-Bit Server VM warning: Option UseConcMarkSweepGC was deprecated
WARNING: An illegal reflective access operation has occurred
Sending Logstash logs to /usr/share/logstash/logs which is now configured via log4j2.properties
[2026-08-14T05:30:48,048][INFO ][logstash.runner          ] Starting Logstash {"logstash.version"=>"7.6.2"}
[2026-08-14T05:31:00,154][INFO ][logstash.licensechecker.licensereader] Elasticsearch pool URLs updated {:changes=>{:removed=>[], :added=>[http://elastic:xxxxxx@analytics-es:9200/]}}
[2026-08-14T05:31:02,054][WARN ][logstash.licensechecker.licensereader] DEPRECATION WARNING: Connecting to an OSS distribution of Elasticsearch
[2026-08-14T05:31:37,350][WARN ][logstash.outputs.elasticsearch][noren_filebeat] Restored connection to ES instance {:url=>"http://elastic:xxxxxx@analytics-es:9200/"}
[2026-08-14T05:31:37,353][WARN ][logstash.outputs.elasticsearch][appsentinel_filebeat] Restored connection to ES instance {:url=>"http://elastic:xxxxxx@analytics-es:9200/"}
[2026-08-14T05:31:51,658][INFO ][logstash.agent           ] Pipelines running {:count=>2, :running_pipelines=>[:noren_filebeat, :appsentinel_filebeat]}`;

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
    warningEvents: [
      {
        namespace: "wecrew",
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

describe("parseLogstashDump", () => {
  it("parses Logstash 7 log4j lines with pipeline tags", () => {
    const lines = parseLogstashDump(LOGSTASH);
    expect(lines.length).toBeGreaterThanOrEqual(8);
    const start = lines.find((l) => l.message.includes("Starting Logstash"));
    expect(start?.level).toBe("INFO");
    expect(start?.logger).toContain("logstash.runner");
    expect(start?.timestamp).toBe("2026-08-14T05:30:48,048");
    const noren = lines.find((l) => l.pipeline === "noren_filebeat");
    expect(noren?.level).toBe("WARN");
    expect(noren?.raw).toContain("[noren_filebeat]");
    expect(lines.some((l) => l.pipeline === "appsentinel_filebeat")).toBe(true);
    expect(lines.filter((l) => l.level === "WARN").length).toBeGreaterThanOrEqual(3);
  });

  it("filters by level and pipeline without inventing rows", () => {
    const lines = parseLogstashDump(LOGSTASH);
    expect(filterParsedLines(lines, { level: "INFO" }).every((l) => l.level === "INFO")).toBe(true);
    expect(
      filterParsedLines(lines, { pipeline: "noren_filebeat" }).every((l) => l.pipeline === "noren_filebeat"),
    ).toBe(true);
    expect(filterParsedLines(lines, { query: "CMS" }).length).toBe(0);
  });
});

describe("buildProductLogAnalysis", () => {
  it("builds a live report from the Finspot snapshot without seed logs", () => {
    const report = buildProductLogAnalysis(snapshot(), Date.parse("2026-09-20T12:00:18.000Z"));
    expect(report.live).toBe(true);
    expect(report.client).toContain("finspot-dev");
    expect(report.overall).toBe("Degraded");
    expect(report.severity).toBe("P2");
    expect(report.attention).toBe(1);
    expect(report.snapshotAge).toBe("18s");
    expect(report.appEvidence.toLowerCase()).not.toContain("nordic");
    expect(report.appEvidence).not.toContain("T-001");
    expect(report.database.toLowerCase()).toContain("not part");
    expect(report.topErrors.some((e) => e.message.includes("api"))).toBe(true);
    expect(report.http.every((h) => h.count === 0)).toBe(true);
  });

  it("fails closed when the snapshot is unavailable", () => {
    const report = buildProductLogAnalysis(null);
    expect(report.live).toBe(false);
    expect(report.overall).toBe("Monitoring");
    expect(report.rootCause).toContain("cannot reach");
    expect(report.lines[0]?.message).toContain("unavailable");
    expect(report.appEvidence).not.toContain("postgres");
    expect(report.appEvidence).not.toContain("T-001");
  });

  it("marks a clean inventory as healthy", () => {
    const report = buildProductLogAnalysis(
      snapshot({
        pods: [
          {
            name: "api",
            namespace: "wecrew",
            phase: "Running",
            ready: "1/1",
            restarts: 0,
            crashLoop: false,
          },
        ],
        warningEvents: [],
        counts: { nodes: 1, namespaces: 1, pods: 1, crashLoop: 0, notReady: 0 },
      }),
    );
    expect(report.overall).toBe("Healthy");
    expect(report.severity).toBe("P3");
    expect(report.attention).toBe(0);
    expect(report.critical).toEqual(["None"]);
  });

  it("seals Logstash stream counts when a live dump is provided", () => {
    const report = buildProductLogAnalysis(snapshot(), Date.parse("2026-09-20T12:00:18.000Z"), {
      source: "live-k8s",
      remediator: "held",
      readOnly: true,
      cluster: "finspot-dev",
      context: "finspot-dev",
      generatedAt: "2026-09-20T12:00:00.000Z",
      tenantId: "finspot-dev",
      namespace: "finspot-dev",
      pod: "analytics-ls-6c78bb6b67-8f672",
      tailLines: 400,
      text: LOGSTASH,
    });
    expect(report.streamSource).toContain("analytics-ls");
    expect(report.pipelines).toEqual(["appsentinel_filebeat", "noren_filebeat"]);
    expect(report.totalLogs).toBeGreaterThanOrEqual(8);
    expect(report.appEvidence).toContain("Starting Logstash");
    expect(report.appEvidence).not.toContain("s3cret");
  });
});
