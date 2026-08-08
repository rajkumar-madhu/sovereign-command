import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bot, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import {
  agents,
  auditLog,
  customerName,
  mcpTools,
  passports,
  providers,
  securityEvents,
  tenantName,
} from "@/data/seed";
import { ResourceIdentityPanel } from "@/components/ops/resource-identity-panel";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";

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
        { title: `${name} · Agent Detail · Wecrew Ops` },
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

function useLiveInvokes(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(1, v + Math.round((Math.random() - 0.42) * 3)));
    }, 2500);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function AgentDetail() {
  const { agent, passport } = Route.useLoaderData();
  const ops = useOps();
  const status = ops.agentStates[agent.id] ?? agent.status;
  const events = securityEvents.filter((e) => e.agentId === agent.id);
  const audits = auditLog.filter((a) => a.agentId === agent.id);
  const provider = providers.find((p) => p.models.includes(agent.model));
  const liveRuns = useLiveInvokes(Math.max(4, Math.round(agent.executions24h / 48)));
  const budgetPct = Math.min(100, Math.round((passport.tokensUsed / passport.tokenBudget) * 100));
  const sigTone =
    passport.signature === "valid" ? "success" : passport.signature === "expiring" ? "warning" : "danger";

  return (
    <div className="space-y-6">
      <section
        aria-label="Agent passport pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-brand-coral/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
                Operate · passport
              </p>
              <StatusPill tone={toneForStatus(status)}>{status}</StatusPill>
              <StatusPill tone={sigTone}>sig {passport.signature}</StatusPill>
              <StatusPill tone={toneForScore(agent.trustScore)}>trust {agent.trustScore}</StatusPill>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              {agent.name}
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">{agent.description}</p>
            <p className="font-mono text-[11px] text-sidebar-foreground/55">
              {agent.kind} · {agent.model} · {agent.environment}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent">
                <Link to="/agents">Back to registry</Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">Runs/hr</p>
              <p className="font-display mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                <span className="inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral" aria-hidden="true" />
                {liveRuns}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">live</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">Token budget</p>
              <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                {budgetPct}%
              </p>
              <p className="mt-0.5 text-[10px] text-sidebar-foreground/50">consumed</p>
            </div>
            <div className="col-span-2 rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">Identity</p>
                <ShieldCheck className="size-3.5 text-brand-coral" aria-hidden="true" />
              </div>
              <p className="truncate font-mono text-[11px] text-sidebar-accent-foreground">{passport.identity}</p>
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        title="Operating envelope"
        description="Passport configuration on this canvas — live routing, open work, and jumps stay in Agent details (right)."
        crumbs={[
          { label: "Operate", to: "/command" },
          { label: "Agent Registry", to: "/agents" },
          { label: agent.name },
        ]}
      />
      <SafetyBanner compact />

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-surface">
          {[
            "overview",
            "passport",
            "capabilities",
            "tools",
            "models",
            "executions",
            "security",
            "cost",
            "audit",
          ].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === "security" ? "Security events" : t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Trust score"
              value={String(agent.trustScore)}
              hint="Passport trust"
              tone={agent.trustScore >= 88 ? "success" : "warning"}
            />
            <MetricCard
              label="Executions (24h)"
              value={agent.executions24h.toLocaleString()}
              hint="Completed runs"
            />
            <MetricCard
              label="Success rate"
              value={`${agent.successRate}%`}
              hint="Last 24h"
              tone="info"
            />
            <MetricCard
              label="Risk level"
              value={agent.riskLevel}
              hint="Composite"
              tone={agent.riskLevel === "low" ? "success" : "danger"}
            />
          </section>
          {agent.runtime ? (
            <ResourceIdentityPanel
              resources={[agent.runtime]}
              title="Runtime placement"
              description="Hostname, IP, cluster, and application identity for this agent runner"
            />
          ) : null}
          <section className="ops-panel rounded-2xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="size-4 text-brand-coral" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold">Assignment</h2>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Tenant" value={tenantName(agent.tenantId)} />
              <Row label="Customer" value={customerName(agent.customerId)} />
              <Row label="Environment" value={agent.environment} />
              <Row label="Owner" value={agent.owner} />
              <Row label="Autonomy" value={agent.autonomy} />
              <Row label="Model" value={agent.model} />
              <Row label="Hostname" value={agent.runtime?.hostname ?? "—"} />
              <Row label="IP address" value={agent.runtime?.ipAddress ?? "—"} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="passport" className="space-y-4 pt-4">
          <section className="ops-panel rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">Signed agent passport</h2>
            <p className="mt-1 text-sm text-muted-foreground">Issued by {passport.issuer}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Identity" value={passport.identity} />
              <Row label="Algorithm" value={passport.signatureAlg} />
              <Row label="Signature" value={passport.signature} />
              <Row label="Issued" value={passport.issuedAt} />
              <Row label="Expires" value={passport.expiresAt} />
              <Row label="Max steps" value={String(passport.maxSteps)} />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Allowed tools
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {passport.allowedTools.map((t: string) => (
                    <li key={t}>
                      <StatusPill tone="success">{t}</StatusPill>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Blocked actions
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {passport.blockedActions.map((t: string) => (
                    <li key={t}>
                      <StatusPill tone="danger">{t}</StatusPill>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Budget
                label="Token budget"
                used={passport.tokensUsed}
                total={passport.tokenBudget}
                format={(v) => `${(v / 1_000_000).toFixed(2)}M`}
              />
              <Budget
                label="Cost budget"
                used={passport.costUsedUsd}
                total={passport.costBudgetUsd}
                format={(v) => `$${v.toLocaleString()}`}
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="capabilities" className="pt-4">
          <section className="ops-panel rounded-2xl p-5">
            <h2 className="font-display text-sm font-semibold">Capability class: {agent.kind}</h2>
            <div className="mt-3 space-y-2 text-sm">
              {[
                "Evidence collection (read-only)",
                "Hypothesis generation",
                "Cross-signal correlation",
                "RCA drafting with confidence scoring",
                "Policy-aware tool selection",
              ].map((c) => (
                <div
                  key={c}
                  className="flex items-center justify-between border-b border-border/80 pb-2 last:border-0"
                >
                  <span>{c}</span>
                  <StatusPill tone="success">enabled</StatusPill>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span>Autonomous remediation</span>
                <StatusPill tone="danger">permanently disabled</StatusPill>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="tools" className="pt-4">
          <section className="ops-panel space-y-2 rounded-2xl p-5">
            <h2 className="font-display mb-3 text-sm font-semibold">Bound tools</h2>
            {mcpTools.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {t.name} <span className="text-xs text-muted-foreground">v{t.version}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.permissions.join(", ")} · {t.owner}
                  </p>
                </div>
                <StatusPill tone={toneForStatus(t.scan)}>scan {t.scan}</StatusPill>
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="models" className="pt-4">
          <section className="ops-panel rounded-2xl p-5">
            <h2 className="font-display mb-3 text-sm font-semibold">Model routing</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Primary model" value={agent.model} />
              <Row label="Provider" value={provider?.name ?? "vLLM Cluster"} />
              <Row label="Data residency" value={provider?.residency ?? "On-premise (sovereign)"} />
              <Row label="Fallback order" value={String(provider?.fallbackOrder ?? 7)} />
              <Row label="Latency (p50)" value={`${provider?.latencyMs ?? 410} ms`} />
              <Row label="Error rate" value={`${provider?.errorRate ?? 1.1}%`} />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="executions" className="pt-4">
          <section className="ops-panel overflow-hidden rounded-2xl">
            <div className="border-b border-border/70 px-4 py-3">
              <h2 className="font-display text-sm font-semibold">Recent executions</h2>
            </div>
            <div className="overflow-x-auto p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Outcome</TableHead>
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
                      <TableCell>
                        <StatusPill tone={toneForStatus(outcome!)}>{outcome}</StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="security" className="pt-4">
          <section className="ops-panel space-y-2 rounded-2xl p-5">
            <h2 className="font-display mb-3 text-sm font-semibold">Security events</h2>
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No security events recorded for this agent in the retention window.
              </p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="rounded-xl border border-border/80 bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{e.category}</span>
                    <StatusPill tone={toneForSeverity(e.severity)}>{e.severity}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
                </div>
              ))
            )}
          </section>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4 pt-4">
          <section className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Tokens (30d)" value={`${(agent.tokens30d / 1_000_000).toFixed(2)}M`} />
            <MetricCard label="Cost (30d)" value={`$${agent.cost30dUsd.toLocaleString()}`} tone="info" />
            <MetricCard
              label="Budget remaining"
              value={`$${(passport.costBudgetUsd - passport.costUsedUsd).toLocaleString()}`}
              tone={passport.costUsedUsd > passport.costBudgetUsd ? "danger" : "success"}
            />
          </section>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <section className="ops-panel space-y-2 rounded-2xl p-5">
            <h2 className="font-display mb-3 text-sm font-semibold">Audit trail</h2>
            {audits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No audit entries for this agent yet.
              </p>
            ) : (
              audits.map((a) => (
                <div key={a.id} className="rounded-xl border border-border/80 bg-surface p-3 text-sm">
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
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("truncate text-right font-medium", value.includes("spiffe") && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

function Budget({
  label,
  used,
  total,
  format,
}: {
  label: string;
  used: number;
  total: number;
  format: (v: number) => string;
}) {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {format(used)} / {format(total)}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
