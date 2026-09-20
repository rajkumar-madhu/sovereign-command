import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearOperatorIdentity, readOperatorIdentity, rememberOperator } from "@/lib/ops-identity";

export type OpsSession = {
  email: string;
  tenantId: string;
  role: "operator";
  provisioned: true;
};

type OpsSessionState = {
  session: OpsSession | null;
  identityEmail: string;
  loading: boolean;
  bindTenantToken: (email: string, token: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<OpsSessionState | null>(null);

async function readServerSession(): Promise<OpsSession | null> {
  try {
    const res = await fetch("/auth/session", { credentials: "include" });
    if (!res.ok) return null;
    const body = (await res.json()) as { provisioned?: boolean; email?: string; tenantId?: string; role?: string };
    if (!body.provisioned || !body.email || !body.tenantId) return null;
    return { email: body.email, tenantId: body.tenantId, role: "operator", provisioned: true };
  } catch {
    return null;
  }
}

export function OpsSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OpsSession | null>(null);
  const [identityEmail, setIdentityEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIdentityEmail(readOperatorIdentity()?.email ?? "");
    void readServerSession().then((next) => {
      setSession(next);
      if (next) {
        rememberOperator(next.email);
        setIdentityEmail(next.email);
      }
      setLoading(false);
    });
  }, []);

  const bindTenantToken = useCallback(async (email: string, token: string) => {
    try {
      const res = await fetch("/auth/bind", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const body = (await res.json()) as { error?: string; email?: string; tenantId?: string };
      if (!res.ok || !body.email || !body.tenantId) return body.error || "Tenant token was rejected.";
      const next: OpsSession = {
        email: body.email,
        tenantId: body.tenantId,
        role: "operator",
        provisioned: true,
      };
      rememberOperator(next.email);
      setIdentityEmail(next.email);
      setSession(next);
      return null;
    } catch {
      return "Could not reach the auth service.";
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* fail closed locally */
    }
    clearOperatorIdentity();
    setIdentityEmail("");
    setSession(null);
  }, []);

  const value = useMemo<OpsSessionState>(
    () => ({ session, identityEmail, loading, bindTenantToken, signOut }),
    [session, identityEmail, loading, bindTenantToken, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOpsSession(): OpsSessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOpsSession must be used inside OpsSessionProvider");
  return ctx;
}
