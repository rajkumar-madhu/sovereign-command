import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { customerName, incidents, tenantName } from "@/data/seed";

export const Route = createFileRoute("/_shell/investigations")({
  head: () => ({
    meta: [
      { title: "Investigations · Sovereign Agentic Operations OS" },
      { name: "description", content: "Agent-led, evidence-backed investigations across every tenant estate, with SLA exposure and recurrence signals." },
      { property: "og:title", content: "Investigations · Sovereign Agentic Operations OS" },
      { property: "og:description", content: "Evidence-backed agent investigations with SLA exposure and recurrence." },
    ],
  }),
  component: Investigations,
});

function Investigations() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState(false);
  const rows = incidents.filter((i) => `${i.id} ${i.title}`.toLowerCase().includes(query.toLowerCase()));

  function start() {
    setStarting(true);
    window.setTimeout(() => {
      setStarting(false);
      toast.success("Investigation started", { description: "Supervisor agent dispatched in read-only mode." });
      void navigate({ to: "/incidents/$incidentId", params: { incidentId: "inc-4821" } });
    }, 600);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        description="Bounded, auditable investigations planned and executed by specialist agents."
        crumbs={[{ label: "Investigate" }, { label: "Investigations" }]}
        actions={<Button onClick={start} disabled={starting}>{starting ? "Dispatching…" : "Start investigation"}</Button>}
      />
      <SafetyBanner compact />
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{rows.length} investigations</CardTitle>
          <CardDescription>Search by incident reference or title</CardDescription>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search investigations" aria-label="Search investigations" className="sm:max-w-xs" />
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No investigations match this search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
                    <TableHead>Tenant</TableHead><TableHead>Customer</TableHead><TableHead>SLA</TableHead>
                    <TableHead className="text-right">Recurrence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link to="/incidents/$incidentId" params={{ incidentId: i.id }} className="font-medium text-primary hover:underline">
                          {i.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{i.id}</p>
                      </TableCell>
                      <TableCell><StatusPill tone={toneForSeverity(i.severity)}>{i.severity}</StatusPill></TableCell>
                      <TableCell><StatusPill tone={toneForStatus(i.status)}>{i.status}</StatusPill></TableCell>
                      <TableCell className="text-sm">{tenantName(i.tenantId)}</TableCell>
                      <TableCell className="text-sm">{customerName(i.customerId)}</TableCell>
                      <TableCell>{i.slaRisk ? <StatusPill tone="danger">at risk</StatusPill> : <StatusPill tone="success">within SLA</StatusPill>}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.recurrence}x</TableCell>
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