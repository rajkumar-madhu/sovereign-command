import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import {
  agentName,
  customerName,
  getExecutionTrace,
  tenantName,
} from "@/data/seed";
import type { ExecutionHop, ExecutionTrace, TraceDomain } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/control-tower/$executionId")({
  loader: ({ params }): { trace: ExecutionTrace } => {
    const trace = getExecutionTrace(params.executionId);
    if (!trace) throw notFound();
    return { trace };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.trace.id ?? "Execution"} · AI Control Tower`,
      },
      {
        name: "description",
        content: loaderData?.trace.summary ?? "AI execution path timeline",
      },
    ],
  }),
  component: ControlTowerDetail,
  notFoundComponent: () => (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">Execution not found</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/control-tower">Back to Control Tower</Link>
      </Button>
    </div>
  ),
});

const domainOrder: TraceDomain[] = [
  "prompt",
  "security",
  "agent",
  "model",
  "mcp",
  "api",
  "evidence",
  "verification",
  "policy",
  "approval",
  "action",
];

function hopTone(status: ExecutionHop["status"]) {
  if (status === "ok") return "success" as const;
  if (status === "warn") return "warning" as const;
  if (status === "blocked") return "danger" as const;
  return "info" as const;
}

function ControlTowerDetail() {
  const { trace } = Route.useLoaderData() as { trace: ExecutionTrace };

  return (
    <div className="space-y-6">
      <section className="command-pulse relative overflow-hidden rounded-2xl border border-border/70">
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.45]" aria-hidden />
        <div className="relative z-10 space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              AI Control Tower · execution
            </p>
            <StatusPill
              tone={
                trace.status === "complete"
                  ? "success"
                  : trace.status === "awaiting-approval"
                    ? "warning"
                    : "info"
              }
            >
              {trace.status}
            </StatusPill>
            <StatusPill tone="info">{trace.autonomyLevel}</StatusPill>
          </div>
          <h1 className="font-display font-mono text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
            {trace.id}
          </h1>
          <p className="max-w-2xl text-sm text-sidebar-foreground/70">{trace.summary}</p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Incident", trace.incidentId],
              ["Agent", agentName(trace.agentId)],
              ["Model", trace.model],
              ["Tool", trace.tool],
              ["Tenant", tenantName(trace.tenantId)],
              ["Customer", customerName(trace.customerId)],
              ["Audit corr", trace.auditCorrelationId],
              ["Approval", trace.approvalId ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">{k}</dt>
                <dd className="mt-0.5 truncate font-mono text-[12px] text-sidebar-accent-foreground">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline" className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground">
              <Link to="/control-tower">
                <ArrowLeft className="size-4" aria-hidden />
                All executions
              </Link>
            </Button>
            <Button asChild className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white">
              <Link to="/incidents/$incidentId" params={{ incidentId: trace.incidentId }}>
                <Siren className="size-4" aria-hidden />
                Incident workspace
              </Link>
            </Button>
            {trace.approvalId && (
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground"
              >
                <Link to="/approvals">Approval queue</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <PageHeader
        title={trace.id}
        description="Prompt → agent → model → MCP → evidence → policy → approval path."
        crumbs={[
          { label: "Govern", to: "/command" },
          { label: "AI Control Tower", to: "/control-tower" },
          { label: trace.id },
        ]}
      />

      <SafetyBanner />

      <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
        <ol className="relative space-y-0 border-l border-border pl-6">
          {trace.hops.map((hop: ExecutionHop, i: number) => (
            <li key={hop.id} className="relative pb-8 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[1.4rem] top-1 size-2.5 rounded-full ring-4 ring-background",
                  hop.status === "ok" && "bg-emerald-500",
                  hop.status === "warn" && "bg-amber-500",
                  hop.status === "blocked" && "bg-destructive",
                  hop.status === "pending" && "bg-sky-500",
                )}
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {hop.domain}
                </span>
                <StatusPill tone={hopTone(hop.status)}>{hop.status}</StatusPill>
                <span className="font-mono text-[10px] text-muted-foreground">{hop.at}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {i + 1}. {hop.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{hop.detail}</p>
              {hop.meta && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(hop.meta).map(([k, v]) => (
                    <li
                      key={k}
                      className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {k}={String(v)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <aside className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Target path
          </p>
          <ol className="space-y-1.5 font-mono text-[11px] text-muted-foreground">
            {domainOrder.map((d) => {
              const hit = trace.hops.some((h: ExecutionHop) => h.domain === d);
              return (
                <li key={d} className={cn(hit ? "text-foreground" : "opacity-40")}>
                  {hit ? "●" : "○"} {d}
                </li>
              );
            })}
          </ol>
          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            <p>
              Tokens <span className="font-mono text-foreground">{trace.tokens.toLocaleString()}</span>
            </p>
            <p className="mt-1">
              Cost <span className="font-mono text-foreground">${trace.costUsd.toFixed(2)}</span>
            </p>
            {trace.confidence != null && (
              <p className="mt-1">
                Confidence{" "}
                <span className="font-mono text-foreground">{trace.confidence}%</span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
