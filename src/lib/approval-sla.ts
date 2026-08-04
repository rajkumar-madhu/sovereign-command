import type { Approval, RiskLevel } from "@/data/types";

/** Minutes a pending approval may wait before the dual-control SLA is breached. */
export const SLA_MINUTES: Record<RiskLevel, number> = {
  critical: 30,
  high: 60,
  medium: 240,
  low: 480,
};

/** Fraction of the SLA window consumed before an approval is flagged at risk. */
export const AT_RISK_RATIO = 0.7;

export type SlaState = "breached" | "at-risk" | "on-track";

export interface ApprovalSla {
  approval: Approval;
  targetMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  consumedPct: number;
  state: SlaState;
}

export function evaluateApprovalSla(approval: Approval, nowMs: number): ApprovalSla {
  const targetMinutes = SLA_MINUTES[approval.risk];
  const elapsedMinutes = Math.max(0, (nowMs - Date.parse(approval.requestedAt)) / 60000);
  const remainingMinutes = targetMinutes - elapsedMinutes;
  const consumedPct = Math.min(100, (elapsedMinutes / targetMinutes) * 100);
  const state: SlaState =
    remainingMinutes <= 0 ? "breached" : consumedPct >= AT_RISK_RATIO * 100 ? "at-risk" : "on-track";
  return { approval, targetMinutes, elapsedMinutes, remainingMinutes, consumedPct, state };
}

export function slaTone(state: SlaState): "danger" | "warning" | "success" {
  return state === "breached" ? "danger" : state === "at-risk" ? "warning" : "success";
}

export function slaLabel(state: SlaState): string {
  return state === "breached" ? "SLA breached" : state === "at-risk" ? "SLA at risk" : "On track";
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
