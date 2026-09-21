import { describe, expect, it } from "bun:test";
import {
  handleOpsAuth,
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

  it("rejects bind for an email that is not on the operator allowlist", async () => {
    const prevSecret = process.env.AEGIS_SESSION_SECRET;
    const prevTokens = process.env.AEGIS_TENANT_TOKENS;
    const token = "aegis-tenant-token-finspot-dev";
    process.env.AEGIS_SESSION_SECRET = "session-secret-for-tests";
    process.env.AEGIS_TENANT_TOKENS = `finspot-dev:${hashTenantToken(token)}`;
    try {
      const res = await handleOpsAuth(
        new Request("https://sovereign.wecrew.in/auth/bind", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "ops@wecrew.in", token }),
        }),
      );
      expect(res?.status).toBe(403);
      const body = (await res?.json()) as { error?: string };
      expect(body.error).toMatch(/allowlist/);
    } finally {
      if (prevSecret === undefined) delete process.env.AEGIS_SESSION_SECRET;
      else process.env.AEGIS_SESSION_SECRET = prevSecret;
      if (prevTokens === undefined) delete process.env.AEGIS_TENANT_TOKENS;
      else process.env.AEGIS_TENANT_TOKENS = prevTokens;
    }
  });
});
