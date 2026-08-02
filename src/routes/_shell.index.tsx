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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
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
  tenants,
} from "@/data/seed";

export const Route = createFileRoute("/_shell/")({
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
  const nodes = customers.reduce((s, c) => s + c.nodes, 0);
  const clusters = customers.reduce((s, c) => s + c.clusters, 0);
  const highRisk = agents.filter((a) => a.riskLevel === "high" || a.riskLevel === "critical").length;
  const p1 = incidents.filter((i) => i.severity === "P1" && i.status !== "closed").length;
  const p2 = incidents.filter((i) => i.severity === "P2" && i.status !== "closed").length;
  const slaRisks = incidents.filter((i) => i.slaRisk && i.status !== "closed").length;
  const injections = securityEvents.filter((e) => e.category === "prompt-injection").length;
  const pending = ops.approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Command Centre"
        description="Cross-tenant posture for the agent fleet, live incidents and controlled spend."
        crumbs={[{ label: "Operate" }, { label: "Command Centre" }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/investigations">Investigations</Link>
            </Button>
            <Button asChild>
              <Link to="/incidents/inc-4821">Open active P1</Link>
            </Button>
          </>
        }
      />
      <SafetyBanner />

      <section aria-label="Fleet metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <MetricCard label="Tenants" value={tenants.length} hint="All EU/US residency mapped" />
        <MetricCard label="Customers" value={customers.length} hint="8 under active contract" />
        <MetricCard label="Clusters" value={clusters} hint="Hybrid: cloud + on-prem" />
        <MetricCard label="Nodes" value={nodes} hint="Read-only inventory sync" />
        <MetricCard label="Agents" value={agents.length} hint="30 registered passports" tone="info" />
        <MetricCard label="High-risk agents" value={highRisk} tone="danger" hint="Trust score below 78" />
        <MetricCard label="P1 incidents" value={p1} tone="danger" hint="Escalated to command centre" />
        <MetricCard label="P2 incidents" value={p2} tone="warning" hint="Under investigation" />
        <MetricCard label="SLA risks" value={slaRisks} tone="warning" hint="Breach forecast < 4h" />
        <MetricCard label="Prompt injections" value={injections} tone="danger" hint="All blocked at ingress" />
        <MetricCard label="Pending approvals" value={pending} tone="warning" hint="Human-in-the-loop gates" />
        <MetricCard label="Monthly tokens / cost" value="46.2M" tone="info" hint="USD 39,650 of 67,000 budget" />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Estate health heatmap</CardTitle>
            <CardDescription>Composite health by customer and environment</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th scope="col" className="pb-2 font-medium">Customer</th>
                  {heatmap[0]!.cells.map((c) => (
                    <th key={c.env} scope="col" className="pb-2 font-medium">{c.env}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row) => (
                  <tr key={row.customer} className="border-t border-border">
                    <th scope="row" className="py-2 pr-4 text-left font-medium">{row.customer}</th>
                    {row.cells.map((cell) => (
                      <td key={cell.env} className="py-2 pr-3">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider health</CardTitle>
            <CardDescription>Model gateway routing and latency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.latencyMs} ms · {p.residency}
                  </p>
                </div>
                <StatusPill tone={toneForStatus(p.status)}>{p.status}</StatusPill>
              </div>
            ))}
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/models">Open Model Gateway</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incident timeline</CardTitle>
            <CardDescription>P1 and P2 volume, last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token spend and retry waste</CardTitle>
            <CardDescription>USD per day across all tenants</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active incidents</CardTitle>
            <CardDescription>Ordered by severity and SLA exposure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents
              .filter((i) => i.status !== "closed")
              .map((i) => (
                <Link
                  key={i.id}
                  to="/incidents/$incidentId"
                  params={{ incidentId: i.id }}
                  className="block rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recurring incident patterns</CardTitle>
            <CardDescription>Signature clustering across 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recurringIncidents.map((r) => (
              <div key={r.pattern} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.pattern}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.tenants} tenant(s) · last seen {r.lastSeen}
                  </p>
                </div>
                <StatusPill tone={toneForScore(100 - r.occurrences * 8)}>{r.occurrences}x</StatusPill>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}