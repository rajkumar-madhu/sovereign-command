import { describe, expect, it } from "bun:test";
import { rewriteStage1Path, scopedStage1Path } from "./stage1-proxy";

describe("rewriteStage1Path", () => {
  it("allows snapshot and logs with tenantId", () => {
    expect(rewriteStage1Path("/stage1-api/cluster/snapshot", "?tenantId=finspot-dev")).toBe(
      "/cluster/snapshot?tenantId=finspot-dev",
    );
    expect(
      rewriteStage1Path("/stage1-api/cluster/logs", "?tenantId=finspot-dev&namespace=finspot-dev&pod=analytics-ls-1"),
    ).toBe("/cluster/logs?tenantId=finspot-dev&namespace=finspot-dev&pod=analytics-ls-1");
  });

  it("binds snapshot and logs to the session tenant", () => {
    expect(scopedStage1Path("/cluster/snapshot?tenantId=finspot-dev", "finspot-dev")).toBe(
      "/cluster/snapshot?tenantId=finspot-dev",
    );
    expect(scopedStage1Path("/cluster/snapshot?tenantId=helix", "finspot-dev")).toBeNull();
    expect(scopedStage1Path("/health", "finspot-dev")).toBe("/health");
  });

  it("allows metrics with tenantId and optional window", () => {
    expect(rewriteStage1Path("/stage1-api/cluster/metrics", "?tenantId=finspot-dev")).toBe(
      "/cluster/metrics?tenantId=finspot-dev",
    );
    expect(
      rewriteStage1Path(
        "/stage1-api/cluster/metrics",
        "?tenantId=finspot-dev&window=15m&series=cpuCores,memBytes",
      ),
    ).toBe("/cluster/metrics?tenantId=finspot-dev&window=15m&series=cpuCores,memBytes");
    expect(rewriteStage1Path("/stage1-api/cluster/metrics", "?tenantId=finspot-dev&query=up")).toBeNull();
  });

  it("allows ES log backend params and rejects DSL injection", () => {
    expect(
      rewriteStage1Path("/stage1-api/cluster/logs", "?tenantId=finspot-dev&backend=es&window=15m&q=crash"),
    ).toBe("/cluster/logs?tenantId=finspot-dev&backend=es&window=15m&q=crash");
    expect(
      rewriteStage1Path("/stage1-api/cluster/logs", "?tenantId=finspot-dev&limit=50"),
    ).toBe("/cluster/logs?tenantId=finspot-dev&limit=50");
    expect(
      rewriteStage1Path("/stage1-api/cluster/logs", "?tenantId=finspot-dev&limit=0"),
    ).toBeNull();
    expect(
      rewriteStage1Path("/stage1-api/cluster/logs", "?tenantId=finspot-dev&backend=es&q=foo%22%3B"),
    ).toBeNull();
  });

  it("rejects exec, secrets, and foreign hosts", () => {
    expect(rewriteStage1Path("/stage1-api/cluster/snapshot", "?tenantId=finspot-dev&extra=1")).toBeNull();
    expect(rewriteStage1Path("/stage1-api/run", "")).toBeNull();
    expect(rewriteStage1Path("https://evil.example/cluster/snapshot", "?tenantId=finspot-dev")).toBeNull();
  });
});
