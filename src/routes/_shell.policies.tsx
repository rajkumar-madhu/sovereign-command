import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, CircleSlash, Clock, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity } from "@/components/ops/status-badge";
import { agentName, tenantName } from "@/data/seed";
import type { Policy } from "@/data/types";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/policies")({
  head: () => ({
    meta: [
      { title: "Policy Management · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Editable policy simulation rules, approval gates and dual-control queues governing every agent intent across tenant estates.",
      },
      { property: "og:title", content: "Policy Management · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Simulate, edit and enforce approval, deny and time-window policies for agent intents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PolicyManagement,
});

const EFFECTS: Policy["effect"][] = ["require-approval", "deny", "allow", "time-window"];

const effectTone = {
  "require-approval": "warning",
  deny: "danger",
  allow: "success",
  "time-window": "info",
} as const;

const INTENTS = [
  { id: "db.restart", label: "Restart database replica", policyId: "POL-001" },
  { id: "firewall.change", label: "Modify firewall rule", policyId: "POL-002" },
  { id: "k8s.delete", label: "Delete Kubernetes pod", policyId: "POL-003" },
  { id: "metrics.read", label: "Query Prometheus metrics", policyId: "POL-004" },
  { id: "config.write", label: "Write gateway config (trading hours)", policyId: "POL-005" },
];

function useLiveEvalRate(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(40, Math.min(980, Math.round(v + (Math.random() - 0.45) * 28))));
    }, 1900);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function useLiveQueueAge(baseSec: number) {
  const [sec, setSec] = useState(baseSec);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSec((v) => Math.max(12, Math.min(900, Math.round(v + (Math.random() - 0.35) * 18))));
    }, 2100);
    return () => window.clearInterval(id);
  }, []);
  return sec;
}

