import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, FileCheck2, Filter, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForStatus } from "@/components/ops/status-badge";
import { agentName, agents, auditLog, tenantName, tenants } from "@/data/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/audit")({
  head: () => ({
    meta: [
      { title: "Audit & Compliance · Wecrew Ops" },
      {
        name: "description",
        content:
          "Immutable, searchable audit trail of every agent action with correlation ID, user, agent, tenant, tool, decision and outcome.",
      },
      { property: "og:title", content: "Audit & Compliance · Wecrew Ops" },
      {
        property: "og:description",
        content:
          "Regulator-ready audit evidence with correlation IDs and tenant, user, agent and action filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditCompliance,
});

const PAGE_SIZE = 8;

function useLiveIngest(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(4, Math.min(120, Math.round(v + (Math.random() - 0.42) * 6))));
    }, 1800);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function useLiveChainHealth(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(99.2, Math.min(100, +(v + (Math.random() - 0.45) * 0.08).toFixed(2))));
    }, 2400);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function AuditCompliance() {
  const [query, setQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [page, setPage] = useState(1);

  const users = useMemo(() => Array.from(new Set(auditLog.map((a) => a.user))).sort(), []);
  const auditAgents = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.agentId))).sort(),
    [],
  );
  const tools = useMemo(() => Array.from(new Set(auditLog.map((a) => a.tool))).length, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auditLog
      .filter((a) => {
        if (tenantFilter !== "all" && a.tenantId !== tenantFilter) return false;
        if (userFilter !== "all" && a.user !== userFilter) return false;
        if (agentFilter !== "all" && a.agentId !== agentFilter) return false;
        if (decisionFilter !== "all" && a.decision !== decisionFilter) return false;
        if (!q) return true;
        return [
          a.correlationId,
          a.user,
          agentName(a.agentId),
          tenantName(a.tenantId),
          a.tool,
          a.action,
          a.decision,
          a.outcome,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [query, tenantFilter, userFilter, agentFilter, decisionFilter]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const denied = auditLog.filter((a) => a.decision === "denied").length;
  const gated = auditLog.filter((a) => a.decision === "approval-required").length;
  const liveIngest = useLiveIngest(18);
  const liveChain = useLiveChainHealth(100);

  function reset() {
    setQuery("");
    setTenantFilter("all");
    setUserFilter("all");
    setAgentFilter("all");
    setDecisionFilter("all");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Audit pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-primary/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · evidence chain
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Audit & Compliance
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Every agent action, tool call and policy decision — hash-chained and retained for
              regulatory review. Exports are signed, read-only bundles.
            </p>
            <Button
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              onClick={() =>
                toast.success("Audit export queued", {
                  description: `${rows.length} entries will be exported as a signed, hash-chained bundle.`,
                })
              }
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              Export evidence bundle
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Entries", value: auditLog.length, hint: "400d retain" },
              {
                label: "Denied",
                value: denied,
                hint: "blocked",
                hot: denied > 0,
              },
              { label: "Gated", value: gated, hint: "dual-ctrl" },
              { label: "Tools", value: tools, hint: "covered" },
              {
                label: "Ingest / min",
                value: liveIngest,
                hint: "live",
                live: true,
              },
              {
                label: "Chain",
                value: liveChain.toFixed(2),
                unit: "%",
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
                  {s.unit ? (
                    <span className="ml-0.5 text-sm font-medium text-sidebar-foreground/55">{s.unit}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Immutable trail"
        description="Search by correlation ID, action or outcome; filter by tenant, user, agent or decision."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Audit & Compliance" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Audit trail">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <Activity className="size-4 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold">Audit trail</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} of {auditLog.length} entries · chain integrity verified
            </p>
          </div>
          {denied > 0 && (
            <StatusPill tone="danger">
              <ShieldAlert className="mr-1 size-3" aria-hidden="true" />
              {denied} denied
            </StatusPill>
          )}
          <StatusPill tone="success">
            <ShieldCheck className="mr-1 size-3" aria-hidden="true" />
            hash-chained
          </StatusPill>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search correlation ID, action, tool or outcome"
              aria-label="Search audit trail"
              className="bg-surface lg:col-span-2"
            />
            <Select
              value={tenantFilter}
              onValueChange={(v) => {
                setTenantFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-surface" aria-label="Filter by tenant">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={userFilter}
              onValueChange={(v) => {
                setUserFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-surface" aria-label="Filter by user">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={agentFilter}
              onValueChange={(v) => {
                setAgentFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-surface" aria-label="Filter by agent">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {auditAgents.map((id) => (
                  <SelectItem key={id} value={id}>
                    {agents.find((a) => a.id === id)?.name ?? id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={decisionFilter}
              onValueChange={(v) => {
                setDecisionFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-52 bg-surface" aria-label="Filter by decision">
                <SelectValue placeholder="Decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                <SelectItem value="allowed">Allowed</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="approval-required">Approval required</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={reset}>
              <Filter className="size-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No audit entries match these filters. Clear filters or widen the tenant scope.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Correlation ID</TableHead>
                      <TableHead>Time (UTC)</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Tool</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((a) => (
                      <TableRow
                        key={a.id}
                        className={a.decision === "denied" ? "bg-destructive/5" : undefined}
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {a.correlationId}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums whitespace-nowrap">
                          {a.time.replace("T", " ").replace("Z", "")}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{a.user}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {agentName(a.agentId)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {tenantName(a.tenantId)}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{a.tool}</TableCell>
                        <TableCell className="text-sm">{a.action}</TableCell>
                        <TableCell>
                          <StatusPill tone={toneForStatus(a.decision)}>{a.decision}</StatusPill>
                        </TableCell>
                        <TableCell className="max-w-56 text-xs text-muted-foreground">
                          {a.outcome}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Page {current} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={current === pageCount}
                    onClick={() => setPage(current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
