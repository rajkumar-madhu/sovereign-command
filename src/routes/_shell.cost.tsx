import { useMemo, useState } from "react";
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
import { Coins, Flame, PiggyBank, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
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

  const fmt = (v: number) => (metric === "cost" ? `$${v.toLocaleString()}` : `${v.toFixed(1)}M`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Token & Cost"
        description="Token accounting, spend attribution and budget governance across every tenant estate."
        crumbs={[{ label: "Govern", to: "/" }, { label: "Token & Cost" }]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Cost report queued", {
                  description: "A signed 30-day token and spend statement will appear in Audit & Compliance.",
                })
              }
            >
              Export statement
            </Button>
            <StatusPill tone={remaining > 0 ? "success" : "danger"}>
              {remaining > 0 ? "within budget" : "over budget"}
            </StatusPill>
          </>
        }
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Tokens (30d)"
          value={`${monthlyTokens.toFixed(1)}M`}
          hint="Across all tenants and providers"
          icon={<Coins className="size-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Spend (30d)"
          value={`$${monthlyCost.toLocaleString()}`}
          tone="info"
          hint="Inference plus gateway overhead"
          icon={<Flame className="size-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Retry waste"
          value={`$${waste.toLocaleString()}`}
          tone="warning"
          hint={`${wastePct}% of 7-day spend from retries and loops`}
          icon={<Repeat className="size-4" aria-hidden="true" />}
        />
        <MetricCard
          label="Budget remaining"
          value={`$${remaining.toLocaleString()}`}
          tone={remaining <= 0 ? "danger" : "success"}
          hint={`Of $${totalBudget.toLocaleString()} allocated`}
          icon={<PiggyBank className="size-4" aria-hidden="true" />}
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Attribution</CardTitle>
            <CardDescription>
              Switch dimension and metric to attribute {metric === "cost" ? "spend" : "tokens"}.
            </CardDescription>
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
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tenant">
            <TabsList className="flex-wrap">
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
                        <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                          {d.data.map((row) => (
                            <Cell key={row.name} fill="var(--primary)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend vs retry waste</CardTitle>
            <CardDescription>Daily inference spend and the portion wasted on retries.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendTrend} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="cost" stroke="var(--primary)" strokeWidth={2} dot={false} name="Spend" />
                  <Line
                    type="monotone"
                    dataKey="waste"
                    stroke="var(--destructive)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    name="Retry waste"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Threshold controls</CardTitle>
            <CardDescription>
              Alerting thresholds only — the OS never throttles or writes to production systems.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant budgets</CardTitle>
          <CardDescription>Adjust monthly allocation per tenant; consumption is read-only telemetry.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
        </CardContent>
      </Card>
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
