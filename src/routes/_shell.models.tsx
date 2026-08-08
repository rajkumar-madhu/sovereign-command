import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForStatus } from "@/components/ops/status-badge";
import { agentName, gatewayDecisions, providers, tenantName, tenants } from "@/data/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/models")({
  head: () => ({
    meta: [
      { title: "Model Gateway · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Provider health, latency, data residency, cost tier, fallback order and per-tenant allow-lists for every model routed through the sovereign gateway.",
      },
      { property: "og:title", content: "Model Gateway · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Vendor-neutral model routing with residency, latency and tenant allow-list controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelGateway,
});

const costTone = { low: "success", medium: "info", high: "warning" } as const;
const decisionTone = { routed: "success", fallback: "warning", blocked: "danger" } as const;

function useLiveLatency(base: number) {
  const [ms, setMs] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setMs((v) => Math.max(280, Math.min(1600, Math.round(v + (Math.random() - 0.48) * 36))));
    }, 1800);
    return () => window.clearInterval(id);
  }, []);
  return ms;
}

function useLiveRps(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(12, Math.min(220, Math.round(v + (Math.random() - 0.45) * 8))));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function ModelGateway() {
  const [query, setQuery] = useState("");
  const [residency, setResidency] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [logQuery, setLogQuery] = useState("");
  const [logDecision, setLogDecision] = useState("all");

  const residencies = useMemo(
    () => Array.from(new Set(providers.map((p) => p.residency))),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers
      .filter((p) => {
        if (residency !== "all" && p.residency !== residency) return false;
        if (tenantFilter !== "all" && !p.allowedTenants.includes(tenantFilter)) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.models.some((m) => m.toLowerCase().includes(q)) ||
          p.residency.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.fallbackOrder - b.fallbackOrder);
  }, [query, residency, tenantFilter]);

  const decisionRows = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return gatewayDecisions
      .filter((d) => {
        if (logDecision !== "all" && d.decision !== logDecision) return false;
        if (!q) return true;
        return [
          d.correlationId,
          tenantName(d.tenantId),
          agentName(d.agentId),
          d.requestedModel,
          d.chosenProvider,
          d.chosenModel,
          d.fallbackFrom ?? "",
          d.residency,
          d.outcome,
          d.reason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [logQuery, logDecision]);

  const decisionCounts = useMemo(
    () => ({
      routed: gatewayDecisions.filter((d) => d.decision === "routed").length,
      fallback: gatewayDecisions.filter((d) => d.decision === "fallback").length,
      blocked: gatewayDecisions.filter((d) => d.decision === "blocked").length,
    }),
    [],
  );

  const healthy = providers.filter((p) => p.status === "healthy").length;
  const degraded = providers.filter((p) => p.status !== "healthy").length;
  const avgLatencyBase = Math.round(providers.reduce((s, p) => s + p.latencyMs, 0) / providers.length);
  const liveLatency = useLiveLatency(avgLatencyBase);
  const liveRps = useLiveRps(64);
  const sovereign = providers.filter((p) => p.residency.toLowerCase().includes("premise")).length;

  return (
    <div className="space-y-6">
      <section
        aria-label="Model gateway pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-primary/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · inference
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Model Gateway
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Vendor-neutral routing across hosted and sovereign on-premise inference, with residency
              and tenant enforcement. Configuration is read-only in this console.
            </p>
            <Button
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              onClick={() =>
                toast.success("Provider health re-probed", {
                  description: "Read-only probe: 7 providers, no configuration changed.",
                })
              }
            >
              <Activity className="size-4" aria-hidden="true" />
              Re-probe providers
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Providers", value: providers.length, hint: "routes" },
              { label: "Healthy", value: healthy, hint: `${degraded} watch` },
              {
                label: "p50 latency",
                value: `${liveLatency}`,
                unit: "ms",
                hint: "live",
                live: true,
              },
              { label: "Gateway rps", value: liveRps, hint: "live", live: true },
              { label: "Sovereign", value: sovereign, hint: "on-prem" },
              {
                label: "Blocked",
                value: decisionCounts.blocked,
                hint: "policy",
                hot: decisionCounts.blocked > 0,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "font-display mt-1 text-2xl font-semibold tabular-nums",
                    s.hot ? "text-destructive" : "text-sidebar-accent-foreground",
                  )}
                >
                  {s.live && (
                    <span className="mr-1.5 inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral align-middle" />
                  )}
                  {s.value}
                  {s.unit ? (
                    <span className="ml-0.5 text-sm font-medium text-sidebar-foreground/55">{s.unit}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Providers & routing"
        description="Fallback chain, residency allow-lists and immutable decision audit."
        crumbs={[{ label: "Govern" }, { label: "Model Gateway" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Providers">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Cpu className="size-4 text-brand-coral" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold">Providers and fallback chain</h2>
            <p className="text-xs text-muted-foreground">Ordered by fallback priority</p>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search provider, model or residency"
              aria-label="Search providers"
              className="bg-surface"
            />
            <Select value={residency} onValueChange={setResidency}>
              <SelectTrigger className="bg-surface" aria-label="Filter by data residency">
                <SelectValue placeholder="Residency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All residencies</SelectItem>
                {residencies.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="bg-surface" aria-label="Filter by allowed tenant">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No provider matches these filters. Clear the search or widen the residency scope.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fallback</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Latency</TableHead>
                    <TableHead className="text-right">Error rate</TableHead>
                    <TableHead>Data residency</TableHead>
                    <TableHead>Cost tier</TableHead>
                    <TableHead>Models</TableHead>
                    <TableHead>Allowed tenants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium tabular-nums">#{p.fallbackOrder}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{p.name}</TableCell>
                      <TableCell>
                        <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.latencyMs} ms</TableCell>
                      <TableCell className="text-right tabular-nums">{p.errorRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{p.residency}</TableCell>
                      <TableCell>
                        <StatusPill tone={costTone[p.costTier]}>{p.costTier}</StatusPill>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.models.map((m) => (
                            <span
                              key={m}
                              className="rounded-md border border-border bg-surface-strong px-1.5 py-0.5 text-xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.allowedTenants.map((t) => (
                            <span
                              key={t}
                              className="whitespace-nowrap rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            >
                              {tenantName(t)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Routing decisions">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-display text-sm font-semibold">Routing decision audit log</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Immutable gateway decisions with correlation ID · {decisionCounts.routed} routed ·{" "}
            {decisionCounts.fallback} fallback · {decisionCounts.blocked} blocked
          </p>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              placeholder="Search correlation ID, tenant, agent, provider or outcome"
              aria-label="Search routing decision log"
              className="bg-surface sm:col-span-2"
            />
            <Select value={logDecision} onValueChange={setLogDecision}>
              <SelectTrigger className="bg-surface" aria-label="Filter by decision">
                <SelectValue placeholder="Decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                <SelectItem value="routed">Routed</SelectItem>
                <SelectItem value="fallback">Fallback</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {decisionRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No routing decisions match this search within the retention window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Correlation ID</TableHead>
                    <TableHead>Time (UTC)</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Chosen provider</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Fallback from</TableHead>
                    <TableHead>Residency</TableHead>
                    <TableHead className="text-right">Latency</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisionRows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{d.correlationId}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap tabular-nums">
                        {d.time.replace("T", " ").replace("Z", "")}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{tenantName(d.tenantId)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{agentName(d.agentId)}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{d.requestedModel}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {d.chosenProvider}
                        {d.chosenModel !== "—" && (
                          <span className="block font-mono text-xs text-muted-foreground">
                            {d.chosenModel}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={decisionTone[d.decision]}>{d.decision}</StatusPill>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {d.fallbackFrom ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{d.residency}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.latencyMs ? `${d.latencyMs} ms` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.tokens ? d.tokens.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="max-w-56 text-xs">
                        {d.outcome}
                        <span className="block text-muted-foreground">{d.reason}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
