const STORAGE_KEY = "aegis-operator";

export type OperatorIdentity = {
  email: string;
  createdAt: string;
};

export function readOperatorIdentity(): OperatorIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OperatorIdentity;
    if (!parsed.email?.includes("@")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function rememberOperator(email: string): OperatorIdentity {
  const identity: OperatorIdentity = {
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function clearOperatorIdentity(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function operatorDisplayName(email: string | undefined): string {
  if (!email) return "Unscoped";
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
