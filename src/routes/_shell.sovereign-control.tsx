import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sovereign Control"
        description="Policy · dual-control · kill switch · L2 investigate. Remediator stays held."
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/policies">Policies</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/approvals">Approvals</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
