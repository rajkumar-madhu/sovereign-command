import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { customers, initialApprovals, initialPolicies, tenantName, tenants } from "@/data/seed";
import type { Approval, EnvName, Policy, RiskLevel } from "@/data/types";
import { defaultSlaConfig, type SlaAuditEntry, type SlaConfig } from "@/lib/approval-sla";
import {
  approversFor,
  TIER_ORDER,
  tierLabel,
  type EscalationEvent,
  type EscalationTier,
} from "@/lib/escalation";

interface OpsState {
  tenantId: string;
  customerId: string;
  environment: EnvName;
  setTenantId: (id: string) => void;
  setCustomerId: (id: string) => void;
  setEnvironment: (env: EnvName) => void;
  approvals: Approval[];
  decideApproval: (id: string, status: "approved" | "rejected") => void;
  decideApprovals: (ids: string[], status: "approved" | "rejected") => void;
  revertApprovals: (ids: string[]) => void;
  policies: Policy[];
  togglePolicy: (id: string) => void;
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
  agentStates: Record<string, "active" | "suspended" | "quarantined" | "terminated">;
  setAgentState: (id: string, state: "active" | "suspended" | "quarantined" | "terminated") => void;
  budgets: Record<string, number>;
  setBudget: (key: string, value: number) => void;
  slaConfig: SlaConfig;
  slaAuditLog: SlaAuditEntry[];
  setSlaDefault: (risk: RiskLevel, minutes: number, actor: string) => void;
  setAtRiskPct: (pct: number, actor: string) => void;
  setTenantSlaOverride: (tenantId: string, risk: RiskLevel, minutes: number | null, actor: string) => void;
  /** Current escalation tier per approval id (absent = primary rota). */
  escalationTiers: Record<string, EscalationTier>;
  /** Append-only notification history for every escalation page. */
  escalationLog: EscalationEvent[];
  /** Routes an approval to a higher tier. Returns false when already at or beyond that tier. */
  escalateApproval: (
    approval: Approval,
    tier: EscalationTier,
    reason: string,
    trigger: "auto" | "manual",
  ) => boolean;
  resetEscalation: (approvalId: string) => void;
}

