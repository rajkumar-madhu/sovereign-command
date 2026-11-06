import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import {
  fetchLiveOpenClawPosture,
  fetchLiveSovereignControl,
  type LiveOpenClawCase,
  type LiveOpenClawPosture,
  type LiveSovereignControl,
} from "@/lib/stage1-api";

export const Route = createFileRoute("/_shell/sovereign-control")({
  loader: async (): Promise<{
    live: LiveSovereignControl | null;
    openclaw: LiveOpenClawPosture | null;
  }> => {
    const [live, openclaw] = await Promise.all([
      fetchLiveSovereignControl("tn-nordic"),
      fetchLiveOpenClawPosture("tn-nordic"),
    ]);
    return { live, openclaw };
  },
  head: () => ({
    meta: [
      { title: "Sovereign Control · Wecrew Ops" },
      {
        name: "description",
        content:
          "Stage-1 policy, dual-control, kill switch, and OpenClaw posture. Remediator held.",
      },
    ],
  }),
  component: SovereignControlPage,
});

const OPENCLAW_LABELS: Record<string, string> = {
  "sandboxed-read": "Sandboxed read",
  "host-exec": "Host exec",
  "host-exec-no-ui": "Host exec, no approval UI",
};

function decisionTone(decision: LiveOpenClawCase["decision"]) {
  if (decision === "ALLOW") return "success" as const;
  if (decision === "REQUIRE_APPROVAL") return "warning" as const;
  return "danger" as const;
}

function SovereignControlPage() {
  const { live, openclaw } = Route.useLoaderData() as {
    live: LiveSovereignControl | null;
    openclaw: LiveOpenClawPosture | null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sovereign Control"
        description="Policy · dual-control · kill switch · OpenClaw posture. Remediator stays held."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Sovereign Control" }]}
      />
      <SafetyBanner />

      <section className="ops-panel rounded-2xl p-5" aria-label="Stage-1 sovereign control">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-sm font-semibold">Stage-1 compose</h2>
          {live ? (
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
      <OpenClawPosture live={openclaw} />
    </div>
  );
}

function OpenClawPosture({ live }: { live: LiveOpenClawPosture | null }) {
  return (
    <section className="ops-panel rounded-2xl p-5" id="openclaw" aria-label="OpenClaw posture">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-sm font-semibold">OpenClaw posture</h2>
        {live ? (
          <StatusPill tone="success">live Stage-1</StatusPill>
        ) : (
          <StatusPill tone="info">unreachable</StatusPill>
        )}
        <StatusPill tone="warning">remediator held</StatusPill>
        <StatusPill tone="neutral">wouldExecute false</StatusPill>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Sandbox, tool policy, and elevated exec stay separate. This page cannot submit a command.
      </p>
      {live ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Case</th>
                <th className="px-2 py-2 font-medium">Action</th>
                <th className="px-2 py-2 font-medium">Placement</th>
                <th className="px-2 py-2 font-medium">Decision</th>
                <th className="px-2 py-2 font-medium">Execute</th>
              </tr>
            </thead>
            <tbody>
              {live.cases.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="px-2 py-3">{OPENCLAW_LABELS[row.id] ?? row.id}</td>
                  <td className="px-2 py-3 font-mono text-[12px]">{row.action}</td>
                  <td className="px-2 py-3 font-mono text-[12px]">{row.placement}</td>
                  <td className="px-2 py-3">
                    <StatusPill tone={decisionTone(row.decision)}>{row.decision}</StatusPill>
                  </td>
                  <td className="px-2 py-3 font-mono text-[12px]">false</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Stage-1 OpenClaw posture is unreachable. No command is sent, and the remediator stays held.
        </p>
      )}
    </section>
  );
}
