import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { agentName, securityEvents, tenantName } from "@/data/seed";

export const Route = createFileRoute("/_shell/soc")({
  head: () => ({
    meta: [
      { title: "Agent Security SOC · Sovereign Agentic Operations OS" },
      { name: "description", content: "Detect and triage prompt injection, secret access, cross-tenant attempts, malicious MCP tools, token anomalies and reasoning loops." },
      { property: "og:title", content: "Agent Security SOC · Sovereign Agentic Operations OS" },
      { property: "og:description", content: "Prompt injection, secret access, cross-tenant and malicious tool detections." },
    ],
  }),
  component: SocPage,
});

const CATEGORIES = ["prompt-injection", "secret-access", "cross-tenant", "malicious-mcp", "token-anomaly", "loop-detection", "failed-action"];

function SocPage() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");

  const rows = useMemo(
    () =>
      securityEvents.filter(
        (e) =>
          (severity === "all" || e.severity === severity) &&
          (category === "all" || e.category === category) &&
          `${e.detail} ${e.agentId}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, severity, category],
  );

  const count = (c: string) => securityEvents.filter((e) => e.category === c).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Security SOC"
        description="Security signal from the agent control plane, correlated by tenant and agent identity."
        crumbs={[{ label: "Govern" }, { label: "Agent Security SOC" }]}
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <MetricCard label="Prompt injection" value={count("prompt-injection")} tone="danger" />
        <MetricCard label="Secret access" value={count("secret-access")} tone="danger" />
        <MetricCard label="Cross-tenant" value={count("cross-tenant")} tone="danger" />
        <MetricCard label="Malicious MCP" value={count("malicious-mcp")} tone="danger" />
        <MetricCard label="Token anomalies" value={count("token-anomaly")} tone="warning" />
        <MetricCard label="Loops" value={count("loop-detection")} tone="warning" />
        <MetricCard label="Failed actions" value={count("failed-action")} tone="info" />
      </section>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{rows.length} events</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search detail or agent" aria-label="Search security events" className="sm:max-w-xs" />
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="sm:w-40" aria-label="Filter by severity"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {["P1", "P2", "P3", "P4"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-52" aria-label="Filter by category"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium">No security events match these filters</p>
              <Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setSeverity("all"); setCategory("all"); }}>Reset filters</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead>
                    <TableHead>Agent</TableHead><TableHead>Tenant</TableHead><TableHead>Detail</TableHead><TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">{new Date(e.time).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{e.category}</TableCell>
                      <TableCell><StatusPill tone={toneForSeverity(e.severity)}>{e.severity}</StatusPill></TableCell>
                      <TableCell className="text-sm">{agentName(e.agentId)}</TableCell>
                      <TableCell className="text-sm">{tenantName(e.tenantId)}</TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">{e.detail}</TableCell>
                      <TableCell><StatusPill tone={toneForStatus(e.action)}>{e.action}</StatusPill></TableCell>
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