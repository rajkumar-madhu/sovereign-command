import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import {
  costByAgentKind,
  costByIncident,
  costByModel,
  costByTenant,
  spendTrend,
  tenants,
} from "@/data/seed";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/cost")({
  head: () => ({
    meta: [
      { title: "Token & Cost · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Token and spend analytics by tenant, model, agent class and incident, with retry waste, remaining budget and alert threshold controls.",
      },
      { property: "og:title", content: "Token & Cost · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Multi-tenant token accounting, retry waste and budget threshold governance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokenAndCost,
});

const DIMENSIONS = [
  { key: "tenant", label: "By tenant", data: costByTenant },
  { key: "model", label: "By model", data: costByModel },
  { key: "agent", label: "By agent class", data: costByAgentKind },
  { key: "incident", label: "By incident", data: costByIncident },
] as const;

function useLiveBurn(baseUsdPerMin: number) {
  const [burn, setBurn] = useState(baseUsdPerMin);
  const [tpm, setTpm] = useState(Math.round(baseUsdPerMin * 420));
  useEffect(() => {
    const id = window.setInterval(() => {
      setBurn((v) => Math.max(0.4, Math.min(8.5, +(v + (Math.random() - 0.46) * 0.35).toFixed(2))));
      setTpm((v) => Math.max(80, Math.min(4200, Math.round(v + (Math.random() - 0.45) * 120))));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return { burn, tpm };
}

function TokenAndCost() {
  const ops = useOps();
  const [metric, setMetric] = useState<"cost" | "tokens">("cost");
  const [warnAt, setWarnAt] = useState(75);
  const [hardStopAt, setHardStopAt] = useState(95);

  const monthlyCost = useMemo(() => costByTenant.reduce((s, r) => s + r.cost, 0), []);
  const monthlyTokens = useMemo(() => costByTenant.reduce((s, r) => s + r.tokens, 0), []);
  const waste = useMemo(() => spendTrend.reduce((s, d) => s + d.waste, 0), []);
  const wastePct = ((waste / spendTrend.reduce((s, d) => s + d.cost, 0)) * 100).toFixed(1);
  const totalBudget = useMemo(
    () => tenants.reduce((s, t) => s + (ops.budgets[t.id] ?? 0), 0),
    [ops.budgets],
  );
  const remaining = totalBudget - monthlyCost;
  const { burn, tpm } = useLiveBurn(2.4);

  const fmt = (v: number) => (metric === "cost" ? `$${v.toLocaleString()}` : `${v.toFixed(1)}M`);

  return (
    <div className="space-y-6">
      <section
        aria-label="Token and cost pulse"
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
              Govern · FinOps
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Token & Cost
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Token accounting, spend attribution and budget governance across every tenant estate.
              Thresholds alert FinOps — the OS never throttles production.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
                onClick={() =>
                  toast.success("Cost report queued", {
                    description:
                      "A signed 30-day token and spend statement will appear in Audit & Compliance.",
                  })
                }
              >
                <Coins className="size-4" aria-hidden="true" />
                Export statement
              </Button>
              <StatusPill tone={remaining > 0 ? "success" : "danger"}>
                {remaining > 0 ? "within budget" : "over budget"}
              </StatusPill>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              {
                label: "Burn",
                value: `$${burn}`,
                hint: "/min live",
                live: true,
              },
              {
                label: "Tokens/min",
                value: tpm.toLocaleString(),
                hint: "live",
                live: true,
              },
              {
                label: "Spend 30d",
                value: `$${(monthlyCost / 1000).toFixed(1)}k`,
                hint: "estate",
              },
              {
                label: "Tokens 30d",
                value: `${monthlyTokens.toFixed(1)}M`,
                hint: "all tenants",
              },
              {
                label: "Retry waste",
                value: `$${waste}`,
                hint: `${wastePct}%`,
                hot: true,
              },
              {
                label: "Remaining",
                value: `$${Math.round(remaining / 1000)}k`,
                hint: "budget",
                hot: remaining <= 0,
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
                    "font-display mt-1 text-xl font-semibold tabular-nums sm:text-2xl",
                    s.hot ? "text-warning" : "text-sidebar-accent-foreground",
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
        title="Attribution & budgets"
        description="Switch dimension and metric; adjust monthly allocation per tenant."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Token & Cost" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Attribution</h2>
              <p className="text-xs text-muted-foreground">
                Attribute {metric === "cost" ? "spend" : "tokens"} by dimension
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={metric === "cost" ? "default" : "outline"}
              onClick={() => setMetric("cost")}
            >
              Cost
            </Button>
            <Button
              size="sm"
              variant={metric === "tokens" ? "default" : "outline"}
              onClick={() => setMetric("tokens")}
            >
              Tokens
            </Button>
          </div>
        </div>
        <div className="p-4">
          <Tabs defaultValue="tenant">
            <TabsList className="flex h-auto flex-wrap gap-1 bg-surface">
              {DIMENSIONS.map((d) => (
                <TabsTrigger key={d.key} value={d.key}>
                  {d.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {DIMENSIONS.map((d) => (
              <TabsContent key={d.key} value={d.key} className="pt-4">
                {d.data.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No {metric} recorded for this dimension in the current window.
                  </p>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...d.data]} margin={{ left: 4, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          interval={0}
                          angle={-18}
                          textAnchor="end"
                          height={58}
                          stroke="var(--muted-foreground)"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey={metric} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                          {d.data.map((row) => (
                            <Cell key={row.name} fill="var(--chart-1)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold">Spend vs retry waste</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Daily inference spend and the portion wasted on retries
          </p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendTrend} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  name="Spend"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="waste"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                  name="Retry waste"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ops-panel rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold">Threshold controls</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Alerting only — the OS never throttles or writes to production systems
          </p>
          <div className="mt-6 space-y-6">
            <Threshold
              label="Warn at"
              value={warnAt}
              onChange={(v) => setWarnAt(Math.min(v, hardStopAt - 1))}
            />
            <Threshold
              label="Escalate to FinOps at"
              value={hardStopAt}
              onChange={(v) => setHardStopAt(Math.max(v, warnAt + 1))}
            />
            <Button
              className="w-full"
              onClick={() =>
                toast.success("Thresholds saved", {
                  description: `Warning at ${warnAt}% and FinOps escalation at ${hardStopAt}% of tenant budget.`,
                })
              }
            >
              Save thresholds
            </Button>
          </div>
        </section>
      </div>

      <section className="ops-panel overflow-hidden rounded-2xl">
        <div className="border-b border-border/70 px-4 py-3">
          <h2 className="font-display text-sm font-semibold">Tenant budgets</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adjust monthly allocation; consumption is read-only telemetry
          </p>
        </div>
        <div className="overflow-x-auto p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Tokens (30d)</TableHead>
                <TableHead>Spend (30d)</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="min-w-56">Utilisation</TableHead>
                <TableHead className="text-right">Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t, i) => {
                const row = costByTenant[i]!;
                const budget = ops.budgets[t.id] ?? 0;
                const pct = budget > 0 ? Math.min(100, (row.cost / budget) * 100) : 0;
                const tone = pct >= hardStopAt ? "danger" : pct >= warnAt ? "warning" : "success";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="tabular-nums">{row.tokens.toFixed(1)}M</TableCell>
                    <TableCell className="tabular-nums">${row.cost.toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums">${budget.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="w-32" />
                        <StatusPill tone={tone}>{pct.toFixed(0)}%</StatusPill>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Decrease budget for ${t.name}`}
                          onClick={() => {
                            const next = Math.max(0, budget - 2000);
                            ops.setBudget(t.id, next);
                            toast.success(`${t.name} budget set to $${next.toLocaleString()}`);
                          }}
                        >
                          −$2k
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Increase budget for ${t.name}`}
                          onClick={() => {
                            const next = budget + 2000;
                            ops.setBudget(t.id, next);
                            toast.success(`${t.name} budget set to $${next.toLocaleString()}`);
                          }}
                        >
                          +$2k
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function Threshold({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}% of budget</span>
      </div>
      <Slider
        value={[value]}
        min={10}
        max={100}
        step={1}
        aria-label={label}
        onValueChange={(v) => onChange(v[0]!)}
      />
    </div>
  );
}
