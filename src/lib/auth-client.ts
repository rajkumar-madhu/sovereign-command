import { rememberOperator } from "@/lib/ops-identity";

export async function bindTenantAccess(email: string, token: string): Promise<string | null> {
  try {
    const res = await fetch("/auth/bind", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, token }),
    });
    const body = (await res.json()) as { error?: string; email?: string; tenantId?: string };
    if (!res.ok || !body.email || !body.tenantId) return body.error || "Tenant token was rejected.";
    rememberOperator(body.email);
    return null;
  } catch {
    return "Could not reach the auth service.";
  }
}
