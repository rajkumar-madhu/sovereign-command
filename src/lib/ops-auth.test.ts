import { describe, expect, it } from "bun:test";
import {
  hashTenantToken,
  parseTenantTokens,
  signSession,
  tenantIdForToken,
  verifySession,
} from "./ops-auth";

describe("ops-auth", () => {
  it("maps a tenant token hash to one tenant only", () => {
    const token = "aegis-tenant-token-finspot-dev";
    const tokens = parseTenantTokens(`finspot-dev:${hashTenantToken(token)}`);
    expect(tenantIdForToken(token, tokens)).toBe("finspot-dev");
    expect(tenantIdForToken("wrong-token-value-xx", tokens)).toBeNull();
    expect(tenantIdForToken(token, parseTenantTokens(`helix:${hashTenantToken("other-tenant-token")}`))).toBeNull();
  });

  it("rejects a signed session for a different tenant or after expiry", () => {
    const secret = "session-secret-for-tests";
    const token = signSession(
      { email: "ops@wecrew.in", tenantId: "finspot-dev", role: "operator", exp: Date.now() + 60_000 },
      secret,
    );
    expect(verifySession(token, secret)?.tenantId).toBe("finspot-dev");
    expect(verifySession(token, "other-secret")).toBeNull();
    const expired = signSession(
      { email: "ops@wecrew.in", tenantId: "finspot-dev", role: "operator", exp: 1 },
      secret,
    );
    expect(verifySession(expired, secret, Date.now())).toBeNull();
  });
});
