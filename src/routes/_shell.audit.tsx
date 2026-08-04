import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileCheck2, Filter, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForStatus } from "@/components/ops/status-badge";
import { agentName, agents, auditLog, tenantName, tenants } from "@/data/seed";

export const Route = createFileRoute("/_shell/audit")({
  head: () => ({
    meta: [
      { title: "Audit & Compliance · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Immutable, searchable audit trail of every agent action with correlation ID, user, agent, tenant, tool, decision and outcome.",
      },
      { property: "og:title", content: "Audit & Compliance · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Regulator-ready audit evidence with correlation IDs and tenant, user, agent and action filters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditCompliance,
});

const PAGE_SIZE = 8;

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
      <PageHeader
        title="Audit & Compliance"
        description="Every agent action, tool call and policy decision, hash-chained and retained for regulatory review."
        crumbs={[{ label: "Govern", to: "/" }, { label: "Audit & Compliance" }]}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Audit export queued", {
                description: `${rows.length} entries will be exported as a signed, hash-chained bundle.`,
              })
            }
          >
            Export evidence bundle
          </Button>
        }
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Audit entries" value={auditLog.length} hint="Retention window: 400 days" icon={<FileCheck2 className="size-4" aria-hidden="true" />} />
        <MetricCard label="Denied actions" value={denied} tone="danger" hint="Blocked by policy or passport" icon={<ShieldAlert className="size-4" aria-hidden="true" />} />
        <MetricCard label="Approval-gated" value={gated} tone="warning" hint="Dual-control decisions recorded" icon={<Filter className="size-4" aria-hidden="true" />} />
        <MetricCard label="Tools covered" value={tools} tone="success" hint="Chain integrity verified" icon={<ShieldCheck className="size-4" aria-hidden="true" />} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>
            Search by correlation ID, action or outcome, and filter by tenant, user, agent or decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search correlation ID, action, tool or outcome"
              aria-label="Search audit trail"
              className="lg:col-span-2"
            />
            <Select value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); setPage(1); }}>
              <SelectTrigger aria-label="Filter by tenant"><SelectValue placeholder="Tenant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); setPage(1); }}>
              <SelectTrigger aria-label="Filter by user"><SelectValue placeholder="User" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v); setPage(1); }}>
              <SelectTrigger aria-label="Filter by agent"><SelectValue placeholder="Agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {auditAgents.map((id) => (
                  <SelectItem key={id} value={id}>{agents.find((a) => a.id === id)?.name ?? id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={decisionFilter} onValueChange={(v) => { setDecisionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-52" aria-label="Filter by decision">
                <SelectValue placeholder="Decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All decisions</SelectItem>
                <SelectItem value="allowed">Allowed</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="approval-required">Approval required</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>
            <span className="text-xs text-muted-foreground">
              {rows.length} of {auditLog.length} entries
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
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
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{a.correlationId}</TableCell>
                        <TableCell className="text-xs tabular-nums whitespace-nowrap">
                          {a.time.replace("T", " ").replace("Z", "")}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{a.user}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{agentName(a.agentId)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{tenantName(a.tenantId)}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{a.tool}</TableCell>
                        <TableCell className="text-sm">{a.action}</TableCell>
                        <TableCell><StatusPill tone={toneForStatus(a.decision)}>{a.decision}</StatusPill></TableCell>
                        <TableCell className="max-w-56 text-xs text-muted-foreground">{a.outcome}</TableCell>
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
                  <Button size="sm" variant="outline" disabled={current === 1} onClick={() => setPage(current - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={current === pageCount} onClick={() => setPage(current + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