function PolicyManagement() {
  const ops = useOps();
  const [editing, setEditing] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [intent, setIntent] = useState(INTENTS[0]!.id);

  const active = ops.policies.filter((p) => p.enabled).length;
  const denyRules = ops.policies.filter((p) => p.effect === "deny" && p.enabled).length;
  const gated = ops.policies.filter((p) => p.effect === "require-approval" && p.enabled).length;
  const pending = ops.approvals.filter((a) => a.status === "pending");
  const liveEvals = useLiveEvalRate(186);
  const liveQueueAge = useLiveQueueAge(142);

  const simulation = useMemo(() => {
    const selected = INTENTS.find((i) => i.id === intent)!;
    const policy = ops.policies.find((p) => p.id === selected.policyId);
    if (!policy || !policy.enabled) {
      return {
        decision: "allowed (no active rule)" as const,
        tone: "warning" as const,
        policy,
        note: "No enabled policy matches this intent, so the gateway would fall back to the agent passport blocklist.",
      };
    }
    const map = {
      deny: { decision: "denied", tone: "danger", note: "The intent never leaves the planner." },
      "require-approval": {
        decision: "approval required",
        tone: "warning",
        note: `Dual control by ${policy.approvers.join(" + ") || "named approvers"}.`,
      },
      allow: { decision: "allowed", tone: "success", note: "Read-only intent permitted without approval." },
      "time-window": {
        decision: "denied in window",
        tone: "danger",
        note: "Blocked inside the protected change window; queued outside it.",
      },
    } as const;
    return { ...map[policy.effect], policy };
  }, [intent, ops.policies]);

  function openEdit(p: Policy) {
    setEditing(p);
    setDraft({ ...p });
  }

  function saveDraft() {
    if (!draft) return;
    ops.updatePolicy(draft.id, {
      name: draft.name,
      description: draft.description,
      effect: draft.effect,
      scope: draft.scope,
      approvers: draft.approvers,
      lastEdited: new Date().toISOString().slice(0, 10),
    });
    setEditing(null);
    toast.success(`${draft.id} updated`, {
      description: "Policy simulation only — no production control plane was changed.",
    });
  }

  const queueAgeLabel =
    liveQueueAge >= 60 ? `${Math.floor(liveQueueAge / 60)}m ${liveQueueAge % 60}s` : `${liveQueueAge}s`;

  return (
    <div className="space-y-6">
      <section
        aria-label="Policy management pulse"
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
              Govern · guardrails
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Policy Management
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Guardrails that decide whether an agent intent is allowed, gated behind dual control,
              or denied. Edits apply to this simulation session only.
            </p>
            <StatusPill tone="success" className="w-fit bg-sidebar-accent-foreground/10 text-sidebar-accent-foreground">
              <BadgeCheck className="mr-1 size-3.5" aria-hidden="true" />
              {active} of {ops.policies.length} rules active
            </StatusPill>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Active", value: active, hint: "enforced" },
              {
                label: "Hard deny",
                value: denyRules,
                hint: "block",
                hot: denyRules > 0,
                icon: true,
              },
              { label: "Approval gates", value: gated, hint: "dual-ctrl" },
              {
                label: "Pending",
                value: pending.length,
                hint: "queue",
                hot: pending.length > 0,
              },
              {
                label: "Evals / min",
                value: liveEvals,
                hint: "live",
                live: true,
              },
              {
                label: "Queue age",
                value: queueAgeLabel,
                hint: "live p50",
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
        title="Rules & simulation"
        description="Toggle enforcement, edit effects, and dry-run candidate intents against the rule set."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Policy Management" }]}
      />
      <SafetyBanner />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Policy rules">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <ShieldQuestion className="size-4 text-brand-coral" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold">Policy rules</h2>
            <p className="text-xs text-muted-foreground">
              Toggle enforcement or edit effect, scope and approvers
            </p>
          </div>
          {denyRules > 0 && (
            <StatusPill tone="danger" className="ml-auto">
              <CircleSlash className="mr-1 size-3" aria-hidden="true" />
              {denyRules} hard deny
            </StatusPill>
          )}
        </div>
        <div className="overflow-x-auto p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Effect</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Approvers</TableHead>
                <TableHead>Last edited</TableHead>
                <TableHead>Enforced</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ops.policies.map((p) => (
                <TableRow key={p.id} className={p.enabled ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="max-w-72">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={effectTone[p.effect]}>{p.effect}</StatusPill>
                  </TableCell>
                  <TableCell className="text-xs">{p.scope}</TableCell>
                  <TableCell className="text-xs">
                    {p.approvers.length > 0 ? (
                      p.approvers.join(", ")
                    ) : (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{p.lastEdited}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.enabled}
                      aria-label={`Enforce ${p.name}`}
                      onCheckedChange={(next) => {
                        ops.togglePolicy(p.id);
                        toast.success(`${p.id} ${next ? "enforced" : "disabled"}`, {
                          description: "Simulated policy change; production enforcement is unchanged.",
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5" aria-label="Policy simulator">
          <div className="mb-4 flex items-center gap-2">
            <BadgeCheck className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Policy simulator</h2>
              <p className="text-xs text-muted-foreground">
                Evaluate a candidate intent against the current rule set
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intent">Candidate intent</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger id="intent" className="bg-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTENTS.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SafetyBanner compact />
            <div className="rounded-xl border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Gateway decision</span>
                <StatusPill tone={simulation.tone}>{simulation.decision}</StatusPill>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{simulation.note}</p>
              {simulation.policy && (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  matched {simulation.policy.id} · {simulation.policy.scope}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-label="Approval queue">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="size-4 text-brand-coral" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-semibold">Approval queue</h2>
              <p className="text-xs text-muted-foreground">
                Dual-control decisions raised by policy gates · live age {queueAgeLabel}
              </p>
            </div>
            {pending.length > 0 && (
              <StatusPill tone="warning">{pending.length} pending</StatusPill>
            )}
          </div>
          <SafetyBanner compact />
          <div className="mt-3 space-y-2">
            {pending.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No approvals pending — every gated intent has been decided.
              </p>
            ) : (
              pending.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-surface/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.request}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tenantName(a.tenantId)} · {agentName(a.agentId)} · requested by{" "}
                        {a.requestedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requires: {a.requiredRoles.join(" + ")}
                      </p>
                    </div>
                    <StatusPill tone={toneForSeverity(a.risk)}>{a.risk}</StatusPill>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        ops.decideApproval(a.id, "approved");
                        toast.success(`${a.id} approved`, {
                          description: "Recorded in the audit trail; no system was modified.",
                        });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        ops.decideApproval(a.id, "rejected");
                        toast.success(`${a.id} rejected`, {
                          description: "Intent returned to the planner as denied.",
                        });
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit policy {draft?.id}</DialogTitle>
            <DialogDescription>
              Changes apply to this simulation session only — the OS never writes to production
              enforcement points.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <SafetyBanner compact />
              <div className="space-y-2">
                <Label htmlFor="p-name">Rule name</Label>
                <Input
                  id="p-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-effect">Effect</Label>
                  <Select
                    value={draft.effect}
                    onValueChange={(v) => setDraft({ ...draft, effect: v as Policy["effect"] })}
                  >
                    <SelectTrigger id="p-effect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EFFECTS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-scope">Scope</Label>
                  <Input
                    id="p-scope"
                    value={draft.scope}
                    onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-appr">Approvers (comma separated)</Label>
                <Input
                  id="p-appr"
                  value={draft.approvers.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      approvers: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveDraft} disabled={!draft?.name.trim()}>
              Save policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
