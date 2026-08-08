export type Severity = "P1" | "P2" | "P3" | "P4";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AgentStatus = "active" | "degraded" | "suspended" | "quarantined" | "terminated";
export type Autonomy = "read-only" | "advisory" | "supervised" | "guarded";
export type EnvName = "production" | "staging" | "dev" | "dr";

export interface Tenant {
  id: string;
  name: string;
  region: string;
  residency: string;
  customers: number;
  clusters: number;
  agents: number;
}

export interface Customer {
  id: string;
  name: string;
  tenantId: string;
  industry: string;
  contract: "platinum" | "gold" | "silver";
  slaTarget: string;
  clusters: number;
  nodes: number;
  agents: number;
  openIncidents: number;
  health: number;
  monthlyCostUsd: number;
  owner: string;
  onboarded: string;
}

/** Structured host / network / workload identity for SRE & platform views. */
export interface ResourceIdentity {
  /** Business or service name operators recognize. */
  application?: string;
  /** Node or VM hostname. */
  hostname?: string;
  /** Primary IPv4/IPv6 on the affected interface. */
  ipAddress?: string;
  /** Kubernetes / estate cluster name. */
  cluster?: string;
  namespace?: string;
  pod?: string;
  /** Node name when distinct from hostname. */
  nodeName?: string;
  /** External or internal FQDN / endpoint. */
  fqdn?: string;
  region?: string;
  /** Optional role label: worker, control-plane, edge, db, gateway. */
  role?: string;
}

export interface Agent {
  id: string;
  name: string;
  kind: string;
  status: AgentStatus;
  trustScore: number;
  autonomy: Autonomy;
  model: string;
  tenantId: string;
  customerId: string;
  environment: EnvName;
  owner: string;
  lastActive: string;
  executions24h: number;
  successRate: number;
  tokens30d: number;
  cost30dUsd: number;
  riskLevel: RiskLevel;
  description: string;
  /** Where this agent runtime is scheduled. */
  runtime?: ResourceIdentity;
}

export interface EvidenceArtifact {
  id: string;
  name: string;
  kind: string;
  collected: string;
  hash: string;
  body: string;
  incidentId?: string;
  /** Capture locus — host/IP/cluster for platform triage. */
  resource?: ResourceIdentity;
}

export interface AgentPassport {
  agentId: string;
  identity: string;
  issuer: string;
  signature: "valid" | "expiring" | "invalid";
  signatureAlg: string;
  issuedAt: string;
  expiresAt: string;
  allowedTools: string[];
  blockedActions: string[];
  maxSteps: number;
  tokenBudget: number;
  tokensUsed: number;
  costBudgetUsd: number;
  costUsedUsd: number;
}

export interface SecurityEvent {
  id: string;
  time: string;
  category:
    | "prompt-injection"
    | "secret-access"
    | "cross-tenant"
    | "malicious-mcp"
    | "token-anomaly"
    | "loop-detection"
    | "failed-action";
  severity: Severity;
  agentId: string;
  tenantId: string;
  detail: string;
  action: "blocked" | "quarantined" | "flagged" | "allowed-with-audit";
  /** Runtime host / IP when the event was observed. */
  resource?: ResourceIdentity;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: "open" | "investigating" | "rca-ready" | "closed";
  tenantId: string;
  customerId: string;
  environment: EnvName;
  opened: string;
  slaRisk: boolean;
  assignedAgent: string;
  summary: string;
  recurrence: number;
  /** Primary affected application / service name. */
  application?: string;
  /** Affected hosts, pods, endpoints — first-class for SRE triage. */
  resources?: ResourceIdentity[];
}

export interface TimelineMetricPoint {
  t: string;
  cpu?: number;
  mem?: number;
  disk?: number;
  pullErrors?: number;
  bytesMb?: number;
  rst?: number;
}

export interface TimelineStep {
  id: string;
  label: string;
  phase: string;
  status: "verified" | "anomaly" | "rejected" | "info";
  /** Clock time within the incident day (legacy display). */
  time: string;
  /** Full ISO timestamp for the step. */
  at: string;
  detail: string;
  /** Longer formation / investigator notes. */
  formation?: string;
  evidence?: string[];
  /** Raw log excerpt captured for this step. */
  logs?: string;
  /** Optional load / error series for inline charts. */
  series?: TimelineMetricPoint[];
  seriesLabel?: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "offline";
  latencyMs: number;
  residency: string;
  costTier: "low" | "medium" | "high";
  fallbackOrder: number;
  allowedTenants: string[];
  models: string[];
  errorRate: number;
}

export interface McpTool {
  id: string;
  name: string;
  owner: string;
  version: string;
  permissions: string[];
  scan: "passed" | "warning" | "failed";
  calls30d: number;
  errors30d: number;
  externalAccess: boolean;
  trustScore: number;
  transport: string;
  lastScanned: string;
  notes: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  effect: "require-approval" | "deny" | "allow" | "time-window";
  approvers: string[];
  enabled: boolean;
  scope: string;
  lastEdited: string;
}

export interface AuditEntry {
  id: string;
  correlationId: string;
  time: string;
  user: string;
  agentId: string;
  tenantId: string;
  tool: string;
  action: string;
  decision: "allowed" | "denied" | "approval-required";
  outcome: string;
}

export interface Approval {
  id: string;
  request: string;
  agentId: string;
  tenantId: string;
  requestedBy: string;
  requiredRoles: string[];
  risk: RiskLevel;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}
export interface GatewayDecision {
  id: string;
  correlationId: string;
  time: string;
  tenantId: string;
  agentId: string;
  requestedModel: string;
  chosenProvider: string;
  chosenModel: string;
  decision: "routed" | "fallback" | "blocked";
  fallbackFrom?: string;
  reason: string;
  residency: string;
  latencyMs: number;
  tokens: number;
  outcome: string;
}
