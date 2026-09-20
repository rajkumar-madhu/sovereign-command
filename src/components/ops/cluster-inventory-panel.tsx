import { Server } from "lucide-react";
import { StatusPill } from "@/components/ops/status-badge";
import type { ClusterSnapshot } from "@/lib/stage1-client";

export function ClusterInventoryPanel({ snapshot }: { snapshot: ClusterSnapshot | null }) {
  if (!snapshot || snapshot.source !== "live-k8s") {
    return (
      <section className="ops-panel rounded-2xl p-5" aria-labelledby="cluster-live-title">
        <div className="mb-2 flex items-center gap-2">
          <Server className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="cluster-live-title" className="font-display text-lg font-semibold tracking-tight">
            Live Kubernetes
          </h2>
          <StatusPill tone="neutral">connecting</StatusPill>
        </div>
        <p className="text-sm text-muted-foreground">
          Waiting for the existing Finspot-dev kubectl context. No seed client data is shown.
          {snapshot?.error ? (
            <span className="mt-2 block font-mono text-xs text-destructive">{snapshot.error}</span>
          ) : null}
        </p>
      </section>
    );
  }

  const problemPods = snapshot.pods.filter(
    (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
  );

  return (
    <section className="ops-panel rounded-2xl p-5" aria-labelledby="cluster-live-title">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Server className="size-4 text-brand-coral" aria-hidden="true" />
        <h2 id="cluster-live-title" className="font-display text-lg font-semibold tracking-tight">
          Live Kubernetes
        </h2>
        <StatusPill tone="success">read-only</StatusPill>
        <span className="font-mono text-[11px] text-muted-foreground">
          {snapshot.cluster} · {snapshot.context || "current"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Nodes", value: snapshot.counts.nodes },
          { label: "Namespaces", value: snapshot.counts.namespaces },
          { label: "Not ready", value: snapshot.counts.notReady, danger: true },
          { label: "CrashLoop", value: snapshot.counts.crashLoop, danger: true },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border/70 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </p>
            <p
              className={`font-display mt-1 text-xl font-semibold tabular-nums ${
                item.danger && item.value > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Nodes
          </h3>
          <ul className="space-y-1.5">
            {snapshot.nodes.map((node) => (
              <li
                key={node.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="font-mono text-xs font-medium">{node.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {node.roles.join(", ")}
                    {node.internalIP ? ` · ${node.internalIP}` : ""}
                  </p>
                </div>
                <StatusPill tone={node.status === "Ready" ? "success" : "danger"}>
                  {node.status}
                </StatusPill>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Attention pods
          </h3>
          {problemPods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No CrashLoop or non-running pods.</p>
          ) : (
            <ul className="space-y-1.5">
              {problemPods.slice(0, 8).map((pod) => (
                <li
                  key={`${pod.namespace}/${pod.name}`}
                  className="rounded-lg border border-border/60 px-3 py-2"
                >
                  <p className="font-mono text-xs font-medium">
                    {pod.namespace}/{pod.name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {pod.phase}
                    {pod.reason ? ` · ${pod.reason}` : ""} · restarts {pod.restarts}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
