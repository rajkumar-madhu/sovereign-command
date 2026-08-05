import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { customers, initialApprovals, initialPolicies, tenants } from "@/data/seed";
import type { Approval, EnvName, Policy } from "@/data/types";

interface OpsState {
  tenantId: string;
  customerId: string;
  environment: EnvName;
  setTenantId: (id: string) => void;
  setCustomerId: (id: string) => void;
  setEnvironment: (env: EnvName) => void;
  approvals: Approval[];
  decideApproval: (id: string, status: "approved" | "rejected") => void;
  policies: Policy[];
  togglePolicy: (id: string) => void;
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
  agentStates: Record<string, "active" | "suspended" | "quarantined" | "terminated">;
  setAgentState: (id: string, state: "active" | "suspended" | "quarantined" | "terminated") => void;
  budgets: Record<string, number>;
  setBudget: (key: string, value: number) => void;
}

const OpsCtx = createContext<OpsState | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? "all");
  const [customerId, setCustomerId] = useState<string>("all");
  const [environment, setEnvironment] = useState<EnvName>("production");
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [agentStates, setAgentStates] = useState<OpsState["agentStates"]>({});
  const [budgets, setBudgets] = useState<Record<string, number>>({});

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
      policies,
      togglePolicy: (id) =>
        setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))),
      updatePolicy: (id, patch) =>
        setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      agentStates,
      setAgentState: (id, state) => setAgentStates((prev) => ({ ...prev, [id]: state })),
      budgets,
      setBudget: (key, v) => setBudgets((prev) => ({ ...prev, [key]: v })),
    }),
    [tenantId, customerId, environment, approvals, policies, agentStates, budgets],
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