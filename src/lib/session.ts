/** Client-side Stage-1 session (localStorage). Not a substitute for IdP. */

export type OpsSessionKind = "demo" | "operator";

export type OpsSession = {
  kind: OpsSessionKind;
  email: string;
  establishedAt: string;
};

export const SESSION_STORAGE_KEY = "sovereign-ops-session";

function isSession(value: unknown): value is OpsSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.kind === "demo" || v.kind === "operator") &&
    typeof v.email === "string" &&
    typeof v.establishedAt === "string"
  );
}

export function getSession(): OpsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: OpsSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function createDemoSession(): OpsSession {
  return {
    kind: "demo",
    email: "demo@wecrew.in",
    establishedAt: new Date().toISOString(),
  };
}

export function createOperatorSession(email: string): OpsSession {
  return {
    kind: "operator",
    email: email.trim().toLowerCase(),
    establishedAt: new Date().toISOString(),
  };
}
