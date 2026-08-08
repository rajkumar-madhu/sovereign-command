import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Clock, FileSearch, Siren } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import {
  agentName,
  customerName,
  incidentTimeline,
  incidents,
  rcaReport,
  tenantName,
} from "@/data/seed";
import type { TimelineStep } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/incidents/$incidentId")({
  loader: ({ params }) => {
    const incident = incidents.find((i) => i.id === params.incidentId);
    if (!incident) throw notFound();
    return { incident };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.incident.title ?? "Incident";
    return {
      meta: [
        { title: `${title} · Incident Workspace` },
        {
          name: "description",
          content: `Agent investigation workspace with the full evidence timeline for: ${title}.`,
        },
        { property: "og:title", content: `${title} · Incident Workspace` },
        {
          property: "og:description",
          content: "Evidence timeline, hypotheses and read-only root cause analysis.",
        },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: IncidentWorkspace,
  notFoundComponent: () => (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">Incident not found</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/investigations">Back to investigations</Link>
      </Button>
    </div>
  ),
});

function formatStepAt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }),
    iso,
  };
}

function useElapsed(openedIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const opened = new Date(openedIso).getTime();
  const sec = Math.max(0, Math.floor((now - opened) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function StepLoadGraph({ step }: { step: TimelineStep }) {
  const series = step.series;
  if (!series?.length) return null;

  const hasHost = series.some((p) => p.cpu != null || p.mem != null);
  const hasPull = series.some((p) => p.pullErrors != null);
  const hasBytes = series.some((p) => p.bytesMb != null);
  const hasRst = series.some((p) => p.rst != null);

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface/60 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Load graph · {step.seriesLabel ?? "series"}
      </p>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {hasHost || hasPull ? (
            <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={32} />
              {hasPull && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={28} />}
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              {hasHost && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cpu"
                  name="CPU %"
                  stroke="var(--brand-blue, #2b4cff)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {hasHost && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="mem"
                  name="Mem %"
                  stroke="#0f7a55"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {hasPull && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pullErrors"
                  name="Pull errors"
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              )}
            </LineChart>
          ) : (
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              {hasBytes && (
                <Area
                  type="monotone"
                  dataKey="bytesMb"
                  name="MB transferred"
                  stroke="#2b4cff"
                  fill="rgba(43,76,255,0.15)"
                  strokeWidth={2}
                />
              )}
              {hasRst && (
                <Area
                  type="monotone"
                  dataKey="rst"
                  name="RST count"
                  stroke="var(--destructive)"
                  fill="rgba(220,38,38,0.12)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TimelineStepCard({
  step,
  open,
  onToggle,
}: {
  step: TimelineStep;
  open: boolean;
  onToggle: () => void;
}) {
  const when = formatStepAt(step.at);
  return (
    <li className="relative border-l border-border pl-5">
      <span
        className={cn(
          "absolute -left-[5px] top-2 size-2.5 rounded-full",
          step.status === "verified"
            ? "bg-success"
            : step.status === "anomaly"
              ? "bg-warning"
              : step.status === "rejected"
                ? "bg-destructive"
                : "bg-primary",
        )}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-start gap-2 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{step.label}</span>
            <StatusPill tone={toneForStatus(step.status)}>{step.status}</StatusPill>
            <span className="text-xs text-muted-foreground">{step.phase}</span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            <span className="text-foreground/80">{when.date}</span>
            <span className="mx-1.5 text-border">·</span>
            <span>{when.time}</span>
            <span className="mx-1.5 text-border">·</span>
            <span className="opacity-70">{when.iso}</span>
          </p>
          <p className="text-sm text-muted-foreground">{step.detail}</p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3 pb-2">
          {step.formation && (
            <div className="rounded-xl border border-border bg-surface/50 p-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Detailed formation
              </p>
              <p className="text-sm leading-relaxed text-foreground/85">{step.formation}</p>
            </div>
          )}

          <StepLoadGraph step={step} />

          {step.logs && (
            <div className="rounded-xl border border-border bg-[#0e1116] p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                Logs · evidence excerpt
              </p>
              <pre className="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#e8e4dc]">
                {step.logs}
              </pre>
            </div>
          )}

          {step.evidence && (
            <ul className="flex flex-wrap gap-1.5">
              {step.evidence.map((e) => (
                <li
                  key={e}
                  className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function IncidentWorkspace() {
  const { incident } = Route.useLoaderData();
  const isPrimary = incident.id === "inc-4821";
  const steps = isPrimary ? incidentTimeline : incidentTimeline.slice(0, 6);
  const elapsed = useElapsed(incident.opened);
  const open = incident.status !== "closed";
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    s1: true,
    s5: true,
    s6: true,
    s7: true,
  }));

  const openedLabel = useMemo(() => {
    const d = new Date(incident.opened);
    return d.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "medium",
    });
  }, [incident.opened]);

  return (
    <div className="space-y-6">
      <section
        aria-label="Incident pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className={cn(
            "pointer-events-none absolute -right-10 -top-14 size-52 rounded-full blur-3xl",
            incident.severity === "P1" ? "bg-destructive/35" : "bg-brand-coral/25",
          )}
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
                Investigate · workspace
              </p>
              <StatusPill tone={toneForSeverity(incident.severity)}>{incident.severity}</StatusPill>
              <StatusPill tone={toneForStatus(incident.status)}>{incident.status}</StatusPill>
              {incident.slaRisk && <StatusPill tone="warning">SLA at risk</StatusPill>}
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              {incident.title}
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">{incident.summary}</p>
            <p className="font-mono text-[11px] text-sidebar-foreground/55">
              Opened {openedLabel} · {incident.opened}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white">
                <Link to="/evidence">
                  <FileSearch className="size-4" aria-hidden="true" />
                  Evidence viewer
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/rca">Open RCA report</Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                Elapsed
              </p>
              <p className="font-display mt-1 flex items-center gap-1.5 text-lg font-semibold tabular-nums text-sidebar-accent-foreground">
                <Clock className="size-3.5 text-brand-coral" aria-hidden="true" />
                {open ? elapsed : "closed"}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">
                {open ? "live clock" : "resolved"}
              </p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                Reference
              </p>
              <p className="font-mono mt-1 text-sm font-semibold text-sidebar-accent-foreground">
                {incident.id}
              </p>
              <p className="mt-0.5 text-[10px] text-sidebar-foreground/50">
                recurrence {incident.recurrence}x
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        title="Investigation workspace"
        description="Evidence-backed timeline — every step is read-only, bounded and audited."
        crumbs={[
          { label: "Investigate" },
          { label: "Investigations", to: "/investigations" },
          { label: incident.id },
        ]}
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Status" value={incident.status} tone="info" />
        <MetricCard
          label="Tenant"
          value={tenantName(incident.tenantId)}
          hint={customerName(incident.customerId)}
        />
        <MetricCard
          label="Lead agent"
          value={agentName(incident.assignedAgent)}
          hint={`Environment: ${incident.environment}`}
        />
        <MetricCard
          label="RCA confidence"
          value={isPrimary ? `${rcaReport.confidence}%` : "pending"}
          tone={isPrimary ? "success" : "warning"}
        />
      </section>

      <section className="ops-panel rounded-2xl p-5" aria-labelledby="timeline-title">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Siren className="size-4 text-destructive" aria-hidden="true" />
              <h2 id="timeline-title" className="font-display text-lg font-semibold tracking-tight">
                Investigation timeline
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Severity {incident.severity} · phases are append-only evidence steps · expand a step for
              formation, load graph, and logs
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setExpanded(Object.fromEntries(steps.map((s) => [s.id, true])))
              }
            >
              Expand all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded({})}>
              Collapse
            </Button>
          </div>
        </div>
        <ol className="space-y-5">
          {steps.map((s) => (
            <TimelineStepCard
              key={s.id}
              step={s}
              open={Boolean(expanded[s.id])}
              onToggle={() =>
                setExpanded((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
              }
            />
          ))}
        </ol>
      </section>

      {isPrimary && (
        <section className="ops-panel rounded-2xl p-5" aria-labelledby="rca-title">
          <h2 id="rca-title" className="font-display text-lg font-semibold tracking-tight">
            Final root cause
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confidence {rcaReport.confidence}% · risk {rcaReport.risk} · no production write required
          </p>
          <div className="mt-4 space-y-4 text-sm">
            <p>{rcaReport.rootCause}</p>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recommendation
              </p>
              <p>{rcaReport.recommendation}</p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                toast.success("RCA shared with Network Operations", {
                  description: "Read-only report, no remediation executed.",
                })
              }
            >
              Share RCA with owner
            </Button>
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Opened {openedLabel} · {incident.id}
      </p>
    </div>
  );
}
