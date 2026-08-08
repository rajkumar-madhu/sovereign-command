import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Building2, Bot, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { agents, customers, incidents, tenantName } from "@/data/seed";
import { cn } from "@/lib/utils";

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
        { title: `${name} · Customer Detail · Wecrew Ops` },
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
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
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

function useLiveHealth(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(base - 4, Math.min(99, Math.round(v + (Math.random() - 0.5) * 0.9))));
    }, 2200);
    return () => window.clearInterval(id);
  }, [base]);
  return n;
}

function CustomerDetail() {
  const { customer } = Route.useLoaderData();
  const custAgents = agents.filter((a) => a.customerId === customer.id);
  const custIncidents = incidents.filter((i) => i.customerId === customer.id);
  const openIncidents = custIncidents.filter((i) => i.status !== "closed").length;
  const budgetPct = Math.min(100, Math.round((customer.monthlyCostUsd / 22000) * 100));
  const liveHealth = useLiveHealth(customer.health);

  return (
    <div className="space-y-6">
      <section
        aria-label="Customer estate pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-brand-coral/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
                Operate · estate
              </p>
              <StatusPill tone="info" className="capitalize">
                {customer.contract}
              </StatusPill>
              <StatusPill tone={toneForScore(customer.health)}>health {customer.health}</StatusPill>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              {customer.name}
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              {customer.industry} · {tenantName(customer.tenantId)} · SLA {customer.slaTarget}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                asChild
                className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              >
                <Link to="/investigations">
                  <Siren className="size-4" aria-hidden="true" />
                  Start investigation
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/agents">Agent registry</Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Clusters", value: customer.clusters, hint: "k8s" },
              { label: "Nodes", value: customer.nodes, hint: "fleet" },
              { label: "Agents", value: custAgents.length, hint: "scoped" },
              {
                label: "Open",
                value: openIncidents,
                hint: "incidents",
                hot: openIncidents > 0,
              },
              {
                label: "Spend",
                value: `$${(customer.monthlyCostUsd / 1000).toFixed(1)}k`,
                hint: "monthly",
              },
              {
                label: "Health",
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
        title="Estate detail"
        description={`Owner ${customer.owner} · onboarded ${customer.onboarded}`}
        crumbs={[
          { label: "Operate", to: "/command" },
          { label: "Customers", to: "/customers" },
          { label: customer.name },
        ]}
      />
      <SafetyBanner compact />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="ops-panel rounded-2xl p-5" aria-label="Estate profile">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Estate profile</h2>
              <p className="text-xs text-muted-foreground">Ownership and onboarding</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Service owner" value={customer.owner} />
            <Row label="Onboarded" value={customer.onboarded} />
            <Row label="Tenant" value={tenantName(customer.tenantId)} />
            <Row label="SLA target" value={customer.slaTarget} />
            <Row
              label="Monthly agent spend"
              value={`$${customer.monthlyCostUsd.toLocaleString()}`}
            />
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Budget consumed</span>
                <span className="tabular-nums">{budgetPct}%</span>
              </div>
              <Progress value={budgetPct} />
            </div>
          </div>
        </section>

        <section
          className="ops-panel overflow-hidden rounded-2xl lg:col-span-2"
          aria-label="Registered agents"
        >
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
            <Bot className="size-4 text-brand-coral" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold">Registered agents</h2>
              <p className="text-xs text-muted-foreground">Scoped to this customer estate</p>
            </div>
            <StatusPill tone="info">{custAgents.length}</StatusPill>
          </div>
          <div className="space-y-2 p-4">
            {custAgents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No agents are registered against this estate yet.
              </p>
            ) : (
              custAgents.map((a) => (
                <Link
                  key={a.id}
                  to="/agents/$agentId"
                  params={{ agentId: a.id }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 transition-colors hover:bg-accent/50"
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
          </div>
        </section>
      </div>

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Incident history">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Siren className="size-4 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold">Incident history</h2>
            <p className="text-xs text-muted-foreground">All incidents raised for this estate</p>
          </div>
          {openIncidents > 0 && (
            <StatusPill tone="warning">{openIncidents} open</StatusPill>
          )}
        </div>
        <div className="space-y-2 p-4">
          {custIncidents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No incidents recorded — this estate has been stable across the reporting window.
            </p>
          ) : (
            custIncidents.map((i) => (
              <Link
                key={i.id}
                to="/incidents/$incidentId"
                params={{ incidentId: i.id }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3 transition-colors hover:bg-accent/50"
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
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
