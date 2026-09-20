import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity } from "@/components/ops/status-badge";
import { useOps } from "@/lib/ops-context";
import { getSession } from "@/lib/session";
import {
  STAGE1_APPROVAL_ID,
  decideLiveApproval,
  fetchLiveApproval,
  stage1ApiConfigured,
} from "@/lib/stage1-api";
import { useApprovalSlaFeed } from "@/lib/use-approval-sla";
import { formatCountdown, formatWindow, slaLabel, slaTone } from "@/lib/approval-sla";
import { approversFor, tierLabel, tierTone, type EscalationTier } from "@/lib/escalation";
import { agentName, tenantName } from "@/data/seed";

const UNDO_WINDOW_MS = 12000;

interface BulkOutcome {
  id: string;
  request: string;
  tenant: string;
  agent: string;
  risk: string;
  slaState: string;
  countdown: string;
  outcome: "approved" | "rejected";
  note: string;
}

export const Route = createFileRoute("/_shell/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue · Wecrew Ops" },
      {
        name: "description",
        content:
          "Real-time queue of pending dual-control approvals with live SLA countdowns, at-risk alerts and approve or reject decisions.",
      },
      { property: "og:title", content: "Approval Queue · Wecrew Ops" },
      {
        property: "og:description",
        content: "Track pending agent approvals approaching their SLA threshold and decide before they breach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalQueue,
});

