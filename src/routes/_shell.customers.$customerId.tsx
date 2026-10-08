import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Bot, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForStatus } from "@/components/ops/status-badge";
import { isLiveCluster } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/customers/$customerId")({
  loader: ({ params }) => ({ customerId: params.customerId }),
  head: ({ params }) => {
    const name = params.customerId;
    return {
      meta: [
        { title: `${name} · Customer Detail · Wecrew Ops` },
        {
          name: "description",
          content: `Live Finspot-dev namespace ${name}: pods, phase and attention workloads.`,
        },
        { property: "og:title", content: `${name} · Namespace` },
        {
          property: "og:description",
          content: `Live Kubernetes namespace ${name} from the existing Finspot-dev client.`,
        },
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

function CustomerDetail() {
  const { customerId } = Route.useLoaderData();
  const ops = useOps();
  const customer = ops.customers.find((c) => c.id === customerId);
  if (!customer) {
    if (!ops.clusterSnapshot) {
      return (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">Connecting to Finspot-dev</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Live namespace inventory has not arrived yet.
          </p>
        </div>
      );
    }
    return <CustomerNotFound />;
  }
  const snapshot = ops.clusterSnapshot;
  const pods = isLiveCluster(snapshot)
    ? snapshot.pods.filter((p) => p.namespace === customer.name)
    : [];
  const attention = pods.filter(
    (p) => p.crashLoop || (p.phase !== "Running" && p.phase !== "Succeeded"),
  );
  const tenantLabel = ops.tenants.find((t) => t.id === customer.tenantId)?.name ?? customer.tenantId;

  return (
    <div className="space-y-6">
      <section
        aria-label="Customer estate pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div
          className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]"
          aria-hidden="true"
        />
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
              {customer.industry} · {tenantLabel} · SLA {customer.slaTarget}
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
              { label: "Pods", value: pods.length, hint: "scoped" },
              {
                label: "Attention",
                value: attention.length,
                hint: "workloads",
                hot: attention.length > 0,
              },
              {
                label: "Spend",
                value: "$0",
                hint: "read-only",
              },
              {
                label: "Health",
                value: customer.health,
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
            <Row label="Tenant" value={tenantLabel} />
            <Row label="SLA target" value={customer.slaTarget} />
            <Row label="Monthly agent spend" value="$0" />
          </div>
        </section>

        <section
          className="ops-panel overflow-hidden rounded-2xl lg:col-span-2"
          aria-label="Registered agents"
        >
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
            <Bot className="size-4 text-brand-coral" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold">Live pods</h2>
              <p className="text-xs text-muted-foreground">Workloads in this namespace</p>
            </div>
            <StatusPill tone="info">{pods.length}</StatusPill>
          </div>
          <div className="space-y-2 p-4">
            {pods.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No pods in this namespace.
              </p>
            ) : (
              pods.map((pod) => (
                <div
                  key={pod.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium">{pod.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {pod.ready} · restarts {pod.restarts}
                      {pod.nodeName ? ` · ${pod.nodeName}` : ""}
                    </p>
                  </div>
                  <StatusPill tone={pod.crashLoop || pod.phase !== "Running" ? "danger" : "success"}>
                    {pod.phase}
                  </StatusPill>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Incident history">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Siren className="size-4 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold">Attention workloads</h2>
            <p className="text-xs text-muted-foreground">CrashLoop or non-running pods</p>
          </div>
          {attention.length > 0 && <StatusPill tone="warning">{attention.length} open</StatusPill>}
        </div>
        <div className="space-y-2 p-4">
          {attention.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No attention pods in this namespace.
            </p>
          ) : (
            attention.map((pod) => (
              <div
                key={pod.name}
                className="block rounded-xl border border-border bg-surface/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium">{pod.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {pod.reason ?? pod.phase} · restarts {pod.restarts}
                    </p>
                  </div>
                  <StatusPill tone="danger">{pod.phase}</StatusPill>
                </div>
              </div>
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
