import type { ExecutionTrace } from "@/data/types";

export type ClusterNodeRow = {
  name: string;
  status: string;
  roles: string[];
  version: string;
  internalIP?: string;
};

export type ClusterPodRow = {
  name: string;
  namespace: string;
  phase: string;
  ready: string;
  restarts: number;
  nodeName?: string;
  reason?: string;
  crashLoop: boolean;
};

export type ClusterEventRow = {
  namespace: string;
  type: string;
  reason: string;
  message: string;
  object: string;
  lastTimestamp?: string;
};

export type ClusterSnapshot = {
  source: "live-k8s" | "unavailable";
  remediator: "held";
  readOnly: true;
  cluster: string;
  context: string;
  generatedAt: string;
  tenantId: string;
  nodes: ClusterNodeRow[];
  namespaces: string[];
  pods: ClusterPodRow[];
  warningEvents: ClusterEventRow[];
  counts: {
    nodes: number;
    namespaces: number;
    pods: number;
    crashLoop: number;
    notReady: number;
  };
  error?: string;
};

export function stage1ApiBase(): string {
  const explicit = import.meta.env["VITE_STAGE1_API_URL"]?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "/stage1-api";
}

const ALLOWED_STAGE1_PATHS =
  /^\/(cluster\/(?:snapshot|logs)\?tenantId=[A-Za-z0-9_-]+(?:&namespace=[A-Za-z0-9._-]+)?(?:&pod=[A-Za-z0-9._-]+)?|executions\/exec-clb-01)$/;

async function stage1Get<T>(path: string): Promise<T | null> {
  const base = stage1ApiBase();
  if (!base || !ALLOWED_STAGE1_PATHS.test(path)) return null;
  try {
    const res = await fetch(`${base}${path}`, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function fetchClusterSnapshot(tenantId: string): Promise<ClusterSnapshot | null> {
  if (!tenantId) return Promise.resolve(null);
  return stage1Get<ClusterSnapshot>(`/cluster/snapshot?tenantId=${encodeURIComponent(tenantId)}`);
}

export type ContainerLogDump = {
  source: "live-k8s" | "unavailable";
  remediator: "held";
  readOnly: true;
  cluster: string;
  context: string;
  generatedAt: string;
  tenantId: string;
  namespace: string;
  pod: string;
  container?: string;
  tailLines: number;
  text: string;
  error?: string;
};

export function fetchContainerLogs(
  tenantId: string,
  selected?: { namespace?: string; pod?: string },
): Promise<ContainerLogDump | null> {
  if (!tenantId) return Promise.resolve(null);
  const params = new URLSearchParams({ tenantId });
  if (selected?.namespace) params.set("namespace", selected.namespace);
  if (selected?.pod) params.set("pod", selected.pod);
  return stage1Get<ContainerLogDump>(`/cluster/logs?${params.toString()}`);
}

export function fetchExecutionTrace(executionId: string): Promise<ExecutionTrace | null> {
  if (executionId !== "exec-clb-01") return Promise.resolve(null);
  return stage1Get<ExecutionTrace>("/executions/exec-clb-01");
}