function ApprovalQueue() {
  const {
    decideApproval,
    decideApprovals,
    hydrateApproval,
    revertApprovals,
    approvals,
    slaConfig,
    escalationTiers,
    escalationLog,
    escalateApproval,
  } = useOps();
  const feed = useApprovalSlaFeed();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<"approved" | "rejected" | null>(null);
  const [batch, setBatch] = useState<{ outcomes: BulkOutcome[]; expiresAt: number } | null>(null);
  const [liveStage1, setLiveStage1] = useState(false);
  const undoTimer = useRef<number | null>(null);

  // Hydrate once on mount — live Stage-1 is the source of truth for apr-clb-01.
  useEffect(() => {
    if (!stage1ApiConfigured()) return;
    let cancelled = false;
    fetchLiveApproval(STAGE1_APPROVAL_ID, "tn-nordic").then((live) => {
      if (cancelled || !live) return;
      setLiveStage1(true);
      hydrateApproval({
        id: live.id,
        request: live.request,
        agentId: live.agentId,
        tenantId: live.tenantId,
        requiredRoles: live.requiredRoles,
        approvedRoles: live.approvedRoles,
        risk: live.risk,
        requestedAt: live.requestedAt,
        status: live.status,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.pending.filter((item) => {
      if (onlyAlerts && item.state === "on-track") return false;
      if (stateFilter !== "all" && item.state !== stateFilter) return false;
      if (!q) return true;
      return [
        item.approval.request,
        item.approval.id,
        tenantName(item.approval.tenantId),
        agentName(item.approval.agentId),
        item.approval.requestedBy,
        item.approval.requiredRoles.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [feed.pending, onlyAlerts, query, stateFilter]);

  const decided = approvals.filter((a) => a.status !== "pending").length;
  const escalatedCount = feed.pending.filter((p) => (escalationTiers[p.approval.id] ?? "primary") !== "primary").length;
  const pendingIds = useMemo(() => rows.map((r) => r.approval.id), [rows]);
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.includes(r.approval.id)),
    [rows, selected],
  );

  // Drop selections that are no longer pending/visible.
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => pendingIds.includes(id)));
  }, [pendingIds]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const allVisibleSelected = pendingIds.length > 0 && selectedRows.length === pendingIds.length;

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }

  async function postLiveDecide(
    approval: { id: string; tenantId: string; requiredRoles: string[]; approvedRoles?: string[] },
    status: "approved" | "rejected",
  ): Promise<{ ok: boolean; remaining?: string[] }> {
    if (approval.id !== STAGE1_APPROVAL_ID || !stage1ApiConfigured()) return { ok: true };
    const signed = approval.approvedRoles ?? [];
    const nextRole = approval.requiredRoles.find((role) => !signed.includes(role));
    if (status === "approved" && !nextRole) {
      toast("Already decided", { description: "Stage-1 dual-control is complete. Remediator stays held." });
      return { ok: false };
    }
    const session = getSession();
    const actorId =
      status === "rejected"
        ? session?.email
        : session?.kind === "demo" && nextRole
          ? `demo:${nextRole}`
          : session?.email;
    const live = await decideLiveApproval({
      id: approval.id,
      decision: status,
      tenantId: approval.tenantId,
      actorRoles: status === "approved" && nextRole ? [nextRole] : [],
      actorId,
    });
    if (!live.ok) {
      toast.error("Stage-1 decide blocked", { description: live.error });
      return { ok: false };
    }
    setLiveStage1(true);
    hydrateApproval({
      id: approval.id,
      status: live.result.approval.status,
      approvedRoles: live.result.approval.approvedRoles,
    });
    const remaining = live.result.approval.requiredRoles.filter(
      (role) => !live.result.approval.approvedRoles.includes(role),
    );
    return { ok: true, remaining };
  }

  async function runBulk(status: "approved" | "rejected") {
    const liveRow = selectedRows.find((item) => item.approval.id === STAGE1_APPROVAL_ID);
    if (liveRow) {
      const posted = await postLiveDecide(liveRow.approval, status);
      if (!posted.ok) {
        setConfirmAction(null);
        return;
      }
      if (status === "approved" && posted.remaining && posted.remaining.length > 0) {
        setConfirmAction(null);
        toast.success("Stage-1 signature recorded", {
          description: `${posted.remaining.join(" + ")} still required. Remediator stays held.`,
        });
        return;
      }
    }

    const outcomes: BulkOutcome[] = selectedRows.map((item) => ({
      id: item.approval.id,
      request: item.approval.request,
      tenant: tenantName(item.approval.tenantId),
      agent: agentName(item.approval.agentId),
      risk: item.approval.risk,
      slaState: slaLabel(item.state),
      countdown: formatCountdown(item.remainingMinutes),
      outcome: status,
      note:
        item.approval.id === STAGE1_APPROVAL_ID
          ? status === "approved"
            ? "Dual-control recorded on Stage-1. Remediator held — no production change executed."
            : "Rejected on Stage-1. Remediator was not started."
          : status === "approved"
            ? item.state === "breached"
              ? "Approved after SLA breach — escalation recorded in the audit trail."
              : "Dual control satisfied; written to the audit trail. No production change executed."
            : "Rejected; requesting agent notified and the intent is closed.",
    }));

    const ids = outcomes.map((o) => o.id);
    decideApprovals(ids, status);
    setSelected([]);
    setConfirmAction(null);
    const expiresAt = Date.now() + UNDO_WINDOW_MS;
    setBatch({ outcomes, expiresAt });

    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setBatch(null), UNDO_WINDOW_MS);

    const verb = status === "approved" ? "approved" : "rejected";
    const message = `${ids.length} approval${ids.length === 1 ? "" : "s"} ${verb}`;
    const liveSealed = ids.includes(STAGE1_APPROVAL_ID) && (liveStage1 || Boolean(liveRow));
    const options = liveSealed
      ? {
          description: "Stage-1 decide is sealed. Remediator stays held. Seed rows can still be undone.",
          duration: UNDO_WINDOW_MS,
        }
      : {
          description: `Undo available for ${Math.round(UNDO_WINDOW_MS / 1000)}s before the batch is sealed.`,
          duration: UNDO_WINDOW_MS,
          action: { label: "Undo", onClick: () => undoBatch(ids) },
        };
    if (status === "approved") toast.success(message, options);
    else toast.error(message, options);
  }

  function undoBatch(ids: string[]) {
    const revertIds = liveStage1 ? ids.filter((id) => id !== STAGE1_APPROVAL_ID) : ids;
    revertApprovals(revertIds);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setBatch(null);
    toast("Batch reverted", {
      description:
        revertIds.length === ids.length
          ? `${ids.length} approval${ids.length === 1 ? "" : "s"} returned to the pending queue with live SLA countdowns.`
          : "Seed rows reverted. Stage-1 apr-clb-01 stays decided; remediator remains held.",
    });
  }

  async function decide(
    id: string,
    request: string,
    status: "approved" | "rejected",
    tenantId: string,
    requiredRoles: string[],
    approvedRoles?: string[],
  ) {
    const posted = await postLiveDecide({ id, tenantId, requiredRoles, approvedRoles }, status);
    if (!posted.ok) return;
    if (
      id === STAGE1_APPROVAL_ID &&
      stage1ApiConfigured() &&
      status === "approved" &&
      posted.remaining &&
      posted.remaining.length > 0
    ) {
      toast.success("Stage-1 signature recorded", {
        description: `${request} — ${posted.remaining.join(" + ")} still required. Remediator stays held.`,
      });
      return;
    }
    if (id !== STAGE1_APPROVAL_ID || !stage1ApiConfigured()) {
      decideApproval(id, status);
    }
    if (status === "approved") {
      toast.success("Approval recorded", {
        description:
          id === STAGE1_APPROVAL_ID && stage1ApiConfigured()
            ? `${request} — dual control recorded on Stage-1. Remediator held; no production change executed.`
            : `${request} — dual control satisfied and written to the audit trail. No production change is executed.`,
      });
    } else {
      toast.error("Request rejected", {
        description:
          id === STAGE1_APPROVAL_ID && stage1ApiConfigured()
            ? `${request} — rejected on Stage-1. Remediator was not started.`
            : `${request} — the requesting agent is notified and the intent is closed.`,
      });
    }
  }

  function escalateNow(item: (typeof rows)[number]) {
    const current = escalationTiers[item.approval.id] ?? "primary";
    const next: EscalationTier = current === "primary" ? "backup" : "duty-manager";
    const routed = escalateApproval(
      item.approval,
      next,
      `Manual escalation — ${formatCountdown(item.remainingMinutes)}`,
      "manual",
    );
    if (!routed) {
      toast("Already at the highest tier", {
        description: `${item.approval.request} is with the tenant duty manager.`,
      });
      return;
    }
    toast.warning(`Escalated to ${tierLabel(next).toLowerCase()}`, {
      description: `${item.approval.request} — ${approversFor(item.approval, next)
        .map((a) => `${a.name} (${a.channel})`)
        .join(", ")}`,
    });
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Approval queue pulse"
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
              Govern · dual control
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Approval Queue
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Live dual-control queue. Countdowns refresh every second. CrashLoop approval{" "}
              <span className="font-mono">apr-clb-01</span> decides on Stage-1 — remediator stays
              held. Other rows stay session-local.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white">
                <Link to="/sla-admin">SLA administration</Link>
              </Button>
              {feed.alertCount > 0 && (
                <Button
                  variant="outline"
                  className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
                  onClick={() => setOnlyAlerts(true)}
                >
                  Show {feed.alertCount} alert{feed.alertCount === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Pending", value: feed.pending.length, hint: "awaiting" },
              {
                label: "At risk",
                value: feed.atRisk.length,
                hint: "SLA",
                hot: feed.atRisk.length > 0,
              },
              {
                label: "Breached",
                value: feed.breached.length,
                hint: "escalate",
                hot: feed.breached.length > 0,
              },
              { label: "Escalated", value: escalatedCount, hint: "routed" },
              { label: "Decided", value: decided, hint: "session" },
              { label: "Live", value: "1s", hint: "tick", live: true },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  {s.label}
                </p>
                <p
                  className={`font-display mt-1 text-2xl font-semibold tabular-nums ${
                    s.hot ? "text-destructive" : "text-sidebar-accent-foreground"
                  }`}
                >
                  {s.live ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral" />
                      {s.value}
                    </span>
                  ) : (
                    s.value
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Pending dual-control"
        description={`Default windows: critical ${formatWindow(slaConfig.defaults.critical)} · high ${formatWindow(slaConfig.defaults.high)} · medium ${formatWindow(slaConfig.defaults.medium)} · low ${formatWindow(slaConfig.defaults.low)}. Alerts at ${Math.round(slaConfig.atRiskPct)}% consumed.`}
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Approval Queue" }]}
      />
      <SafetyBanner compact />

      {feed.alertCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {feed.alertCount} approval{feed.alertCount === 1 ? "" : "s"} need a decision now
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {feed.breached.length} breached · {feed.atRisk.length} approaching threshold.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOnlyAlerts(true)}>
            Show only alerts
          </Button>
        </div>
      )}

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Pending approvals">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-display text-sm font-semibold">Queue</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select requests for bulk decide — every batch is confirmed, itemised and reversible.
          </p>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search request, tenant, agent, approver role"
              aria-label="Search approval queue"
              className="bg-surface lg:max-w-sm"
            />
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="bg-surface lg:w-52" aria-label="Filter by SLA state">
                <SelectValue placeholder="SLA state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SLA states</SelectItem>
                <SelectItem value="breached">Breached</SelectItem>
                <SelectItem value="at-risk">At risk</SelectItem>
                <SelectItem value="on-track">On track</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={onlyAlerts} onCheckedChange={setOnlyAlerts} aria-label="Only show SLA alerts" />
              Only SLA alerts
            </label>
          </div>

          {rows.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {selectedRows.length === 0
                  ? "Select requests to approve or reject in bulk."
                  : `${selectedRows.length} of ${rows.length} request${rows.length === 1 ? "" : "s"} selected`}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(allVisibleSelected ? [] : pendingIds)}
                >
                  {allVisibleSelected ? "Clear selection" : "Select all filtered"}
                </Button>
                <Button size="sm" disabled={selectedRows.length === 0} onClick={() => setConfirmAction("approved")}>
                  Approve selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedRows.length === 0}
                  onClick={() => setConfirmAction("rejected")}
                >
                  Reject selected
                </Button>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {feed.pending.length === 0
                ? "No approvals are pending. New agent intents that require dual control will appear here in real time."
                : "No pending approvals match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(v) => setSelected(v === true ? pendingIds : [])}
                        aria-label="Select all filtered approvals"
                      />
                    </TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Approvers</TableHead>
                    <TableHead>Routed to</TableHead>
                    <TableHead className="w-56">SLA</TableHead>
                    <TableHead className="text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.approval.id} className={item.state === "breached" ? "bg-destructive/5" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(item.approval.id)}
                          onCheckedChange={(v) => toggleRow(item.approval.id, v === true)}
                          aria-label={`Select ${item.approval.request}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-72">
                        <p className="text-sm font-medium">{item.approval.request}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {item.approval.id} · requested by {item.approval.requestedBy}
                          {liveStage1 && item.approval.id === STAGE1_APPROVAL_ID
                            ? ` · live Stage-1${item.approval.approvedRoles?.length ? ` · signed ${item.approval.approvedRoles.join(", ")}` : ""}`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{tenantName(item.approval.tenantId)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{agentName(item.approval.agentId)}</TableCell>
                      <TableCell>
                        <StatusPill tone={toneForSeverity(item.approval.risk)}>{item.approval.risk}</StatusPill>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.approval.requiredRoles.join(" + ")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(() => {
                          const tier = escalationTiers[item.approval.id] ?? "primary";
                          return (
                            <div className="space-y-1">
                              <StatusPill tone={tierTone(tier)}>{tierLabel(tier)}</StatusPill>
                              <p className="text-muted-foreground">
                                {approversFor(item.approval, tier)
                                  .map((a) => a.name)
                                  .join(", ")}
                              </p>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <StatusPill tone={slaTone(item.state)}>{slaLabel(item.state)}</StatusPill>
                            <span className="text-xs tabular-nums text-muted-foreground" aria-live="off">
                              {formatCountdown(item.remainingMinutes)}
                            </span>
                          </div>
                          <Progress value={item.consumedPct} aria-label={`${Math.round(item.consumedPct)}% of SLA window consumed`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => escalateNow(item)}>
                            Escalate
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              void decide(
                                item.approval.id,
                                item.approval.request,
                                "approved",
                                item.approval.tenantId,
                                item.approval.requiredRoles,
                                item.approval.approvedRoles,
                              )
                            }
                          >
                            {liveStage1 && item.approval.id === STAGE1_APPROVAL_ID
                              ? `Sign ${item.approval.requiredRoles.find((role) => !(item.approval.approvedRoles ?? []).includes(role)) ?? "next"}`
                              : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void decide(
                                item.approval.id,
                                item.approval.request,
                                "rejected",
                                item.approval.tenantId,
                                item.approval.requiredRoles,
                                item.approval.approvedRoles,
                              )
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {batch && (
        <section className="ops-panel overflow-hidden rounded-2xl" role="status" aria-live="polite">
          <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold">Batch outcomes</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {batch.outcomes.length} request{batch.outcomes.length === 1 ? "" : "s"} decided. Undo returns every item
                to the pending queue before the window seals.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => undoBatch(batch.outcomes.map((o) => o.id))}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Undo batch
            </Button>
          </div>
          <div className="overflow-x-auto p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>SLA at decision</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.outcomes.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="max-w-72">
                      <p className="text-sm font-medium">{o.request}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{o.id}</p>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{o.tenant}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{o.agent}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {o.slaState} · {o.countdown}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={o.outcome === "approved" ? "success" : "danger"}>
                        {o.outcome === "approved" ? (
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="size-3.5" aria-hidden="true" />
                        )}
                        {o.outcome}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section className="ops-panel overflow-hidden rounded-2xl">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-display text-sm font-semibold">Escalation notification history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Append-only record of pages as SLA breach became imminent.
          </p>
        </div>
        <div className="p-4">
          {escalationLog.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No escalations yet. Pages appear here as approvals approach or pass their SLA window, or when you escalate
              manually.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time (UTC)</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Routed to</TableHead>
                    <TableHead>Notified</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalationLog.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                        {event.time.replace("T", " ").slice(0, 19)}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <p className="text-sm font-medium">{event.request}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{event.approvalId}</p>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{tenantName(event.tenantId)}</TableCell>
                      <TableCell>
                        <StatusPill tone={tierTone(event.tier)}>{tierLabel(event.tier)}</StatusPill>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.approvers.map((a) => (
                          <p key={a.name + a.role}>
                            {a.name} · {a.channel}
                          </p>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap capitalize text-muted-foreground">
                        {event.trigger}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{event.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approved" ? "Approve" : "Reject"} {selectedRows.length} request
              {selectedRows.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approved"
                ? "Dual control is recorded for each request and written to the audit trail. No production change is executed."
                : "Each requesting agent is notified and the intent is closed."}{" "}
              You can undo the whole batch for {Math.round(UNDO_WINDOW_MS / 1000)} seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {selectedRows.map((item) => (
              <div key={item.approval.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.approval.request}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenantName(item.approval.tenantId)} · {agentName(item.approval.agentId)}
                  </p>
                </div>
                <StatusPill tone={slaTone(item.state)}>{formatCountdown(item.remainingMinutes)}</StatusPill>
              </div>
            ))}
          </div>
          <SafetyBanner compact />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && runBulk(confirmAction)}>
              {confirmAction === "approved" ? "Approve all" : "Reject all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
