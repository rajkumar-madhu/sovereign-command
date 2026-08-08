import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, FileSearch, Siren } from "lucide-react";
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

function IncidentWorkspace() {
  const { incident } = Route.useLoaderData();
  const isPrimary = incident.id === "inc-4821";
  const steps = isPrimary ? incidentTimeline : incidentTimeline.slice(0, 6);
  const elapsed = useElapsed(incident.opened);
  const open = incident.status !== "closed";

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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Siren className="size-4 text-destructive" aria-hidden="true" />
              <h2 id="timeline-title" className="font-display text-lg font-semibold tracking-tight">
                Investigation timeline
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Severity {incident.severity} · phases are append-only evidence steps
            </p>
          </div>
        </div>
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.id} className="relative border-l border-border pl-5">
              <span
                className={cn(
                  "absolute -left-[5px] top-1.5 size-2.5 rounded-full",
                  s.status === "verified"
                    ? "bg-success"
                    : s.status === "anomaly"
                      ? "bg-warning"
                      : s.status === "rejected"
                        ? "bg-destructive"
                        : "bg-primary",
                )}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                <StatusPill tone={toneForStatus(s.status)}>{s.status}</StatusPill>
                <span className="text-xs text-muted-foreground">
                  {s.phase} · {s.time}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
              {s.evidence && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {s.evidence.map((e) => (
                    <li
                      key={e}
                      className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </li>
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
        Opened {new Date(incident.opened).toLocaleString()} · {incident.id}
      </p>
    </div>
  );
}
