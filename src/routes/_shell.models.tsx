import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, Gauge, ShieldCheck, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForStatus } from "@/components/ops/status-badge";
import { agentName, gatewayDecisions, providers, tenantName, tenants } from "@/data/seed";

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
  const avgLatency = Math.round(providers.reduce((s, p) => s + p.latencyMs, 0) / providers.length);
  const sovereign = providers.filter((p) => p.residency.toLowerCase().includes("premise")).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Gateway"
        description="Vendor-neutral routing across hosted and sovereign on-premise inference, with residency and tenant enforcement."
        crumbs={[{ label: "Govern" }, { label: "Model Gateway" }]}
        actions={
          <Button
            variant="outline"
            onClick={() => toast.success("Provider health re-probed", { description: "Read-only probe: 7 providers, no configuration changed." })}
          >
            Re-probe providers
          </Button>
        }
      />
      <SafetyBanner compact />

      <section aria-label="Gateway metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Providers" value={providers.length} hint="Hosted and on-premise" icon={<Cpu className="size-4" aria-hidden="true" />} />
        <MetricCard label="Healthy" value={healthy} tone="success" hint={`${degraded} needing attention`} icon={<Activity className="size-4" aria-hidden="true" />} />
        <MetricCard label="Avg latency" value={`${avgLatency} ms`} tone="info" hint="Rolling 15-minute p50" icon={<Gauge className="size-4" aria-hidden="true" />} />
        <MetricCard label="Sovereign routes" value={sovereign} tone="success" hint="On-premise inference only" icon={<ShieldCheck className="size-4" aria-hidden="true" />} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Providers and fallback chain</CardTitle>
          <CardDescription>Ordered by fallback priority. Routing configuration is read-only in this console.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search provider, model or residency"
              aria-label="Search providers"
            />
            <Select value={residency} onValueChange={setResidency}>
              <SelectTrigger aria-label="Filter by data residency">
                <SelectValue placeholder="Residency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All residencies</SelectItem>
                {residencies.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger aria-label="Filter by allowed tenant">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
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
                      <TableCell className="tabular-nums font-medium">#{p.fallbackOrder}</TableCell>
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
                            <span key={m} className="rounded-md border border-border bg-surface-strong px-1.5 py-0.5 text-xs">
                              {m}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.allowedTenants.map((t) => (
                            <span key={t} className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs text-primary whitespace-nowrap">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Routing decision audit log</CardTitle>
          <CardDescription>
            Every gateway decision is recorded with correlation ID, tenant, chosen provider, fallback event and outcome. Entries are immutable and read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              placeholder="Search correlation ID, tenant, agent, provider or outcome"
              aria-label="Search routing decision log"
              className="sm:col-span-2"
            />
            <Select value={logDecision} onValueChange={setLogDecision}>
              <SelectTrigger aria-label="Filter by decision">
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

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{decisionCounts.routed} routed</span>
            <span>{decisionCounts.fallback} fallback events</span>
            <span>{decisionCounts.blocked} blocked at gateway</span>
          </div>

          {decisionRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
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
                      <TableCell className="text-xs whitespace-nowrap tabular-nums">{d.time.replace("T", " ").replace("Z", "")}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{tenantName(d.tenantId)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{agentName(d.agentId)}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{d.requestedModel}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {d.chosenProvider}
                        {d.chosenModel !== "—" && (
                          <span className="block font-mono text-xs text-muted-foreground">{d.chosenModel}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={decisionTone[d.decision]}>{d.decision}</StatusPill>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {d.fallbackFrom ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{d.residency}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.latencyMs ? `${d.latencyMs} ms` : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.tokens ? d.tokens.toLocaleString() : "—"}</TableCell>
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
        </CardContent>
      </Card>

    </div>
  );
}