import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowUpRight, ShieldAlert, Siren, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { LiveTelemetryDashboard } from "@/components/ops/live-telemetry-dashboard";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { useOps } from "@/lib/ops-context";
import {
  agents,
  customerName,
  customers,
  heatmap,
  incidentTrend,
  incidents,
  providers,
  recurringIncidents,
  securityEvents,
  spendTrend,
} from "@/data/seed";

export const Route = createFileRoute("/_shell/command")({
  head: () => ({
    meta: [
      { title: "Global Command Centre · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Cross-tenant command centre for agent fleet health, incidents, SLA risk, security signals and token spend across regulated hybrid infrastructure.",
      },
      { property: "og:title", content: "Global Command Centre · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Fleet health, incidents, SLA risk, security signals and token spend in one console.",
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
  const live = useLiveTelemetry(true);
  const pipelineLag = (0.6 + (live.latest.latencyMs / 400) * 1.4).toFixed(1);
  const pipelineStatus =
    Number(pipelineLag) >= 3 ? ("degraded" as const) : ("healthy" as const);
  const nodes = customers.reduce((s, c) => s + c.nodes, 0);
  const clusters = customers.reduce((s, c) => s + c.clusters, 0);
  const highRisk = agents.filter((a) => a.riskLevel === "high" || a.riskLevel === "critical").length;
  const openIncidents = incidents.filter((i) => i.status !== "closed");
  const p1 = openIncidents.filter((i) => i.severity === "P1");
  const p2 = openIncidents.filter((i) => i.severity === "P2").length;
  const slaRisks = openIncidents.filter((i) => i.slaRisk).length;
  const injections = securityEvents.filter((e) => e.category === "prompt-injection").length;
  const pending = ops.approvals.filter((a) => a.status === "pending").length;
  const primaryIncident = p1[0] ?? openIncidents[0];
  const estateScore = Math.round(
    heatmap.reduce((s, row) => s + row.cells.reduce((a, c) => a + c.score, 0) / row.cells.length, 0) /
      heatmap.length,
  );

  return (
    <div className="space-y-8">
      {/* First viewport: one composition — estate pulse, not a metric dashboard */}
      <section
        aria-label="Estate command pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.55]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-coral/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-8 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4 animate-rise-in">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Unified observability plane
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-4xl">
              Global Command Centre
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-sidebar-foreground/70">
              See metrics, events, logs and traces for the agent fleet in one place — then dig into
              evidence when something breaks. Read-only; no autonomous remediation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white">
                <Link to="/incidents/$incidentId" params={{ incidentId: primaryIncident?.id ?? "inc-4821" }}>
                  <Siren className="size-4" aria-hidden="true" />
                  Open active P1
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/evidence">
                  Evidence / logs
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid w-full max-w-md grid-cols-3 gap-3 animate-rise-in [animation-delay:120ms]">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">Health</p>
              <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-sidebar-accent-foreground">
                {estateScore}
              </p>
              <p className="text-xs text-sidebar-foreground/55">estate index</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">P1 open</p>
              <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-destructive">
                {p1.length}
              </p>
              <p className="text-xs text-sidebar-foreground/55">escalated</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">Agents</p>
              <p className="font-display mt-1 text-3xl font-semibold tabular-nums text-sidebar-accent-foreground">
                {agents.length}
              </p>
              <p className="text-xs text-sidebar-foreground/55">{highRisk} high-risk</p>
            </div>
          </div>
        </div>
      </section>

      <SafetyBanner />

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
            { label: "Nodes", value: nodes, hint: "infra" },
            { label: "Clusters", value: clusters, hint: "infra" },
            { label: "Agents", value: agents.length, hint: "APM" },
            { label: "Error events", value: injections + p2, tone: "danger" as const, hint: "events" },
            { label: "P2", value: p2, tone: "warning" as const, hint: "events" },
            { label: "SLA risks", value: slaRisks, tone: "warning" as const, hint: "traces" },
            { label: "Log drains", value: 4, hint: "logs" },
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

      <LiveTelemetryDashboard snapshot={live} />

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
              { name: "Log collectors (DaemonSet)", detail: "4/4 nodes", status: "healthy" as const },
              { name: "Structured JSON parse", detail: "cri-o · containerd", status: "healthy" as const },
              { name: "Export endpoint", detail: "EU residency", status: "healthy" as const },
              {
                name: "Pipeline lag p95",
                detail: `${pipelineLag}s · live`,
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

        <section className="ops-panel rounded-2xl p-5" aria-labelledby="provider-title-top">
          <div className="mb-4">
            <h2 id="provider-title-top" className="font-display text-lg font-semibold tracking-tight">
              Application latency
            </h2>
            <p className="text-sm text-muted-foreground">
              Model gateway request performance — live p95 overlay on seeded providers
            </p>
          </div>
          <div className="space-y-3">
            {providers.map((p, idx) => {
              const liveMs = Math.round(
                live.latest.latencyMs * (0.85 + idx * 0.08) + (idx === 0 ? 0 : 12 * idx),
              );
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">{liveMs} ms</span> live · {p.residency}
                    </p>
                  </div>
                  <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill>
                </div>
              );
            })}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/models">Open Model Gateway</Link>
            </Button>
          </div>
        </section>
      </div>

      <div className="grid gap-4">
        <section className="ops-panel rounded-2xl p-5" aria-labelledby="heatmap-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 id="heatmap-title" className="font-display text-lg font-semibold tracking-tight">
                Infrastructure health heatmap
              </h2>
              <p className="text-sm text-muted-foreground">
                Composite health by customer and environment — see everything in one place
              </p>
            </div>
            <Activity className="size-4 text-primary/70" aria-hidden="true" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th scope="col" className="pb-2 font-medium">
                    Customer
                  </th>
                  {heatmap[0]!.cells.map((c) => (
                    <th key={c.env} scope="col" className="pb-2 font-medium">
                      {c.env}
                    </th>
                  ))}
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
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5" aria-labelledby="incident-chart-title">
          <h2 id="incident-chart-title" className="font-display text-lg font-semibold tracking-tight">
            Error & incident timeline
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Historical event volume (seeded) — live series above for last-minute fleet health
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incidentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="p1" name="P1" stroke="var(--destructive)" strokeWidth={2} />
                <Line type="monotone" dataKey="p2" name="P2" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-labelledby="spend-chart-title">
          <h2 id="spend-chart-title" className="font-display text-lg font-semibold tracking-tight">
            Token spend and retry waste
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">USD per day across all tenants</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" name="Spend" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="waste" name="Retry waste" fill="var(--warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5" aria-labelledby="active-incidents-title">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            <div>
              <h2 id="active-incidents-title" className="font-display text-lg font-semibold tracking-tight">
                Active incidents
              </h2>
              <p className="text-sm text-muted-foreground">Ordered by severity and SLA exposure</p>
            </div>
          </div>
          <div className="space-y-3">
            {openIncidents.map((i) => (
              <Link
                key={i.id}
                to="/incidents/$incidentId"
                params={{ incidentId: i.id }}
                className="block rounded-xl border border-border/80 bg-background/40 p-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{i.title}</p>
                  <StatusPill tone={toneForSeverity(i.severity)}>{i.severity}</StatusPill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {i.id} · {customerName(i.customerId)} · {i.environment}
                  {i.slaRisk ? " · SLA at risk" : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-labelledby="patterns-title">
          <h2 id="patterns-title" className="font-display text-lg font-semibold tracking-tight">
            Recurring incident patterns
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Signature clustering across 30 days</p>
          <div className="space-y-3">
            {recurringIncidents.map((r) => (
              <div
                key={r.pattern}
                className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.pattern}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.tenants} tenant(s) · last seen {r.lastSeen}
                  </p>
                </div>
                <StatusPill tone={toneForScore(100 - r.occurrences * 8)}>{r.occurrences}x</StatusPill>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
