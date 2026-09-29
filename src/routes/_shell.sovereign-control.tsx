import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchLiveSovereignControl,
  stage1ApiConfigured,
  type LiveSovereignControl,
} from "@/lib/stage1-api";

export const Route = createFileRoute("/_shell/sovereign-control")({
  loader: async (): Promise<{ live: LiveSovereignControl | null }> => {
    const live = await fetchLiveSovereignControl("tn-nordic");
    return { live };
  },
  head: () => ({
    meta: [
      { title: "Sovereign Control · Wecrew Ops" },
      {
        name: "description",
        content: "Stage-1 policy, dual-control, kill switch, and L2 autonomy. Remediator held.",
      },
    ],
  }),
  component: SovereignControlPage,
});

function SovereignControlPage() {
  const { live } = Route.useLoaderData() as { live: LiveSovereignControl | null };
  const tiles = [
    { label: "Autonomy", value: live?.autonomyLevel ?? "L2", hint: "investigate" },
    {
      label: "Policy",
      value: live?.policy?.decision ?? "—",
      hint: live?.policy?.action ?? "no live policy",
    },
    {
      label: "Approval",
      value: live?.approval?.status ?? "—",
      hint: "dual-control",
      live: live?.approval?.status === "pending",
    },
    {
      label: "Kill switch",
      value: live?.killSwitch?.engaged ? "engaged" : "idle",
      hint: "per tenant",
      hot: Boolean(live?.killSwitch?.engaged),
    },
    {
      label: "Would execute",
      value: live ? String(live.wouldExecute) : "—",
      hint: "stage-1 hold",
    },
    { label: "Remediator", value: "held", hint: "read-only" },
  ];

  return (
    <div className="space-y-6">
      {/* Same hero shell as the other dashboards (SOC, Token & Cost, Command Centre). */}
      <section
        aria-label="Sovereign control pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div
          className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · sovereign control
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Sovereign Control
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Policy · dual-control · kill switch · L2 investigate. Remediator stays held.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              >
                <Link to="/approvals">Approvals</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/policies">Policies</Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {tiles.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "font-display mt-1 truncate text-xl font-semibold",
                    s.hot ? "text-destructive" : "text-sidebar-accent-foreground",
                  )}
                >
                  {s.live && (
                    <span className="mr-1.5 inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral align-middle" />
                  )}
                  {s.value}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-sidebar-foreground/50">
                  {s.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Control state"
        description="Live Stage-1 policy, approval and kill-switch state for this tenant."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Sovereign Control" }]}
      />
      <SafetyBanner />

      <section className="ops-panel rounded-2xl p-5" aria-label="Stage-1 sovereign control">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-sm font-semibold">Stage-1 compose</h2>
          {stage1ApiConfigured() && live ? (
            <StatusPill tone="success">live Stage-1</StatusPill>
          ) : (
            <StatusPill tone="info">seed / unreachable</StatusPill>
          )}
          <StatusPill tone="warning">remediator held</StatusPill>
          <StatusPill tone={live?.killSwitch?.engaged ? "danger" : "success"}>
            kill switch {live?.killSwitch?.engaged ? "engaged" : "idle"}
          </StatusPill>
        </div>
        {live ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Tenant", live.tenantId],
              ["Autonomy", live.autonomyLevel ?? "L2"],
              ["Policy", `${live.policy?.action ?? "—"} · ${live.policy?.decision ?? "—"}`],
              ["Approval", live.approval?.status ?? "—"],
              ["Would execute", String(live.wouldExecute)],
              ["Kill switch", live.killSwitch?.reason ?? "idle"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 truncate font-mono text-[12px]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Stage-1 API unreachable. Policy and approval queues still apply; remediator stays held.
          </p>
        )}
      </section>
    </div>
  );
}
