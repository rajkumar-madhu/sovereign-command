import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, ShieldAlert, Siren, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { ClusterInventoryPanel } from "@/components/ops/cluster-inventory-panel";
import { StatusPill, toneForScore, toneForStatus } from "@/components/ops/status-badge";
import { isLiveCluster, liveEstateScore, liveHeatmap, snapshotAgeLabel } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";

export const Route = createFileRoute("/_shell/command")({
  head: () => ({
    meta: [
      { title: "Global Command Centre · Wecrew Ops" },
      {
        name: "description",
        content:
          "Cross-tenant command centre for agent fleet health, incidents, SLA risk, security signals and token spend across regulated hybrid infrastructure.",
      },
      { property: "og:title", content: "Global Command Centre · Wecrew Ops" },
      {
        property: "og:description",
        content:
          "Fleet health, incidents, SLA risk, security signals and token spend in one console.",
      },
    ],
  }),
  component: CommandCentre,
});

function heatTone(score: number) {
  if (score >= 92) return "bg-success/20 text-success";
  if (score >= 82) return "bg-primary/15 text-primary";
  if (score >= 70) return "bg-warning/25 text-warning-foreground";
  return "bg-destructive/15 text-destructive";
}

function CommandCentre() {
  const ops = useOps();
  const cluster = ops.clusterSnapshot;
  const snapshotAge = snapshotAgeLabel(cluster?.generatedAt, Date.now());
  const pipelineStatus = isLiveCluster(cluster) ? ("healthy" as const) : ("degraded" as const);
  const scopedCustomers = ops.customers.filter(
    (c) => c.tenantId === ops.tenantId && (ops.customerId === "all" || c.id === ops.customerId),
  );
  const liveCluster = isLiveCluster(cluster);
  const nodes = liveCluster ? cluster.counts.nodes : 0;
  const clusters = liveCluster ? 1 : 0;
  const scopedPods = liveCluster
    ? cluster.pods.filter((p) => ops.customerId === "all" || p.namespace === ops.customerId.replace(/^ns-/, ""))
    : [];
  const problemPods = scopedPods.filter(
    (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
  );
  const crashLoop = scopedPods.filter((p) => p.crashLoop).length;
  const notReady = liveCluster
    ? ops.customerId === "all"
      ? cluster.counts.notReady
      : problemPods.length
    : 0;
  const pending = ops.approvals.filter(
    (a) => a.status === "pending" && a.tenantId === ops.tenantId,
  ).length;
  const estateScore = liveCluster ? liveEstateScore(cluster) : 0;
  const heatmap = liveHeatmap(scopedCustomers);
  const warningEvents = liveCluster ? cluster.warningEvents.slice(0, 8) : [];
  const eventReasons = warningEvents.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.reason] = (acc[ev.reason] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* First viewport: one composition — estate pulse, not a metric dashboard */}
      <section
        aria-label="Estate command pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-white/10"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-coral/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-brand-blue/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-6 md:p-8">
          <div className="max-w-2xl space-y-4 animate-rise-in">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Platform · scoped estate
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-[#f4f1ea] md:text-4xl">
              Command Centre
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[#f4f1ea]/75">
              Read-only Finspot-dev inventory from the existing kubectl client. Seed demo tenants
              are not loaded. No autonomous remediation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                asChild
                className="bg-[#f4f1ea] text-brand-ink hover:bg-white"
              >
                <Link to="/customers">
                  <Siren className="size-4" aria-hidden="true" />
                  Open live namespaces
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-[#141820]/70 text-[#f4f1ea] hover:bg-[#1a1f28]"
              >
                <Link to="/evidence">
                  Evidence / logs
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-3 animate-rise-in [animation-delay:120ms]">
            <div className="rounded-xl border border-white/12 bg-[#141820]/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#f4f1ea]/60">
                Health
              </p>
              <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-[#f4f1ea]">
                {estateScore}
              </p>
              <p className="text-xs text-[#f4f1ea]/55">estate index</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-[#141820]/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#f4f1ea]/60">
                Not ready
              </p>
              <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-[#ff5b2e]">
                {notReady}
              </p>
              <p className="text-xs text-[#f4f1ea]/55">pods / nodes</p>
            </div>
            <div className="rounded-xl border border-white/12 bg-[#141820]/80 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#f4f1ea]/60">
                Pods
              </p>
              <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-[#f4f1ea]">
                {scopedPods.length}
              </p>
              <p className="text-xs text-[#f4f1ea]/55">{crashLoop} crashloop</p>
            </div>
          </div>
        </div>
      </section>

      <SafetyBanner />

      <ClusterInventoryPanel snapshot={cluster} />

      {/* MELT-style signal strip: Metrics · Events · Logs · Traces */}
      <section aria-label="Observability signals" className="ops-panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-sm font-semibold">Observability signals</h2>
          <span className="text-xs text-muted-foreground">
            Metrics · events · log pipelines · traces — unified fleet view
          </span>
        </div>
        <ul className="grid divide-y divide-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 xl:grid-cols-8">
          {[
            { label: "Nodes", value: nodes, hint: liveCluster ? "live k8s" : "offline" },
            { label: "Clusters", value: clusters, hint: liveCluster ? cluster.cluster : "offline" },
            { label: "Namespaces", value: scopedCustomers.length, hint: "clients" },
            { label: "Pods", value: scopedPods.length, hint: "workloads" },
            {
              label: "Attention",
              value: problemPods.length,
              tone: "danger" as const,
              hint: "events",
            },
            {
              label: "CrashLoop",
              value: crashLoop,
              tone: "warning" as const,
              hint: "events",
            },
            { label: "Warnings", value: warningEvents.length, hint: "k8s" },
            { label: "Approvals", value: pending, tone: "warning" as const, hint: "gates" },
          ].map((s) => (
            <li key={s.label} className="px-4 py-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={`font-display mt-1 text-xl font-semibold tabular-nums ${
                  s.tone === "danger"
                    ? "text-destructive"
                    : s.tone === "warning"
                      ? "text-warning-foreground"
                      : "text-foreground"
                }`}
              >
                {s.value}
              </p>
              {s.hint && (
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/80">
                  {s.hint}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5" aria-labelledby="pipeline-title">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 id="pipeline-title" className="font-display text-lg font-semibold tracking-tight">
                Telemetry pipeline
              </h2>
              <p className="text-sm text-muted-foreground">
                Collectors forward structured container logs from agent sidecars — ops pattern
                analogous to Fluent Bit DaemonSets tailing{" "}
                <span className="font-mono text-xs">/var/log/containers/*.log</span>.
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {[
              {
                name: "Log collectors (DaemonSet)",
                detail: liveCluster ? `${cluster.counts.nodes} nodes` : "offline",
                status: liveCluster ? ("healthy" as const) : ("degraded" as const),
              },
              {
                name: "Structured JSON parse",
                detail: "cri-o · containerd",
                status: "healthy" as const,
              },
              { name: "Export endpoint", detail: "EU residency", status: "healthy" as const },
              {
                name: "Inventory snapshot",
                detail: liveCluster ? `${snapshotAge} · k8s poll` : "offline",
                status: pipelineStatus,
              },
            ].map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{row.detail}</p>
                </div>
                <StatusPill tone={toneForStatus(row.status)}>{row.status}</StatusPill>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link to="/evidence">Open evidence / log viewer</Link>
          </Button>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-labelledby="nodes-title-top">
          <div className="mb-4">
            <h2 id="nodes-title-top" className="font-display text-lg font-semibold tracking-tight">
              Cluster nodes
            </h2>
            <p className="text-sm text-muted-foreground">
              Ready status from the existing Finspot-dev kube context
            </p>
          </div>
          <div className="space-y-3">
            {(liveCluster ? cluster.nodes : []).map((node) => (
              <div
                key={node.name}
                className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">{node.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {node.roles.join(", ")}
                    {node.internalIP ? ` · ${node.internalIP}` : ""}
                  </p>
                </div>
                <StatusPill tone={node.status === "Ready" ? "success" : "danger"}>
                  {node.status}
                </StatusPill>
              </div>
            ))}
            {!liveCluster && (
              <p className="text-sm text-muted-foreground">No live node inventory yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4">
        <section className="ops-panel min-w-0 rounded-2xl p-5" aria-labelledby="heatmap-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="heatmap-title" className="font-display text-lg font-semibold tracking-tight">
                Namespace health
              </h2>
              <p className="text-sm text-muted-foreground">
                Running vs attention pods on Finspot-dev — no seed estates
              </p>
            </div>
            <Activity className="size-4 text-primary/70" aria-hidden="true" />
          </div>
          {heatmap.length === 0 ? (
            <p className="text-sm text-muted-foreground">Waiting for live namespaces.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase">
                    <th scope="col" className="pb-2 font-medium">
                      Namespace
                    </th>
                    <th scope="col" className="pb-2 font-medium">
                      live
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row) => (
                    <tr key={row.customer} className="border-t border-border/80">
                      <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                        {row.customer}
                      </th>
                      {row.cells.map((cell) => (
                        <td key={cell.env} className="py-2.5 pr-3">
                          <span
                            className={`inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums ${heatTone(cell.score)}`}
                          >
                            {cell.score}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5" aria-labelledby="active-incidents-title">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            <div>
              <h2
                id="active-incidents-title"
                className="font-display text-lg font-semibold tracking-tight"
              >
                Attention pods
              </h2>
              <p className="text-sm text-muted-foreground">CrashLoop or non-running workloads</p>
            </div>
          </div>
          <div className="space-y-3">
            {problemPods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attention pods on the live cluster.</p>
            ) : (
              problemPods.slice(0, 12).map((pod) => (
                <Link
                  key={`${pod.namespace}/${pod.name}`}
                  to="/customers/$customerId"
                  params={{ customerId: `ns-${pod.namespace}` }}
                  className="block rounded-xl border border-border/80 bg-background/40 p-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm font-medium">
                      {pod.namespace}/{pod.name}
                    </p>
                    <StatusPill tone={pod.crashLoop ? "danger" : "warning"}>{pod.phase}</StatusPill>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {pod.reason ?? "n/a"} · restarts {pod.restarts}
                    {pod.nodeName ? ` · ${pod.nodeName}` : ""}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-labelledby="patterns-title">
          <h2 id="patterns-title" className="font-display text-lg font-semibold tracking-tight">
            Warning events
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Live Kubernetes warning reasons</p>
          <div className="space-y-3">
            {Object.keys(eventReasons).length === 0 ? (
              <p className="text-sm text-muted-foreground">No warning events in the snapshot.</p>
            ) : (
              Object.entries(eventReasons).map(([reason, count]) => (
                <div
                  key={reason}
                  className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium">{reason}</p>
                    <p className="text-xs text-muted-foreground">Finspot-dev</p>
                  </div>
                  <StatusPill tone={toneForScore(100 - count * 8)}>{count}x</StatusPill>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
