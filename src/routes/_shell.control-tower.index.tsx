import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { agentName, customerName, executionTraces, tenantName } from "@/data/seed";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/control-tower/")({
  head: () => ({
    meta: [
      { title: "AI Control Tower · Wecrew Ops" },
      {
        name: "description",
        content:
          "Prompt → agent → model → MCP → infrastructure flight recorder with immutable execution IDs, policy and approval correlation.",
      },
      { property: "og:title", content: "AI Control Tower · Wecrew Ops" },
    ],
  }),
  component: ControlTowerIndex,
});

function statusTone(status: string) {
  if (status === "complete") return "success" as const;
  if (status === "awaiting-approval") return "warning" as const;
  return "info" as const;
}

function ControlTowerIndex() {
  const ops = useOps();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return executionTraces.filter((t) => {
      if (t.tenantId !== ops.tenantId) return false;
      if (!q) return true;
      return [
        t.id,
        t.incidentId,
        t.model,
        t.tool,
        t.summary,
        agentName(t.agentId),
        tenantName(t.tenantId),
        customerName(t.customerId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [ops.tenantId, query]);

  return (
    <div className="space-y-6">
      <section
        aria-label="Control Tower pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · AI observability
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              AI Control Tower
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Trace every AI action from prompt firewall through local model, MCP tool, evidence,
              policy and approval — one immutable execution ID.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white">
                <Link to="/control-tower/$executionId" params={{ executionId: "exec-clb-01" }}>
                  <Radar className="size-4" aria-hidden />
                  Stage-1 execution
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/demo/vertical-slice">Vertical slice guide</Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                Executions
              </p>
              <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                {rows.length}
              </p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                Awaiting
              </p>
              <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                {rows.filter((r) => r.status === "awaiting-approval").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        title="AI Control Tower"
        description="Immutable execution IDs across prompt, model, MCP, evidence and approval."
        crumbs={[
          { label: "Govern", to: "/command" },
          { label: "AI Control Tower" },
        ]}
      />

      <SafetyBanner />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by execution ID, incident, agent…"
          className="max-w-md"
          aria-label="Filter executions"
        />
      </div>

      <ul className="space-y-3">
        {rows.map((t) => (
          <li key={t.id}>
            <Link
              to="/control-tower/$executionId"
              params={{ executionId: t.id }}
              className={cn(
                "block rounded-xl border border-border bg-card p-4 transition-colors",
                "hover:border-brand-coral/40 hover:bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-foreground">{t.id}</p>
                    <StatusPill tone={statusTone(t.status)}>{t.status}</StatusPill>
                    <StatusPill tone="info">{t.autonomyLevel}</StatusPill>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.summary}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {t.incidentId} · {agentName(t.agentId)} · {t.model} · {t.tool} · audit{" "}
                    {t.auditCorrelationId}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-mono tabular-nums">{t.tokens.toLocaleString()} tok</p>
                  <p className="mt-0.5">${t.costUsd.toFixed(2)}</p>
                  {t.confidence != null && (
                    <p className="mt-0.5">confidence {t.confidence}%</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {tenantName(t.tenantId)} · {customerName(t.customerId)} · {t.hops.length} hops
              </p>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No executions in the current tenant scope.
          </li>
        )}
      </ul>
    </div>
  );
}
