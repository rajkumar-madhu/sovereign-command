import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, CircleSlash, Clock, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity } from "@/components/ops/status-badge";
import { agentName, tenantName } from "@/data/seed";
import type { Policy } from "@/data/types";
import { useOps } from "@/lib/ops-context";

export const Route = createFileRoute("/_shell/policies")({
  head: () => ({
    meta: [
      { title: "Policy Management · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Policy rules, approval gates and dual-control queues governing every agent intent across tenant estates.",
      },
      { property: "og:title", content: "Policy Management · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Edit and enforce approval, deny and time-window policies for agent intents.",
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

function PolicyManagement() {
  const ops = useOps();
  const [editing, setEditing] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [intent, setIntent] = useState(INTENTS[0]!.id);

  const active = ops.policies.filter((p) => p.enabled).length;
  const denyRules = ops.policies.filter((p) => p.effect === "deny" && p.enabled).length;
  const gated = ops.policies.filter((p) => p.effect === "require-approval" && p.enabled).length;
  const pending = ops.approvals.filter((a) => a.status === "pending");

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
      description: "Policy update recorded for enforcement sync.",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Management"
        description="Editable guardrails that decide whether an agent intent is allowed, gated behind approval, or denied outright."
        crumbs={[{ label: "Govern", to: "/" }, { label: "Policy Management" }]}
        actions={<StatusPill tone="success">{active} of {ops.policies.length} rules active</StatusPill>}
      />
      <SafetyBanner />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active policies" value={active} icon={<BadgeCheck className="size-4" aria-hidden="true" />} />
        <MetricCard label="Hard deny rules" value={denyRules} tone="danger" icon={<CircleSlash className="size-4" aria-hidden="true" />} />
        <MetricCard label="Approval gates" value={gated} tone="warning" icon={<ShieldQuestion className="size-4" aria-hidden="true" />} />
        <MetricCard label="Pending approvals" value={pending.length} tone="info" icon={<Clock className="size-4" aria-hidden="true" />} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Policy rules</CardTitle>
          <CardDescription>Toggle enforcement or edit effect, scope and approvers.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                  <TableCell><StatusPill tone={effectTone[p.effect]}>{p.effect}</StatusPill></TableCell>
                  <TableCell className="text-xs">{p.scope}</TableCell>
                  <TableCell className="text-xs">
                    {p.approvers.length > 0 ? p.approvers.join(", ") : <span className="text-muted-foreground">none</span>}
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
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policy evaluation</CardTitle>
            <CardDescription>Evaluate a candidate intent against the current rule set.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intent">Candidate intent</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger id="intent"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENTS.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SafetyBanner compact />
            <div className="rounded-lg border border-border bg-muted/30 p-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>Dual-control decisions raised by policy gates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <SafetyBanner compact />
            {pending.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No approvals pending — every gated intent has been decided.
              </p>
            ) : (
              pending.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.request}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tenantName(a.tenantId)} · {agentName(a.agentId)} · requested by {a.requestedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">Requires: {a.requiredRoles.join(" + ")}</p>
                    </div>
                    <StatusPill tone={toneForSeverity(a.risk)}>{a.risk}</StatusPill>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        ops.decideApproval(a.id, "approved");
                        toast.success(`${a.id} approved`, { description: "Recorded in the audit trail." });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        ops.decideApproval(a.id, "rejected");
                        toast.success(`${a.id} rejected`, { description: "Intent returned to the planner as denied." });
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit policy {draft?.id}</DialogTitle>
            <DialogDescription>
              Updates are versioned and synced to the policy control plane after dual-control approval where required.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <SafetyBanner compact />
              <div className="space-y-2">
                <Label htmlFor="p-name">Rule name</Label>
                <Input id="p-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea id="p-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-effect">Effect</Label>
                  <Select
                    value={draft.effect}
                    onValueChange={(v) => setDraft({ ...draft, effect: v as Policy["effect"] })}
                  >
                    <SelectTrigger id="p-effect"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EFFECTS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-scope">Scope</Label>
                  <Input id="p-scope" value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })} />
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
                      approvers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={!draft?.name.trim()}>Save policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