const OpsCtx = createContext<OpsState | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string>(tenants[0]!.id);
  const [customerId, setCustomerId] = useState<string>("all");
  const [environment, setEnvironment] = useState<EnvName>("production");
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [agentStates, setAgentStates] = useState<OpsState["agentStates"]>({});
  const [budgets, setBudgets] = useState<Record<string, number>>({
    "tn-nordic": 24000,
    "tn-helios": 18000,
    "tn-meridian": 16000,
    "tn-atlas": 9000,
  });

  const [slaConfig, setSlaConfig] = useState<SlaConfig>(defaultSlaConfig);
  const [slaAuditLog, setSlaAuditLog] = useState<SlaAuditEntry[]>([]);
  const [escalationTiers, setEscalationTiers] = useState<Record<string, EscalationTier>>({});
  const [escalationLog, setEscalationLog] = useState<EscalationEvent[]>([]);

  function recordSlaAudit(entry: Omit<SlaAuditEntry, "id" | "time">) {
    setSlaAuditLog((prev) => [
      {
        id: `sla-${Date.now()}-${prev.length}`,
        time: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ]);
  }

  const value = useMemo<OpsState>(
    () => ({
      tenantId,
      customerId,
      environment,
      setTenantId: (id) => {
        setTenantId(id);
        setCustomerId("all");
      },
      setCustomerId,
      setEnvironment,
      approvals,
      decideApproval: (id, status) =>
        setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a))),
      decideApprovals: (ids, status) =>
        setApprovals((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, status } : a))),
      revertApprovals: (ids) =>
        setApprovals((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, status: "pending" } : a))),
      escalationTiers,
      escalationLog,
      escalateApproval: (approval, tier, reason, trigger) => {
        const current = escalationTiers[approval.id] ?? "primary";
        if (TIER_ORDER[tier] <= TIER_ORDER[current]) return false;
        const approvers = approversFor(approval, tier);
        setEscalationTiers((prev) => ({ ...prev, [approval.id]: tier }));
        setEscalationLog((prev) => [
          {
            id: `esc-${Date.now()}-${prev.length}`,
            approvalId: approval.id,
            request: approval.request,
            tenantId: approval.tenantId,
            time: new Date().toISOString(),
            tier,
            trigger,
            reason,
            approvers,
            outcome: `Paged ${approvers.map((a) => a.name).join(", ")} on ${tierLabel(tier).toLowerCase()}; dual control still required and no production change executed.`,
          },
          ...prev,
        ]);
        return true;
      },
      resetEscalation: (approvalId) =>
        setEscalationTiers((prev) => {
          const next = { ...prev };
          delete next[approvalId];
          return next;
        }),
      policies,
      togglePolicy: (id) =>
        setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))),
      updatePolicy: (id, patch) =>
        setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      agentStates,
      setAgentState: (id, state) => setAgentStates((prev) => ({ ...prev, [id]: state })),
      budgets,
      setBudget: (key, v) => setBudgets((prev) => ({ ...prev, [key]: v })),
      slaConfig,
      slaAuditLog,
      setSlaDefault: (risk, minutes, actor) => {
        const from = slaConfig.defaults[risk];
        setSlaConfig((prev) => ({ ...prev, defaults: { ...prev.defaults, [risk]: minutes } }));
        recordSlaAudit({
          actor,
          scope: "All tenants (default)",
          field: `${risk} approval SLA`,
          from: `${from}m`,
          to: `${minutes}m`,
          outcome: "Applied to live countdowns; no production change executed.",
        });
      },
      setAtRiskPct: (pct, actor) => {
        const from = slaConfig.atRiskPct;
        setSlaConfig((prev) => ({ ...prev, atRiskPct: pct }));
        recordSlaAudit({
          actor,
          scope: "All tenants (default)",
          field: "At-risk alert threshold",
          from: `${Math.round(from)}%`,
          to: `${Math.round(pct)}%`,
          outcome: "Alerting threshold updated for every pending approval.",
        });
      },
      setTenantSlaOverride: (tenantId, risk, minutes, actor) => {
        const from = slaConfig.tenantOverrides[tenantId]?.[risk];
        setSlaConfig((prev) => {
          const next = { ...(prev.tenantOverrides[tenantId] ?? {}) };
          if (minutes === null) delete next[risk];
          else next[risk] = minutes;
          const overrides = { ...prev.tenantOverrides };
          if (Object.keys(next).length === 0) delete overrides[tenantId];
          else overrides[tenantId] = next;
          return { ...prev, tenantOverrides: overrides };
        });
        recordSlaAudit({
          actor,
          scope: tenantName(tenantId),
          field: `${risk} approval SLA override`,
          from: from === undefined ? `inherited ${slaConfig.defaults[risk]}m` : `${from}m`,
          to: minutes === null ? `inherited ${slaConfig.defaults[risk]}m` : `${minutes}m`,
          outcome: minutes === null ? "Override removed; tenant inherits the default." : "Tenant override applied.",
        });
      },
    }),
    [
      tenantId,
      customerId,
      environment,
      approvals,
      policies,
      agentStates,
      budgets,
      slaConfig,
      slaAuditLog,
      escalationTiers,
      escalationLog,
    ],
  );

  return <OpsCtx.Provider value={value}>{children}</OpsCtx.Provider>;
}

export function useOps(): OpsState {
  const ctx = useContext(OpsCtx);
  if (!ctx) throw new Error("useOps must be used inside OpsProvider");
  return ctx;
}

export function tenantCustomers(tenantId: string) {
  return customers.filter((c) => c.tenantId === tenantId);
}