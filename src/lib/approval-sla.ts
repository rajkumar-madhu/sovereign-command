import type { Approval, RiskLevel } from "@/data/types";

/** Default minutes a pending approval may wait before the dual-control SLA is breached. */
export const SLA_MINUTES: Record<RiskLevel, number> = {
  critical: 30,
  high: 60,
  medium: 240,
  low: 480,
};

/** Default fraction of the SLA window consumed before an approval is flagged at risk. */
export const AT_RISK_RATIO = 0.7;

export const RISK_LEVELS: RiskLevel[] = ["critical", "high", "medium", "low"];

/** Hard validation bounds enforced by the SLA administration UI. */
export const SLA_MINUTES_MIN = 5;
export const SLA_MINUTES_MAX = 1440;
export const AT_RISK_PCT_MIN = 25;
export const AT_RISK_PCT_MAX = 95;

export interface SlaConfig {
  /** Fleet-wide default SLA window per risk level, in minutes. */
  defaults: Record<RiskLevel, number>;
  /** Percentage of the window consumed before an approval is flagged at risk. */
  atRiskPct: number;
  /** Per-tenant overrides; each tenant may override any subset of risk levels. */
  tenantOverrides: Record<string, Partial<Record<RiskLevel, number>>>;
}

export const defaultSlaConfig: SlaConfig = {
  defaults: { ...SLA_MINUTES },
  atRiskPct: AT_RISK_RATIO * 100,
  tenantOverrides: {
    "tn-nordic": { critical: 20, high: 45 },
    "tn-helios": { critical: 25 },
  },
};

export interface SlaAuditEntry {
  id: string;
  time: string;
  actor: string;
  scope: string;
  field: string;
  from: string;
  to: string;
  outcome: string;
}

/** Resolves the effective SLA window for a tenant + risk level. */
export function resolveSlaMinutes(config: SlaConfig, tenantId: string, risk: RiskLevel): number {
  return config.tenantOverrides[tenantId]?.[risk] ?? config.defaults[risk];
}

export type SlaState = "breached" | "at-risk" | "on-track";

export interface ApprovalSla {
  approval: Approval;
  targetMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  consumedPct: number;
  state: SlaState;
  overridden: boolean;
}

export function evaluateApprovalSla(
  approval: Approval,
  nowMs: number,
  config: SlaConfig = defaultSlaConfig,
): ApprovalSla {
  const targetMinutes = resolveSlaMinutes(config, approval.tenantId, approval.risk);
  const overridden = config.tenantOverrides[approval.tenantId]?.[approval.risk] !== undefined;
  const elapsedMinutes = Math.max(0, (nowMs - Date.parse(approval.requestedAt)) / 60000);
  const remainingMinutes = targetMinutes - elapsedMinutes;
  const consumedPct = Math.min(100, (elapsedMinutes / targetMinutes) * 100);
  const state: SlaState =
    remainingMinutes <= 0 ? "breached" : consumedPct >= config.atRiskPct ? "at-risk" : "on-track";
  return { approval, targetMinutes, elapsedMinutes, remainingMinutes, consumedPct, state, overridden };
}

export function slaTone(state: SlaState): "danger" | "warning" | "success" {
  return state === "breached" ? "danger" : state === "at-risk" ? "warning" : "success";
}

export function slaLabel(state: SlaState): string {
  return state === "breached" ? "SLA breached" : state === "at-risk" ? "SLA at risk" : "On track";
}

/** Validates a proposed SLA window. Returns an error message, or null when valid. */
export function validateSlaMinutes(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter a value in minutes.";
  if (!/^\d+$/.test(trimmed)) return "Use whole minutes only (digits, no decimals).";
  const value = Number(trimmed);
  if (value < SLA_MINUTES_MIN) return `Minimum is ${SLA_MINUTES_MIN} minutes — approvers need time to respond.`;
  if (value > SLA_MINUTES_MAX) return `Maximum is ${SLA_MINUTES_MAX} minutes (24h).`;
  return null;
}

/** Ensures escalation ordering: critical <= high <= medium <= low. */
export function validateRiskOrdering(defaults: Record<RiskLevel, number>): string | null {
  if (defaults.critical > defaults.high) return "Critical window must be at or below the high window.";
  if (defaults.high > defaults.medium) return "High window must be at or below the medium window.";
  if (defaults.medium > defaults.low) return "Medium window must be at or below the low window.";
  return null;
}

/** Renders a signed countdown such as "12m 04s left" or "8m 12s overdue". */
export function formatCountdown(remainingMinutes: number): string {
  const overdue = remainingMinutes < 0;
  const totalSeconds = Math.floor(Math.abs(remainingMinutes) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const core =
    hours > 0
      ? `${hours}h ${String(minutes).padStart(2, "0")}m`
      : `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return overdue ? `${core} overdue` : `${core} left`;
}

export function formatWindow(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
