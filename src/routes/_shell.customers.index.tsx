import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore } from "@/components/ops/status-badge";
import { customers, tenantName, tenants } from "@/data/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/customers/")({
  head: () => ({
    meta: [
      { title: "Customer Management · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Manage multi-tenant customer estates: clusters, nodes, agents, open incidents, health scores and monthly agent spend.",
      },
      { property: "og:title", content: "Customer Management · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Customer estates with clusters, nodes, agents, incidents and spend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function useLiveSpendRate(baseUsdPerHour: number) {
  const [n, setN] = useState(baseUsdPerHour);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(12, Math.min(420, Math.round(v + (Math.random() - 0.45) * 18))));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function useLiveHealthDrift(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(72, Math.min(99, Math.round(v + (Math.random() - 0.5) * 1.2))));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function CustomersPage() {
  const [query, setQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [contract, setContract] = useState("all");

  const rows = useMemo(
    () =>
      customers.filter(
        (c) =>
          (tenantFilter === "all" || c.tenantId === tenantFilter) &&
          (contract === "all" || c.contract === contract) &&
          (c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.industry.toLowerCase().includes(query.toLowerCase()) ||
            c.owner.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, tenantFilter, contract],
  );

  const totalNodes = rows.reduce((s, c) => s + c.nodes, 0);
  const totalAgents = rows.reduce((s, c) => s + c.agents, 0);
  const totalSpend = rows.reduce((s, c) => s + c.monthlyCostUsd, 0);
  const open = rows.reduce((s, c) => s + c.openIncidents, 0);
  const avgHealth =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((s, c) => s + c.health, 0) / rows.length);

  const liveBurn = useLiveSpendRate(86);
  const liveHealth = useLiveHealthDrift(avgHealth || 88);

  return (
    <div className="space-y-6">
      <section
        aria-label="Customers pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-brand-coral/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Operate · estates
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Customer Management
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Every customer estate onboarded to the Agent OS — clusters, agents, health and spend
              posture across tenant boundaries.
            </p>
            <Button
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              onClick={() =>
                toast.success("Estate rollup refreshed", {
                  description: `${customers.length} customer estates re-correlated (read-only).`,
                })
              }
            >
              <Building2 className="size-4" aria-hidden="true" />
              Refresh estates
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Customers", value: rows.length, hint: "in view" },
              { label: "Nodes", value: totalNodes.toLocaleString(), hint: "fleet" },
              { label: "Agents", value: totalAgents, hint: "active" },
              {
                label: "Open",
                value: open,
                hint: "incidents",
                hot: open > 0,
              },
              {
                label: "Burn / hr",
                value: `$${liveBurn}`,
                hint: "live",
                live: true,
              },
              {
                label: "Avg health",
                value: liveHealth,
                hint: "live",
                live: true,
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
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Estates & health"
        description={`$${totalSpend.toLocaleString()} monthly agent spend across the filtered estate set.`}
        crumbs={[{ label: "Operate", to: "/" }, { label: "Customers" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Customer estates">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <Building2 className="size-4 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold">Customer estates</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} estates · open a row for estate detail
            </p>
          </div>
          {open > 0 && <StatusPill tone="warning">{open} open incidents</StatusPill>}
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, industry or owner"
              aria-label="Search customers"
              className="bg-surface sm:max-w-xs"
            />
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="bg-surface sm:w-56" aria-label="Filter by tenant">
                <SelectValue />
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
            <Select value={contract} onValueChange={setContract}>
              <SelectTrigger className="bg-surface sm:w-40" aria-label="Filter by contract">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contracts</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium">No customers match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear the search term or widen the tenant and contract filters.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setTenantFilter("all");
                  setContract("all");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-right">Clusters</TableHead>
                    <TableHead className="text-right">Nodes</TableHead>
                    <TableHead className="text-right">Agents</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow
                      key={c.id}
                      className={c.openIncidents > 0 ? "bg-warning/5" : undefined}
                    >
                      <TableCell>
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: c.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{c.industry}</p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {tenantName(c.tenantId)}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{c.contract}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.clusters}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.nodes}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.agents}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.openIncidents}</TableCell>
                      <TableCell>
                        <StatusPill tone={toneForScore(c.health)}>{c.health}</StatusPill>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${c.monthlyCostUsd.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/customers/$customerId" params={{ customerId: c.id }}>
                            View
                          </Link>
                        </Button>
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
