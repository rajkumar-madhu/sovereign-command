import type { ResourceIdentity } from "@/data/types";
import { customerName, tenantName } from "@/data/seed";

export interface LivePodStatus {
  name: string;
  tenantId: string;
  customerId?: string;
  application?: string;
  phase: string;
  source?: string;
  namespace: string;
  cluster?: string;
  nodeName?: string;
  hostIP?: string;
  podIP?: string;
  role?: string;
  image?: string;
  containerStatuses?: Array<{
    ready: boolean;
    restartCount: number;
    state?: { waiting?: { reason?: string } };
  }>;
  previousLogs?: string;
  resources?: {
    requests?: { cpu?: string; memory?: string };
    limits?: { cpu?: string; memory?: string };
  };
  recentEvents?: Array<{
    type: string;
    reason: string;
    message: string;
    lastTimestamp?: string;
    count?: number;
  }>;
}

export function parseLivePodStatus(body: string): LivePodStatus | null {
  try {
    const parsed = JSON.parse(body) as LivePodStatus;
    if (!parsed || typeof parsed !== "object" || typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function livePodFromEvidence(artifacts: Array<{ id: string; body: string }>): LivePodStatus | null {
  const row = artifacts.find((a) => a.id === "ev-clb-2");
  if (!row) return null;
  return parseLivePodStatus(row.body);
}

export function restartCount(pod: LivePodStatus): number {
  return Number(pod.containerStatuses?.[0]?.restartCount ?? 0);
}

export function podStatusLabel(pod: LivePodStatus): string {
  return pod.containerStatuses?.[0]?.state?.waiting?.reason ?? pod.phase;
}

export function mergeResourceIdentity(
  seed: ResourceIdentity | undefined,
  pod: LivePodStatus | null,
): ResourceIdentity | undefined {
  if (!seed && !pod) return undefined;
  const base = seed ?? {};
  if (!pod) return Object.keys(base).length ? base : undefined;
  return {
    ...base,
    application: pod.application ?? base.application,
    cluster: pod.cluster ?? base.cluster,
    namespace: pod.namespace ?? base.namespace,
    pod: pod.name ?? base.pod,
    nodeName: pod.nodeName ?? base.nodeName,
    ipAddress: pod.podIP ?? base.ipAddress,
    hostname: pod.nodeName ?? base.hostname,
    role: pod.role ?? base.role,
  };
}

export function formatPodContextHeader(
  pod: LivePodStatus,
  opts?: { customerLabel?: string; tenantLabel?: string },
): string {
  const restarts = restartCount(pod);
  const status = podStatusLabel(pod);
  const ready = pod.containerStatuses?.[0]?.ready ? "1/1" : "0/1";
  const customer = opts?.customerLabel ?? (pod.customerId ? customerName(pod.customerId) : "—");
  const tenant = opts?.tenantLabel ?? tenantName(pod.tenantId);
  const lines = [
    "# Identity",
    `application: ${pod.application ?? "payments-auth"}`,
    `client:      ${pod.customerId ?? "—"} (${customer})`,
    `tenant:      ${pod.tenantId} (${tenant})`,
    `cluster:     ${pod.cluster ?? "—"}`,
    `namespace:   ${pod.namespace}`,
    `node:        ${pod.nodeName ?? "—"}${pod.hostIP ? ` (${pod.hostIP})` : ""}`,
    ...(pod.podIP ? [`pod IP:      ${pod.podIP}`] : []),
    ...(pod.image ? [`image:       ${pod.image}`] : []),
    ...(pod.resources?.limits
      ? [`limits:      cpu=${pod.resources.limits.cpu ?? "—"} mem=${pod.resources.limits.memory ?? "—"}`]
      : []),
    "",
    "# Pod status (live)",
    "NAME                              READY   STATUS             RESTARTS   NODE",
    `${pod.name.padEnd(33)} ${ready.padEnd(7)} ${status.padEnd(18)} ${String(restarts).padEnd(10)} ${pod.nodeName ?? "—"}`,
  ];
  if (pod.recentEvents?.length) {
    lines.push("", "# Recent events");
    for (const e of pod.recentEvents.slice(0, 3)) {
      lines.push(
        `${e.lastTimestamp ?? "—"}  ${e.type}  ${e.reason}  ${e.message}`.slice(0, 140),
      );
    }
  }
  return lines.join("\n");
}

export function overlayTimelineLogs(
  stepId: string,
  seedLogs: string | undefined,
  pod: LivePodStatus | null,
): string | undefined {
  if (!pod || stepId !== "clb-s2") return seedLogs;
  const header = formatPodContextHeader(pod);
  const table = seedLogs?.trim() ? `\n\n${seedLogs.trim()}` : "";
  return `${header}${table}`;
}
