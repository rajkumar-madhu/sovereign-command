import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useOps } from "@/lib/ops-context";
import { agentName, tenantName } from "@/data/seed";
import { evaluateApprovalSla, formatCountdown, type ApprovalSla, type SlaState } from "@/lib/approval-sla";

/** Live clock used to drive approval SLA countdowns (1s cadence). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface ApprovalSlaFeed {
  now: number;
  pending: ApprovalSla[];
  atRisk: ApprovalSla[];
  breached: ApprovalSla[];
  alertCount: number;
}

/** Evaluates every pending approval against its dual-control SLA on each tick. */
export function useApprovalSlaFeed(): ApprovalSlaFeed {
  const { approvals } = useOps();
  const now = useNow();

  return useMemo(() => {
    const pending = approvals
      .filter((a) => a.status === "pending")
      .map((a) => evaluateApprovalSla(a, now))
      .sort((a, b) => a.remainingMinutes - b.remainingMinutes);
    const atRisk = pending.filter((p) => p.state === "at-risk");
    const breached = pending.filter((p) => p.state === "breached");
    return { now, pending, atRisk, breached, alertCount: atRisk.length + breached.length };
  }, [approvals, now]);
}

/** Fires a toast the first time an approval enters at-risk, and again on breach. */
export function useApprovalSlaAlerts(): ApprovalSlaFeed {
  const feed = useApprovalSlaFeed();
  const announced = useRef<Map<string, SlaState>>(new Map());

  useEffect(() => {
    for (const item of feed.pending) {
      if (item.state === "on-track") continue;
      const previous = announced.current.get(item.approval.id);
      if (previous === item.state) continue;
      if (previous === "breached") continue;
      announced.current.set(item.approval.id, item.state);
      const description = `${tenantName(item.approval.tenantId)} · ${agentName(item.approval.agentId)} · ${formatCountdown(item.remainingMinutes)}`;
      if (item.state === "breached") {
        toast.error(`Approval SLA breached: ${item.approval.request}`, { description, duration: 8000 });
      } else {
        toast.warning(`Approval nearing SLA: ${item.approval.request}`, { description, duration: 7000 });
      }
    }
  }, [feed.pending]);

  return feed;
}
