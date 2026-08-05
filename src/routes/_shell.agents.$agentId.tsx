import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { agents, auditLog, customerName, mcpTools, passports, providers, securityEvents, tenantName } from "@/data/seed";
import { useOps } from "@/lib/ops-context";

export const Route = createFileRoute("/_shell/agents/$agentId")({
  loader: ({ params }) => {
    const agent = agents.find((a) => a.id === params.agentId);
    if (!agent) throw notFound();
    return { agent, passport: passports[agent.id]! };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.agent.name ?? "Agent";
    return {
      meta: [
        { title: `${name} · Agent Detail · Sovereign Agentic OS` },
        {
          name: "description",
          content: `Passport, capabilities, tools, models, executions, security events, cost and audit trail for ${name}.`,
        },
        { property: "og:title", content: `${name} · Agent Detail` },
        { property: "og:description", content: `Signed passport and operating envelope for ${name}.` },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: AgentDetail,
  notFoundComponent: () => (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">Agent not found</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/agents">Back to registry</Link>
      </Button>
    </div>
  ),
});

function AgentDetail() {
  const { agent, passport } = Route.useLoaderData();
  const ops = useOps();
  const status = ops.agentStates[agent.id] ?? agent.status;
  const events = securityEvents.filter((e) => e.agentId === agent.id);
  const audits = auditLog.filter((a) => a.agentId === agent.id);
  const provider = providers.find((p) => p.models.includes(agent.model));

  function act(kind: "suspend" | "quarantine" | "kill") {
    const next = kind === "suspend" ? "suspended" : kind === "quarantine" ? "quarantined" : "terminated";
    ops.setAgentState(agent.id, next);
    toast.success(`Simulated ${kind}: ${agent.name} is now ${next}`, {
      description: "Agent control action recorded for audit.",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={agent.name}
        description={agent.description}
        crumbs={[
          { label: "Operate", to: "/" },
          { label: "Agent Registry", to: "/agents" },
          { label: agent.name },
        ]}
        actions={
          <>
            <StatusPill tone={toneForStatus(status)}>{status}</StatusPill>
            <Button variant="outline" onClick={() => act("suspend")}>Suspend</Button>
            <Button variant="outline" onClick={() => act("quarantine")}>Quarantine</Button>
            <Button variant="destructive" onClick={() => act("kill")}>Kill switch</Button>
          </>
        }
      />
      <SafetyBanner compact />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          {["overview", "passport", "capabilities", "tools", "models", "executions", "security", "cost", "audit"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === "security" ? "Security events" : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Trust score" value={agent.trustScore} tone={agent.trustScore >= 88 ? "success" : "warning"} />
            <MetricCard label="Executions (24h)" value={agent.executions24h} />
            <MetricCard label="Success rate" value={`${agent.successRate}%`} tone="info" />
            <MetricCard label="Risk level" value={agent.riskLevel} tone={agent.riskLevel === "low" ? "success" : "danger"} />
          </section>
          <Card>
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Tenant" value={tenantName(agent.tenantId)} />
              <Row label="Customer" value={customerName(agent.customerId)} />
              <Row label="Environment" value={agent.environment} />
              <Row label="Owner" value={agent.owner} />
              <Row label="Autonomy" value={agent.autonomy} />
              <Row label="Model" value={agent.model} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passport" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Signed agent passport</CardTitle>
              <CardDescription>Issued by {passport.issuer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Row label="Identity" value={passport.identity} />
                <Row label="Algorithm" value={passport.signatureAlg} />
                <Row label="Signature" value={passport.signature} />
                <Row label="Issued" value={passport.issuedAt} />
                <Row label="Expires" value={passport.expiresAt} />
                <Row label="Max steps" value={String(passport.maxSteps)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Allowed tools</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {passport.allowedTools.map((t: string) => (
                      <li key={t}><StatusPill tone="success">{t}</StatusPill></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Blocked actions</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {passport.blockedActions.map((t: string) => (
                      <li key={t}><StatusPill tone="danger">{t}</StatusPill></li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Budget label="Token budget" used={passport.tokensUsed} total={passport.tokenBudget} format={(v) => `${(v / 1_000_000).toFixed(2)}M`} />
                <Budget label="Cost budget" used={passport.costUsedUsd} total={passport.costBudgetUsd} format={(v) => `$${v.toLocaleString()}`} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Capability class: {agent.kind}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {["Evidence collection (read-only)", "Hypothesis generation", "Cross-signal correlation", "RCA drafting with confidence scoring", "Policy-aware tool selection"].map((c) => (
                <div key={c} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span>{c}</span>
                  <StatusPill tone="success">enabled</StatusPill>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span>Autonomous remediation</span>
                <StatusPill tone="danger">permanently disabled</StatusPill>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Bound tools</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {mcpTools.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{t.name} <span className="text-xs text-muted-foreground">v{t.version}</span></p>
                    <p className="text-xs text-muted-foreground">{t.permissions.join(", ")} · {t.owner}</p>
                  </div>
                  <StatusPill tone={toneForStatus(t.scan)}>scan {t.scan}</StatusPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Model routing</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Primary model" value={agent.model} />
              <Row label="Provider" value={provider?.name ?? "vLLM Cluster"} />
              <Row label="Data residency" value={provider?.residency ?? "On-premise (sovereign)"} />
              <Row label="Fallback order" value={String(provider?.fallbackOrder ?? 7)} />
              <Row label="Latency (p50)" value={`${provider?.latencyMs ?? 410} ms`} />
              <Row label="Error rate" value={`${provider?.errorRate ?? 1.1}%`} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Recent executions</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead><TableHead>Objective</TableHead>
                    <TableHead>Steps</TableHead><TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["run-8841", "Node NotReady triage (fs-prod-cs-tool2)", "14", "verified"],
                    ["run-8837", "Egress path correlation", "9", "verified"],
                    ["run-8830", "Image pull failure clustering", "11", "verified"],
                    ["run-8822", "Replica lag evidence sweep", "7", "anomaly"],
                    ["run-8814", "Change window correlation", "5", "verified"],
                  ].map(([id, obj, steps, outcome]) => (
                    <TableRow key={id}>
                      <TableCell className="font-mono text-xs">{id}</TableCell>
                      <TableCell className="text-sm">{obj}</TableCell>
                      <TableCell className="tabular-nums">{steps}</TableCell>
                      <TableCell><StatusPill tone={toneForStatus(outcome!)}>{outcome}</StatusPill></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Security events</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No security events recorded for this agent in the retention window.
                </p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{e.category}</span>
                      <StatusPill tone={toneForSeverity(e.severity)}>{e.severity}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4 pt-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Tokens (30d)" value={`${(agent.tokens30d / 1_000_000).toFixed(2)}M`} />
            <MetricCard label="Cost (30d)" value={`$${agent.cost30dUsd.toLocaleString()}`} tone="info" />
            <MetricCard label="Budget remaining" value={`$${(passport.costBudgetUsd - passport.costUsedUsd).toLocaleString()}`} tone={passport.costUsedUsd > passport.costBudgetUsd ? "danger" : "success"} />
          </section>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {audits.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No audit entries for this agent yet.</p>
              ) : (
                audits.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.action}</span>
                      <StatusPill tone={toneForStatus(a.decision)}>{a.decision}</StatusPill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.correlationId} · {a.tool} · {a.outcome}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

function Budget({ label, used, total, format }: { label: string; used: number; total: number; format: (v: number) => string }) {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{format(used)} / {format(total)}</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}