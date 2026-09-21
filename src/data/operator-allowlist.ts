/** Stage-1 operator allowlist — provisioned emails only (no password store). */

export const MIN_PASSWORD_LENGTH = 8;

/** Static allowlist. Optional: merge VITE_OPERATOR_ALLOWLIST (comma-separated) at runtime. */
export const OPERATOR_ALLOWLIST: readonly string[] = [
  "raj@wecrew.in",
  "rajkumar.madhu@finspot.in",
  "ingrid.halvorsen@nordicbank.example",
] as const;

function splitAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function envAllowlist(): string[] {
  const fromProcess =
    typeof process !== "undefined"
      ? process.env.AEGIS_OPERATOR_ALLOWLIST || process.env.VITE_OPERATOR_ALLOWLIST
      : undefined;
  try {
    const fromVite = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_OPERATOR_ALLOWLIST;
    return [...splitAllowlist(fromProcess), ...splitAllowlist(fromVite)];
  } catch {
    return splitAllowlist(fromProcess);
  }
}

export function isOperatorEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  const set = new Set([
    ...OPERATOR_ALLOWLIST.map((e) => e.toLowerCase()),
    ...envAllowlist(),
  ]);
  return set.has(normalized);
}
