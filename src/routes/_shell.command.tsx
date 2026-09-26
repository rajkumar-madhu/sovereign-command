import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Box,
  CircleAlert,
  Clock3,
  Layers3,
  Radio,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ops/status-badge";
import { commandOverview, snapshotFreshness } from "@/lib/command-overview";
import { snapshotAgeLabel } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/command")({
  head: () => ({
    meta: [
      { title: "Command Centre · Wecrew Ops" },
      {
        name: "description",
        content:
          "Tenant-scoped Kubernetes readiness, priority workloads, warning events and evidence in one read-only operations workspace.",
      },
    ],
  }),
  component: CommandCentre,
});

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
      <Radio className="mb-3 size-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function CommandCentre() {
  const ops = useOps();
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [showAllPods, setShowAllPods] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setShowAllPods(false);
  }, [ops.tenantId, ops.customerId]);

  const overview = commandOverview(ops.clusterSnapshot, ops.tenantId, ops.customerId);
  const snapshot = overview ? ops.clusterSnapshot : null;
  const freshness = snapshotFreshness(snapshot?.generatedAt, now);
  const sourceLabel = !overview
    ? "Unavailable"
    : freshness === "current"
      ? "Live snapshot"
      : freshness === "delayed"
        ? "Delayed snapshot"
        : "Freshness unknown";
  const namespaceLabel =
    ops.customerId === "all" ? "All namespaces" : ops.customerId.replace(/^ns-/, "");
  const namespaces =
    overview?.namespaces.filter(
      (item) =>
        item.name.toLowerCase().includes(query.trim().toLowerCase()) &&
        (!attentionOnly || item.attention > 0),
    ) ?? [];
  const attention = overview?.attention ?? [];
  const visiblePods = showAllPods ? attention : attention.slice(0, 6);
  const readyNodes = snapshot?.nodes.filter((node) => node.status === "Ready").length;
  const metrics = [
    {
      label: "Workloads to review",
      value: overview?.attention.length,
      detail: "Unready, failed or waiting pods",
      icon: TriangleAlert,
      alert: Boolean(overview?.attention.length),
      href: "#workload-attention",
    },
    {
      label: "Ready pods",
      value: overview ? `${overview.ready} / ${overview.active.length}` : undefined,
      detail: "Running and all containers ready",
      icon: Box,
      alert: false,
      href: "#namespace-health",
    },
    {
      label: "Crash loops",
      value: overview?.crashLoops,
      detail: "Repeated container failures",
      icon: Activity,
      alert: Boolean(overview?.crashLoops),
      href: "#workload-attention",
    },
    {
      label: "Warning events",
      value: overview?.warnings.length,
      detail: "Records in the current snapshot",
      icon: Radio,
      alert: false,
      href: "#warning-events",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <section
        aria-labelledby="command-title"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-brand-coral" aria-hidden="true" /> Operate /
            Overview
          </p>
          <h1
            id="command-title"
            className="font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Command Centre
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Know what needs attention. Follow the evidence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/logs">
              <Terminal className="size-4" aria-hidden="true" />
              Explore logs
            </Link>
          </Button>
          <Button asChild>
            <Link to="/investigations">
              Investigations
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-label="Current data scope"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <Layers3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="break-all font-medium">{ops.tenantId || "No tenant bound"}</span>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <span className="break-all text-muted-foreground">{namespaceLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <StatusPill
            tone={
              overview && freshness === "current" ? "success" : overview ? "warning" : "neutral"
            }
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {sourceLabel}
          </StatusPill>
          {snapshot && freshness !== "unknown" && (
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {snapshotAgeLabel(snapshot.generatedAt, now)} old
            </span>
          )}
          <span>{ops.tenantId ? "Polls every 15s" : "Access required"}</span>
        </div>
      </section>

      {!overview && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">Cluster data is unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ops.tenantId
                ? "Waiting for an authorized inventory snapshot. Metrics will appear when the connection is available."
                : "Bind a tenant access token in Settings to load your cluster inventory."}
            </p>
          </div>
        </div>
      )}
      {overview && freshness !== "current" && (
        <p
          role="status"
          className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
        >
          {freshness === "delayed"
            ? "This snapshot is more than a minute old."
            : "The snapshot timestamp could not be verified."}{" "}
          Treat the values below as the last reported state.
        </p>
      )}

      <section
        aria-label="Scoped workload metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <a
            key={metric.label}
            href={metric.href}
            aria-label={`${metric.label}: ${metric.value ?? "unavailable"}. View details`}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <metric.icon
                className={cn(
                  "size-4",
                  metric.alert ? "text-destructive" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
            </div>
            <p
              className={cn(
                "mt-4 font-mono text-3xl font-medium tracking-tight tabular-nums",
                metric.alert ? "text-destructive" : "text-foreground",
              )}
            >
              {metric.value ?? "—"}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {overview ? metric.detail : "Awaiting cluster data"}
            </p>
          </a>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section
          id="workload-attention"
          aria-labelledby="attention-title"
          className="scroll-mt-40 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="attention-title" className="font-display text-xl font-semibold">
                Needs attention{" "}
                <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">
                  {overview ? `(${attention.length})` : ""}
                </span>
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Crash loops first, then restart count. Open a namespace to investigate.
              </p>
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Read-only
            </span>
          </div>
          {!overview ? (
            <EmptyState
              title="Workload status unavailable"
              detail="A missing snapshot does not mean the estate is healthy."
            />
          ) : !attention.length ? (
            <EmptyState
              title="No workloads need attention"
              detail="All active pods in this scope report ready containers in the current snapshot."
            />
          ) : (
            <ul className="divide-y divide-border">
              {visiblePods.map((pod) => (
                <li key={`${pod.namespace}/${pod.name}`}>
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: `ns-${pod.namespace}` }}
                    className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        pod.crashLoop
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning-foreground dark:text-warning",
                      )}
                    >
                      <TriangleAlert className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="break-all font-mono text-xs font-medium">{pod.name}</p>
                        <StatusPill tone={pod.crashLoop ? "danger" : "warning"}>
                          {pod.crashLoop
                            ? "CrashLoopBackOff"
                            : pod.phase === "Running"
                              ? "Not ready"
                              : pod.phase}
                        </StatusPill>
                      </div>
                      <p className="mt-1.5 break-all text-xs text-muted-foreground">
                        {pod.namespace} · {pod.ready} ready · {pod.restarts} restarts
                        {pod.reason && !pod.crashLoop ? ` · ${pod.reason}` : ""}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {attention.length > 6 && (
            <div className="border-t border-border px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={showAllPods}
                onClick={() => setShowAllPods(!showAllPods)}
              >
                {showAllPods ? "Show fewer workloads" : `Show all ${attention.length} workloads`}
              </Button>
            </div>
          )}
        </section>

        <section
          id="warning-events"
          aria-labelledby="events-title"
          className="scroll-mt-40 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="border-b border-border px-5 py-4">
            <h2 id="events-title" className="font-display text-xl font-semibold">
              Warning events
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview
                ? `${overview.warnings.length} records in scope · snapshot order`
                : "Kubernetes events in the selected namespace scope"}
            </p>
          </div>
          {!overview ? (
            <EmptyState
              title="Events unavailable"
              detail="Waiting for a snapshot from the connected cluster."
            />
          ) : !overview.warnings.length ? (
            <EmptyState
              title="No warning events reported"
              detail="The current snapshot contains no warnings for this scope."
            />
          ) : (
            <ul className="divide-y divide-border">
              {overview.warnings.slice(0, 5).map((event, index) => (
                <li
                  key={`${event.namespace}/${event.object}/${event.reason}/${index}`}
                  className="px-5 py-3.5"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{event.reason}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                        {event.namespace} / {event.object}
                      </p>
                      <p
                        className="mt-1.5 line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground"
                        title={event.message}
                      >
                        {event.message}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border px-5 py-3">
            <Link
              to="/evidence"
              className="inline-flex items-center gap-2 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {overview && overview.warnings.length > 5
                ? `Showing 5 of ${overview.warnings.length} · Open evidence`
                : "Open evidence viewer"}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section
        id="namespace-health"
        aria-labelledby="namespace-title"
        className="scroll-mt-40 overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="namespace-title" className="font-display text-xl font-semibold">
              Namespace health
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Container readiness across active pods. Completed jobs are excluded.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-56">
              <Search
                className="absolute left-3 top-2.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Search namespaces"
                placeholder="Find a namespace…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-9"
              />
            </div>
            <Button
              variant={attentionOnly ? "default" : "outline"}
              size="sm"
              aria-pressed={attentionOnly}
              onClick={() => setAttentionOnly(!attentionOnly)}
            >
              Needs attention
            </Button>
          </div>
        </div>
        {!overview ? (
          <EmptyState
            title="Namespaces unavailable"
            detail="Namespace health will appear after an authorized snapshot is received."
          />
        ) : !namespaces.length ? (
          <EmptyState
            title="No matching namespaces"
            detail="Try another search or turn off the attention filter."
          />
        ) : (
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="Namespace readiness table"
            tabIndex={0}
          >
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead className="bg-muted/30 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Namespace
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ready / active
                  </th>
                  <th scope="col" className="w-1/4 px-4 py-3">
                    Readiness
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {namespaces.map((ns) => (
                  <tr key={ns.name} className="hover:bg-muted/25">
                    <th scope="row" className="px-5 py-4 font-medium">
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: `ns-${ns.name}` }}
                        className="inline-flex items-center gap-2 rounded-sm font-mono text-xs text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        {ns.name}
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      </Link>
                    </th>
                    <td className="px-4 py-4 font-mono text-xs tabular-nums">
                      {ns.ready} / {ns.active}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted"
                          aria-hidden="true"
                        >
                          <div
                            className={cn(
                              "h-full rounded-full",
                              ns.attention ? "bg-brand-coral" : "bg-success",
                            )}
                            style={{ width: `${ns.readiness ?? 0}%` }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-xs tabular-nums">
                          {ns.readiness === null ? "—" : `${ns.readiness}%`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <StatusPill
                        tone={ns.attention ? "warning" : ns.active ? "success" : "neutral"}
                      >
                        {ns.attention
                          ? `${ns.attention} to review`
                          : ns.active
                            ? "Ready"
                            : "No active pods"}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span>
            {overview
              ? `${namespaces.length} of ${overview.namespaces.length} namespaces in scope`
              : "No snapshot available"}
          </span>
          <Link
            to="/customers"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Browse namespaces
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="nodes-title"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h2 id="nodes-title" className="font-display text-xl font-semibold">
                Cluster nodes
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Cluster-wide inventory · not filtered by namespace
              </p>
            </div>
            <StatusPill tone="neutral">
              {snapshot ? `${readyNodes} / ${snapshot.nodes.length} ready` : "Unavailable"}
            </StatusPill>
          </div>
          {!snapshot ? (
            <EmptyState
              title="Node inventory unavailable"
              detail="Node readiness requires a connected cluster snapshot."
            />
          ) : !snapshot.nodes.length ? (
            <EmptyState
              title="No nodes reported"
              detail="The current snapshot contains no node records."
            />
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.nodes.map((node) => (
                <li key={node.name} className="flex items-center gap-3 px-5 py-3">
                  <Server className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-xs font-medium">{node.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {node.roles.join(", ") || "Worker"} · {node.version}
                    </p>
                  </div>
                  <StatusPill tone={node.status === "Ready" ? "success" : "warning"}>
                    {node.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby="governance-title"
          className="rounded-xl border border-border bg-card p-5"
        >
          <ShieldCheck className="mb-4 size-5 text-primary" aria-hidden="true" />
          <h2 id="governance-title" className="font-display text-xl font-semibold">
            Observe. Investigate. Govern.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Review operational evidence before taking action. This workspace presents read-only
            inventory; remediation stays held.
          </p>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Inventory source</dt>
              <dd>Kubernetes snapshot</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Access scope</dt>
              <dd>Tenant-bound</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Remediation</dt>
              <dd>Held</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/sovereign-control">
                Sovereign Control
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/approvals">Review approvals</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
