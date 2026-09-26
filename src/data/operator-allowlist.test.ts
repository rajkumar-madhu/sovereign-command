import { describe, expect, it } from "bun:test";
import { isOperatorEmail } from "./operator-allowlist";

describe("operator allowlist", () => {
  it("accepts provisioned operator emails", () => {
    expect(isOperatorEmail("admin@wecrew.in")).toBe(true);
    expect(isOperatorEmail("  Raj@WeCrew.in ")).toBe(true);
  });

  it("rejects emails that were not provisioned", () => {
    expect(isOperatorEmail("ops@wecrew.in")).toBe(false);
    expect(isOperatorEmail("not-an-email")).toBe(false);
  });
});
