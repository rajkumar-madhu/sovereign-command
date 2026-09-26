import type { ClusterPodRow, ClusterSnapshot } from "@/lib/stage1-client";

export function podNeedsAttention(pod: ClusterPodRow): boolean {
  if (pod.crashLoop) return true;
  if (pod.phase === "Succeeded") return false;
  if (pod.phase !== "Running") return true;
  const match = /^(\d+)\/(\d+)$/.exec(pod.ready);
  return !match || Number(match[2]) === 0 || Number(match[1]) !== Number(match[2]);
}

/** Derive every workload metric from the same authorized namespace scope. */
export function commandOverview(
  snapshot: ClusterSnapshot | null,
  tenantId: string,
  customerId: string,
) {
  if (!tenantId || snapshot?.source !== "live-k8s" || snapshot.tenantId !== tenantId) return null;
  const namespace = customerId === "all" ? null : customerId.replace(/^ns-/, "");
  const pods = snapshot.pods.filter((pod) => !namespace || pod.namespace === namespace);
  const attention = pods
    .filter(podNeedsAttention)
    .sort(
      (a, b) =>
        Number(b.crashLoop) - Number(a.crashLoop) ||
        b.restarts - a.restarts ||
        a.name.localeCompare(b.name),
    );
  const active = pods.filter((pod) => pod.phase !== "Succeeded");
  const ready = active.filter((pod) => !podNeedsAttention(pod)).length;
  const warnings = snapshot.warningEvents.filter(
    (event) => !namespace || event.namespace === namespace,
  );
  const namespaces = snapshot.namespaces
    .filter((name) => !namespace || name === namespace)
    .map((name) => {
      const members = pods.filter((pod) => pod.namespace === name);
      const activeMembers = members.filter((pod) => pod.phase !== "Succeeded");
      const issues = members.filter(podNeedsAttention).length;
      const readyMembers = activeMembers.filter((pod) => !podNeedsAttention(pod)).length;
      return {
        name,
        total: members.length,
        active: activeMembers.length,
        attention: issues,
        ready: readyMembers,
        readiness: activeMembers.length
          ? Math.round((readyMembers / activeMembers.length) * 100)
          : null,
      };
    })
    .sort((a, b) => b.attention - a.attention || a.name.localeCompare(b.name));
  return {
    pods,
    active,
    ready,
    attention,
    warnings,
    namespaces,
    crashLoops: pods.filter((pod) => pod.crashLoop).length,
  };
}

export function snapshotFreshness(
  generatedAt: string | undefined,
  now: number,
): "current" | "delayed" | "unknown" {
  const timestamp = generatedAt ? Date.parse(generatedAt) : NaN;
  if (!now || !Number.isFinite(timestamp) || timestamp > now + 5_000) return "unknown";
  return now - timestamp > 60_000 ? "delayed" : "current";
}
