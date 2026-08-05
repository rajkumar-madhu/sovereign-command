/**
 * Platform data store.
 * Empty by default — no demo/synthetic records. Wire a real API later;
 * pages render empty states when these collections are empty.
 */
import type {
  Agent,
  AgentPassport,
  Approval,
  AuditEntry,
  Customer,
  GatewayDecision,
  Incident,
  McpTool,
  ModelProvider,
  Policy,
  SecurityEvent,
  Tenant,
  TimelineStep,
} from "./types";

export const tenants: Tenant[] = [];

export const customers: Customer[] = [];

export const agents: Agent[] = [];

export const passports: Record<string, AgentPassport> = {};

export const incidents: Incident[] = [];

export const incidentTimeline: TimelineStep[] = [];

export const rcaReport = {
  incidentId: "",
  title: "No RCA published",
  confidence: 0,
  risk: "low" as const,
  productionWriteRequired: false,
  rootCause: "",
  evidence: [] as string[],
  rejected: [] as string[],
  recommendation: "",
  owner: "",
};

export const securityEvents: SecurityEvent[] = [];

export const providers: ModelProvider[] = [];

export const mcpTools: McpTool[] = [];

export const initialPolicies: Policy[] = [];

export const auditLog: AuditEntry[] = [];

export const initialApprovals: Approval[] = [];

export const costByTenant: Array<{
  tenant: string;
  tokens: number;
  cost: number;
  budget: number;
}> = [];

export const costByModel: Array<{
  model: string;
  tokens: number;
  cost: number;
}> = [];

export const costByAgentKind: Array<{
  kind: string;
  tokens: number;
  cost: number;
}> = [];

export const costByIncident: Array<{
  incidentId: string;
  tokens: number;
  cost: number;
}> = [];

export const spendTrend: Array<{ day: string; tokens: number; cost: number }> = [];

export const incidentTrend: Array<{ day: string; opened: number; closed: number }> = [];

export const recurringIncidents: Array<{
  title: string;
  count: number;
  lastSeen: string;
}> = [];

export const heatmap: Array<{
  customer: string;
  cells: Array<{ env: string; score: number }>;
}> = [];

export const evidenceArtifacts: Array<{
  id: string;
  kind: string;
  title: string;
  collectedAt: string;
  source: string;
  body: string;
}> = [];

export const gatewayDecisions: GatewayDecision[] = [];

export function tenantName(id: string): string {
  return tenants.find((t) => t.id === id)?.name ?? id;
}
export function customerName(id: string): string {
  return customers.find((c) => c.id === id)?.name ?? id;
}
export function agentName(id: string): string {
  return agents.find((a) => a.id === id)?.name ?? id;
}
