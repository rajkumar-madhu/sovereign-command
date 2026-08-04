import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlarmClock, BellRing, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/components/ops/metric-card";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity } from "@/components/ops/status-badge";
import { useOps } from "@/lib/ops-context";
import { useApprovalSlaFeed } from "@/lib/use-approval-sla";
import { formatCountdown, slaLabel, slaTone, SLA_MINUTES } from "@/lib/approval-sla";
import { agentName, tenantName } from "@/data/seed";

export const Route = createFileRoute("/_shell/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Real-time queue of pending dual-control approvals with live SLA countdowns, at-risk alerts and approve or reject decisions.",
      },
      { property: "og:title", content: "Approval Queue · Sovereign Agentic Operations OS" },
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
  const { decideApproval, approvals } = useOps();
  const feed = useApprovalSlaFeed();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [onlyAlerts, setOnlyAlerts] = useState(false);

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

  function decide(id: string, request: string, status: "approved" | "rejected") {
    decideApproval(id, status);
    if (status === "approved") {
      toast.success("Approval recorded", {
        description: `${request} — dual control satisfied and written to the audit trail. No production change is executed.`,
      });
    } else {
      toast.error("Request rejected", {
        description: `${request} — the requesting agent is notified and the intent is closed.`,
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Live dual-control queue. Countdowns refresh every second and alert before the approval SLA is breached."
        crumbs={[{ label: "Govern", to: "/" }, { label: "Approval Queue" }]}
        actions={
          <Button asChild variant="outline">
            <Link to="/policies">Policy management</Link>
          </Button>
        }
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Pending approvals" value={feed.pending.length} hint="Awaiting dual control" icon={<Clock className="size-4" aria-hidden="true" />} />
        <MetricCard label="Approaching SLA" value={feed.atRisk.length} tone="warning" hint="Over 70% of window consumed" icon={<BellRing className="size-4" aria-hidden="true" />} />
        <MetricCard label="SLA breached" value={feed.breached.length} tone="danger" hint="Escalated to the tenant owner" icon={<AlarmClock className="size-4" aria-hidden="true" />} />
        <MetricCard label="Decided this session" value={decided} tone="success" hint="Approved or rejected" icon={<CheckCircle2 className="size-4" aria-hidden="true" />} />
      </section>

      {feed.alertCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {feed.alertCount} approval{feed.alertCount === 1 ? "" : "s"} need a decision now
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {feed.breached.length} breached · {feed.atRisk.length} approaching threshold. Approvers are paged in the
                notification tray as each threshold is crossed.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOnlyAlerts(true)}>
            Show only alerts
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending dual-control requests</CardTitle>
          <CardDescription>
            SLA windows: critical {SLA_MINUTES.critical}m · high {SLA_MINUTES.high}m · medium {SLA_MINUTES.medium}m ·
            low {SLA_MINUTES.low}m.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search request, tenant, agent, approver role"
              aria-label="Search approval queue"
              className="lg:max-w-sm"
            />
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="lg:w-52" aria-label="Filter by SLA state">
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

          {rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {feed.pending.length === 0
                ? "No approvals are pending. New agent intents that require dual control will appear here in real time."
                : "No pending approvals match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Approvers</TableHead>
                    <TableHead className="w-56">SLA</TableHead>
                    <TableHead className="text-right">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.approval.id} className={item.state === "breached" ? "bg-destructive/5" : undefined}>
                      <TableCell className="max-w-72">
                        <p className="text-sm font-medium">{item.approval.request}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {item.approval.id} · requested by {item.approval.requestedBy}
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
                          <Button size="sm" onClick={() => decide(item.approval.id, item.approval.request, "approved")}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => decide(item.approval.id, item.approval.request, "rejected")}
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
        </CardContent>
      </Card>
    </div>
  );
}
