import { describe, expect, test } from "bun:test";
import { parseLiveOpenClawPosture } from "./stage1-api";

const held = {
  remediator: "held",
  wouldExecute: false,
  stage1Hold: true,
  tenantId: "tn-nordic",
  cases: [
    {
      id: "sandboxed-read",
      action: "openclaw.read",
      decision: "ALLOW",
      reason: "read is allowed at sandbox",
      placement: "sandbox",
      toolAvailable: true,
      elevatedApplied: false,
      wouldExecute: false,
    },
  ],
};

describe("parseLiveOpenClawPosture", () => {
  test("accepts a held posture", () => {
    const parsed = parseLiveOpenClawPosture(held);
    expect(parsed?.cases[0]?.decision).toBe("ALLOW");
    expect(parsed?.wouldExecute).toBe(false);
  });

  test("rejects a payload that would execute", () => {
    expect(parseLiveOpenClawPosture({ ...held, wouldExecute: true })).toBeNull();
    expect(
      parseLiveOpenClawPosture({
        ...held,
        cases: [{ ...held.cases[0], wouldExecute: true }],
      }),
    ).toBeNull();
  });
});
