import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { MetricCard } from "@/components/ops/metric-card";
import { StatusPill, toneForScore } from "@/components/ops/status-badge";
import { customers, tenantName, tenants } from "@/data/seed";

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
    ],
  }),
  component: CustomersPage,
});

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
  const totalSpend = rows.reduce((s, c) => s + c.monthlyCostUsd, 0);
  const open = rows.reduce((s, c) => s + c.openIncidents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Management"
        description="Every customer estate onboarded to the Agent OS, with health and spend posture."
        crumbs={[{ label: "Operate", to: "/" }, { label: "Customers" }]}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Customers in view" value={rows.length} />
        <MetricCard label="Nodes" value={totalNodes} />
        <MetricCard label="Open incidents" value={open} tone={open > 0 ? "warning" : "success"} />
        <MetricCard label="Monthly spend" value={`$${totalSpend.toLocaleString()}`} tone="info" />
      </section>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Customer estates</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, industry or owner"
              aria-label="Search customers"
              className="sm:max-w-xs"
            />
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="sm:w-56" aria-label="Filter by tenant">
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
              <SelectTrigger className="sm:w-40" aria-label="Filter by contract">
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
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
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
                    <TableRow key={c.id}>
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
                      <TableCell className="text-sm">{tenantName(c.tenantId)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}