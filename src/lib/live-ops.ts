import type { Customer, Policy, Tenant } from "@/data/types";
import type { ClusterSnapshot } from "@/lib/stage1-client";

/** Already-connected kubectl context. Do not mint a second kube client. */
export const LIVE_CLUSTER_TENANT_ID = "finspot-dev";

export const LIVE_TENANT_PLACEHOLDER: Tenant = {
  id: LIVE_CLUSTER_TENANT_ID,
  name: "Finspot-dev",
  region: "private",
  residency: "VPN",
  customers: 0,
  clusters: 1,
  agents: 0,
};

export function isLiveCluster(
  snapshot: ClusterSnapshot | null | undefined,
): snapshot is ClusterSnapshot {
  return snapshot?.source === "live-k8s";
}

export function liveTenantFromSnapshot(snapshot: ClusterSnapshot): Tenant {
  return {
    id: snapshot.cluster || LIVE_CLUSTER_TENANT_ID,
    name: snapshot.cluster || "Finspot-dev",
    region: "private",
    residency: "VPN",
    customers: snapshot.namespaces.length,
    clusters: 1,
    agents: snapshot.counts.pods,
  };
}

export function namespaceCustomerId(namespace: string): string {
  return `ns-${namespace}`;
}

export function liveCustomersFromSnapshot(snapshot: ClusterSnapshot): Customer[] {
  const tenantId = snapshot.cluster || LIVE_CLUSTER_TENANT_ID;
  return snapshot.namespaces.map((ns) => {
    const pods = snapshot.pods.filter((p) => p.namespace === ns);
    const bad = pods.filter(
      (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
    );
    const health =
      pods.length === 0
        ? 100
        : Math.round(((pods.length - bad.length) / pods.length) * 100);
    return {
      id: namespaceCustomerId(ns),
      name: ns,
      tenantId,
      industry: "Kubernetes namespace",
      contract: "silver",
      slaTarget: "read-only",
      clusters: 1,
      nodes: snapshot.counts.nodes,
      agents: pods.length,
      openIncidents: bad.length,
      health,
      monthlyCostUsd: 0,
      owner: `${snapshot.context || "kubectl"} · existing client`,
      onboarded: snapshot.generatedAt.slice(0, 10),
    };
  });
}

export function liveEstateScore(snapshot: ClusterSnapshot): number {
  return Math.max(
    0,
    Math.min(100, 100 - snapshot.counts.notReady * 8 - snapshot.counts.crashLoop * 12),
  );
}

export function liveHeatmap(customers: Customer[]): Array<{
  customer: string;
  cells: Array<{ env: string; score: number }>;
}> {
  return customers.map((c) => ({
    customer: c.name,
    cells: [{ env: "live", score: c.health }],
  }));
}

export function tenantsFromSnapshot(snapshot: ClusterSnapshot | null): Tenant[] {
  if (isLiveCluster(snapshot)) return [liveTenantFromSnapshot(snapshot)];
  return [];
}

export function customersFromSnapshot(snapshot: ClusterSnapshot | null): Customer[] {
  if (isLiveCluster(snapshot)) return liveCustomersFromSnapshot(snapshot);
  return [];
}

/** Sovereign read-only rules for the connected cluster — not seed demo tenants. */
export function livePolicies(cluster = LIVE_CLUSTER_TENANT_ID, generatedAt?: string): Policy[] {
  const scope = `${cluster} · all namespaces`;
  const lastEdited = generatedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return [
    {
      id: "POL-RO-001",
      name: "Secret and ConfigMap reads denied",
      description: "MCP k8s-read cannot fetch Secrets or ConfigMaps on the live cluster.",
      effect: "deny",
      approvers: [],
      enabled: true,
      scope,
      lastEdited,
    },
    {
      id: "POL-RO-002",
      name: "Kubernetes write and delete denied",
      description: "Create, patch, update and delete verbs stay blocked at the tool gateway.",
      effect: "deny",
      approvers: [],
      enabled: true,
      scope,
      lastEdited,
    },
    {
      id: "POL-RO-003",
      name: "Remediator held",
      description: "Any remediation intent requires dual control and never auto-executes.",
      effect: "require-approval",
      approvers: ["Platform SRE", "Security"],
      enabled: true,
      scope,
      lastEdited,
    },
    {
      id: "POL-RO-004",
      name: "Cluster inventory read allowed",
      description: "Read-only node, namespace, pod and warning-event inventory is permitted.",
      effect: "allow",
      approvers: [],
      enabled: true,
      scope,
      lastEdited,
    },
  ];
}

export function snapshotAgeLabel(generatedAt: string | undefined, nowMs: number): string {
  if (!generatedAt) return "offline";
  if (!nowMs) return "live";
  const ageSec = Math.max(0, Math.round((nowMs - Date.parse(generatedAt)) / 1000));
  if (!Number.isFinite(ageSec)) return "offline";
  if (ageSec < 60) return `${ageSec}s`;
  return `${Math.floor(ageSec / 60)}m ${ageSec % 60}s`;
}
