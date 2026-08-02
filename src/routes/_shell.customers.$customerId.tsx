import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { agents, customers, incidents, tenantName } from "@/data/seed";

export const Route = createFileRoute("/_shell/customers/$customerId")({
  loader: ({ params }) => {
    const customer = customers.find((c) => c.id === params.customerId);
    if (!customer) throw notFound();
    return { customer };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.customer.name ?? "Customer";
    return {
      meta: [
        { title: `${name} · Customer Detail · Sovereign Agentic OS` },
        {
          name: "description",
          content: `Estate detail for ${name}: clusters, nodes, registered agents, open incidents and agent spend.`,
        },
        { property: "og:title", content: `${name} · Customer Detail` },
        {
          property: "og:description",
          content: `Clusters, nodes, agents, incidents and spend for ${name}.`,
        },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: CustomerDetail,
  notFoundComponent: CustomerNotFound,
});

function CustomerNotFound() {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">Customer not found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This estate may have been offboarded or is outside your tenant scope.
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/customers">Back to customers</Link>
      </Button>
    </div>
  );
}

function CustomerDetail() {
  const { customer } = Route.useLoaderData();
  const custAgents = agents.filter((a) => a.customerId === customer.id);
  const custIncidents = incidents.filter((i) => i.customerId === customer.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={`${customer.industry} · ${tenantName(customer.tenantId)} · SLA target ${customer.slaTarget}`}
        crumbs={[
          { label: "Operate", to: "/" },
          { label: "Customers", to: "/customers" },
          { label: customer.name },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/agents">Agent registry</Link>
            </Button>
            <Button asChild>
              <Link to="/investigations">Start investigation</Link>
            </Button>
          </>
        }
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Clusters" value={customer.clusters} />
        <MetricCard label="Nodes" value={customer.nodes} />
        <MetricCard label="Agents" value={custAgents.length} tone="info" />
        <MetricCard
          label="Health"
          value={customer.health}
          tone={customer.health >= 92 ? "success" : customer.health >= 80 ? "warning" : "danger"}
          hint={`Contract: ${customer.contract}`}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estate profile</CardTitle>
            <CardDescription>Ownership and onboarding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Service owner" value={customer.owner} />
            <Row label="Onboarded" value={customer.onboarded} />
            <Row label="Tenant" value={tenantName(customer.tenantId)} />
            <Row label="SLA target" value={customer.slaTarget} />
            <Row label="Monthly agent spend" value={`$${customer.monthlyCostUsd.toLocaleString()}`} />
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Budget consumed</span>
                <span>{Math.round((customer.monthlyCostUsd / 22000) * 100)}%</span>
              </div>
              <Progress value={Math.min(100, (customer.monthlyCostUsd / 22000) * 100)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registered agents</CardTitle>
            <CardDescription>Scoped to this customer estate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {custAgents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No agents are registered against this estate yet.
              </p>
            ) : (
              custAgents.map((a) => (
                <Link
                  key={a.id}
                  to="/agents/$agentId"
                  params={{ agentId: a.id }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.model} · {a.environment} · {a.autonomy}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill tone={toneForScore(a.trustScore)}>Trust {a.trustScore}</StatusPill>
                    <StatusPill tone={toneForStatus(a.status)}>{a.status}</StatusPill>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident history</CardTitle>
          <CardDescription>All incidents raised for this estate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {custIncidents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No incidents recorded — this estate has been stable across the reporting window.
            </p>
          ) : (
            custIncidents.map((i) => (
              <Link
                key={i.id}
                to="/incidents/$incidentId"
                params={{ incidentId: i.id }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.id} · opened {new Date(i.opened).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill tone={toneForSeverity(i.severity)}>{i.severity}</StatusPill>
                  <StatusPill tone={toneForStatus(i.status)}>{i.status}</StatusPill>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}