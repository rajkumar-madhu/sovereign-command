import type { Approval } from "@/data/types";

/** Escalation ladder for dual-control approvals: primary rota, named backup, then duty manager. */
export type EscalationTier = "primary" | "backup" | "duty-manager";

export const TIER_ORDER: Record<EscalationTier, number> = {
  primary: 0,
  backup: 1,
  "duty-manager": 2,
};

export interface Approver {
  name: string;
  role: string;
  channel: string;
}

/** Approver rota per required role: who is paged first, and who backs them up. */
export const APPROVER_ROSTER: Record<string, { primary: Approver; backup: Approver }> = {
  "DBA On-call": {
    primary: { name: "L. Petrova", role: "DBA On-call", channel: "PagerDuty · db-oncall" },
    backup: { name: "M. Okafor", role: "DBA On-call (backup)", channel: "PagerDuty · db-secondary" },
  },
  "Service Owner": {
    primary: { name: "R. Lindqvist", role: "Service Owner", channel: "Teams · svc-owners" },
    backup: { name: "A. Duarte", role: "Deputy Service Owner", channel: "Teams · svc-owners-backup" },
  },
  "Network Operations": {
    primary: { name: "T. Bergmann", role: "Network Operations", channel: "PagerDuty · netops" },
    backup: { name: "S. Ahmed", role: "Network Operations (backup)", channel: "PagerDuty · netops-secondary" },
  },
  "Security Engineering": {
    primary: { name: "K. Moreau", role: "Security Engineering", channel: "PagerDuty · secops" },
    backup: { name: "J. Weber", role: "Security Engineering (backup)", channel: "PagerDuty · secops-secondary" },
  },
  FinOps: {
    primary: { name: "H. Nakamura", role: "FinOps", channel: "Email · finops-approvals" },
    backup: { name: "C. Ellis", role: "FinOps (backup)", channel: "Teams · finops-escalation" },
  },
  "Platform Engineering": {
    primary: { name: "I. Halvorsen", role: "Platform Engineering", channel: "PagerDuty · platform" },
    backup: { name: "D. Rossi", role: "Platform Engineering (backup)", channel: "PagerDuty · platform-secondary" },
  },
};

export const DUTY_MANAGER: Approver = {
  name: "E. Vasquez",
  role: "Tenant Duty Manager",
  channel: "Phone bridge · sovereign-ops-duty",
};

function rosterFor(role: string) {
  return (
    APPROVER_ROSTER[role] ?? {
      primary: { name: "Rota holder", role, channel: "PagerDuty · general-approvals" },
      backup: { name: "Rota deputy", role: `${role} (backup)`, channel: "PagerDuty · general-secondary" },
    }
  );
}

/** Resolves who is paged for an approval at a given escalation tier. */
export function approversFor(approval: Approval, tier: EscalationTier): Approver[] {
  if (tier === "duty-manager") return [DUTY_MANAGER];
  return approval.requiredRoles.map((role) =>
    tier === "primary" ? rosterFor(role).primary : rosterFor(role).backup,
  );
}

export interface EscalationEvent {
  id: string;
  approvalId: string;
  request: string;
  tenantId: string;
  time: string;
  tier: EscalationTier;
  trigger: "auto" | "manual";
  reason: string;
  approvers: Approver[];
  outcome: string;
}

export function tierLabel(tier: EscalationTier): string {
  return tier === "primary" ? "Primary rota" : tier === "backup" ? "Backup approvers" : "Duty manager";
}

export function tierTone(tier: EscalationTier): "info" | "warning" | "danger" {
  return tier === "primary" ? "info" : tier === "backup" ? "warning" : "danger";
}
