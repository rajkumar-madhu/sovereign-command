import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, FileSearch, Logs, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { useMetricsHistory } from "@/hooks/use-metrics-history";
import {
  METRIC_CATALOG,
  REFRESH_OPTIONS,
  TIME_PRESETS,
  clusterLabel,
  filterSamples,
  formatClock,
  liveKpis,
  metricDef,
  namespaceHealth,
  resolutionForRange,
  sampleFromSnapshot,
  sampleValue,
  type MetricCategory,
  type MetricId,
  type MetricSample,
} from "@/lib/live-metrics";
import { isLiveCluster, snapshotAgeLabel } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/monitor")({
  head: () => ({
    meta: [
      { title: "Metrics Explorer · Wecrew Ops" },
      {
        name: "description",
        content:
          "Live and session-historical Kubernetes inventory metrics from the existing Finspot-dev snapshot.",
      },
    ],
  }),
  component: MetricsExplorer,
});

type Viz = "line" | "area" | "bar" | "table" | "gauge";
type Layout = "overlay" | "split";

function useNowMs(intervalMs: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    if (intervalMs <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium",
        disabled && "cursor-not-allowed opacity-45",
        active
          ? "border-brand-coral/50 bg-brand-coral/10 text-foreground"
          : "border-border bg-surface/40 text-muted-foreground hover:bg-accent/50",
      )}
    >
      {children}
    </button>
  );
}

function ChartBlock({
  data,
  ids,
  viz,
}: {
  data: MetricSample[];
  ids: MetricId[];
  viz: Viz;
}) {
  const liveIds = ids.filter((id) => metricDef(id).live);
  if (viz === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="py-2 pr-3">Time</th>
              {liveIds.map((id) => (
                <th key={id} className="py-2 pr-3">
                  {metricDef(id).label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.generatedAt} className="border-b border-border/60">
                <td className="py-2 pr-3 font-mono text-xs">{row.t}</td>
                {liveIds.map((id) => (
                  <td key={id} className="py-2 pr-3 tabular-nums">
                    {sampleValue(row, id) ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (viz === "gauge") {
    const last = data[data.length - 1];
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {liveIds.map((id) => {
          const def = metricDef(id);
          const value = last ? sampleValue(last, id) : null;
          return (
            <div key={id} className="rounded-xl border border-border bg-surface/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{def.label}</p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums">
                {value ?? "—"}
                <span className="ml-1 text-sm font-medium text-muted-foreground">{def.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  const Chart = viz === "area" ? AreaChart : viz === "bar" ? BarChart : LineChart;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="t" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          />
          {liveIds.map((id) => {
            const def = metricDef(id);
            if (viz === "area") {
              return (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id === "k8s.pods" ? "pods" : id === "k8s.ready" ? "ready" : id === "k8s.not_ready" ? "notReady" : id === "k8s.crashloop" ? "crashLoop" : id === "k8s.restarts" ? "restarts" : id === "k8s.pending" ? "pending" : id === "k8s.nodes" ? "nodes" : id === "k8s.namespaces" ? "namespaces" : id === "k8s.warnings" ? "warnings" : "estate"}
                  name={def.label}
                  stroke={def.color}
                  fill={def.color}
                  fillOpacity={0.15}
                />
              );
            }
            if (viz === "bar") {
              return (
                <Bar
                  key={id}
                  dataKey={id === "k8s.pods" ? "pods" : id === "k8s.ready" ? "ready" : id === "k8s.not_ready" ? "notReady" : id === "k8s.crashloop" ? "crashLoop" : id === "k8s.restarts" ? "restarts" : id === "k8s.pending" ? "pending" : id === "k8s.nodes" ? "nodes" : id === "k8s.namespaces" ? "namespaces" : id === "k8s.warnings" ? "warnings" : "estate"}
                  name={def.label}
                  fill={def.color}
                />
              );
            }
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={id === "k8s.pods" ? "pods" : id === "k8s.ready" ? "ready" : id === "k8s.not_ready" ? "notReady" : id === "k8s.crashloop" ? "crashLoop" : id === "k8s.restarts" ? "restarts" : id === "k8s.pending" ? "pending" : id === "k8s.nodes" ? "nodes" : id === "k8s.namespaces" ? "namespaces" : id === "k8s.warnings" ? "warnings" : "estate"}
                name={def.label}
                stroke={def.color}
                strokeWidth={2}
                dot={false}
              />
            );
          })}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricsExplorer() {
  const ops = useOps();
  const { focusMode, setFocusMode } = useShellChrome();
  const live = isLiveCluster(ops.clusterSnapshot);
  const history = useMetricsHistory(ops.clusterSnapshot);
  const [preset, setPreset] = useState("live");
  const [refreshId, setRefreshId] = useState<(typeof REFRESH_OPTIONS)[number]["id"]>("15s");
  const refreshMs = REFRESH_OPTIONS.find((r) => r.id === refreshId)?.ms ?? 15_000;
  const nowMs = useNowMs(refreshMs === 0 ? 0 : Math.min(refreshMs, 5_000));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selected, setSelected] = useState<MetricId[]>(["k8s.pods", "k8s.not_ready", "k8s.warnings"]);
  const [query, setQuery] = useState("");
  const [viz, setViz] = useState<Viz>("line");
  const [layout, setLayout] = useState<Layout>("overlay");
  const [groupBy, setGroupBy] = useState<"namespace" | "cluster">("namespace");
  const [selectedTs, setSelectedTs] = useState<number | null>(null);
  const age = snapshotAgeLabel(ops.clusterSnapshot?.generatedAt, nowMs);
  const cluster = clusterLabel(ops.clusterSnapshot);
  const latest = sampleFromSnapshot(ops.clusterSnapshot, nowMs);
  const kpis = liveKpis(latest, live);
  const nsHealth = namespaceHealth(ops.clusterSnapshot);

  const window = useMemo(() => {
    const to = nowMs || Date.now();
    if (preset === "custom") {
      const from = customFrom ? Date.parse(customFrom) : to - 60 * 60_000;
      const end = customTo ? Date.parse(customTo) : to;
      return { from: Number.isFinite(from) ? from : to - 60 * 60_000, to: Number.isFinite(end) ? end : to };
    }
    const def = TIME_PRESETS.find((p) => p.id === preset);
    if (!def || def.ms === null) return { from: 0, to };
    return { from: to - def.ms, to };
  }, [preset, customFrom, customTo, nowMs]);

  const series = useMemo(
    () => filterSamples(history, window.from || 0, window.to || Number.MAX_SAFE_INTEGER),
    [history, window.from, window.to],
  );
  const rangeMs = Math.max(60_000, window.to - (window.from || window.to - 60_000));
  const categories = useMemo(
    () => Array.from(new Set(METRIC_CATALOG.map((m) => m.category))) as MetricCategory[],
    [],
  );
  const catalog = METRIC_CATALOG.filter(
    (m) =>
      !query ||
      m.label.toLowerCase().includes(query.toLowerCase()) ||
      m.id.includes(query.toLowerCase()),
  );
  const investigate = series.find((s) => s.ts === selectedTs) ?? series[series.length - 1];
  const warnings = live ? ops.clusterSnapshot.warningEvents.slice(0, 8) : [];

  function toggleMetric(id: MetricId) {
    const def = metricDef(id);
    if (!def.live) return;
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Metrics pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-white/10"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 p-5 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
                Monitor · metrics explorer
              </p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-[#f4f1ea] md:text-4xl">
                Metrics Explorer
              </h1>
              <p className="text-sm leading-relaxed text-[#f4f1ea]/75">
                Live graphs from the existing Finspot-dev kubectl snapshot. HTTP, DB, Redis, and
                traces stay empty — they are not invented.
              </p>
              <StatusPill
                tone={live ? (latest && latest.notReady > 0 ? "warning" : "success") : "warning"}
                className="w-fit bg-[#f4f1ea]/10 text-[#f4f1ea]"
              >
                {preset === "live" ? "LIVE" : preset} · {cluster} · updated {age} ago
              </StatusPill>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-[#f4f1ea] text-brand-ink hover:bg-white">
                <Link to="/logs">
                  <Logs className="size-4" aria-hidden="true" />
                  View Logs
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]">
                <Link to="/evidence">
                  <FileSearch className="size-4" aria-hidden="true" />
                  Evidence
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]">
                <Link to="/rca">
                  <ScrollText className="size-4" aria-hidden="true" />
                  RCA
                </Link>
              </Button>
              {!focusMode && (
                <Button
                  variant="outline"
                  className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]"
                  onClick={() => setFocusMode(true)}
                >
                  Enter focus
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        title="Global time control"
        description="One selector for every graph. Timezone Asia/Kolkata. Remediator held."
        crumbs={[{ label: "Operate" }, { label: "Metrics Explorer" }]}
      />
      <SafetyBanner />

      <section className="ops-panel space-y-3 rounded-2xl p-4 md:p-5" aria-labelledby="time-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="time-title" className="font-display text-sm font-semibold">
            1. Time range · {resolutionForRange(rangeMs)} resolution
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            {preset === "live" ? "LIVE" : "HIST"} · {series.length} samples · refresh {refreshId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIME_PRESETS.map((p) => (
            <Chip key={p.id} active={preset === p.id} onClick={() => setPreset(p.id)}>
              {p.label}
            </Chip>
          ))}
          <Chip active={preset === "custom"} onClick={() => setPreset("custom")}>
            Custom range
          </Chip>
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">From</span>
              <Input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 w-56"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">To</span>
              <Input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 w-56"
              />
            </label>
            <Button size="sm" onClick={() => setPreset("custom")}>
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCustomFrom("");
                setCustomTo("");
                setPreset("live");
              }}
            >
              Reset
            </Button>
          </div>
        )}
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Live refresh</p>
          <div className="flex flex-wrap gap-2">
            {REFRESH_OPTIONS.map((r) => (
              <Chip key={r.id} active={refreshId === r.id} onClick={() => setRefreshId(r.id)}>
                {r.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Snapshot poll stays 15s from Stage-1. Faster refresh only updates the clock, not invented
            points.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setSelected([k.id])}
            className="ops-panel rounded-2xl p-4 text-left hover:border-brand-coral/40"
          >
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{k.label}</p>
            <p className="font-display mt-1 text-3xl font-semibold tabular-nums">{k.value}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{k.hint}</p>
          </button>
        ))}
      </div>

      <section className="ops-panel space-y-4 rounded-2xl p-4 md:p-5" aria-labelledby="graph-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="graph-title" className="font-display text-sm font-semibold">
            3. Inventory graph
          </h2>
          <div className="flex flex-wrap gap-2">
            {(["line", "area", "bar", "table", "gauge"] as Viz[]).map((v) => (
              <Chip key={v} active={viz === v} onClick={() => setViz(v)}>
                {v}
              </Chip>
            ))}
            <Chip active={layout === "overlay"} onClick={() => setLayout("overlay")}>
              Overlay
            </Chip>
            <Chip active={layout === "split"} onClick={() => setLayout("split")}>
              Split
            </Chip>
          </div>
        </div>
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No live samples in this window. Stage-1 must return source=live-k8s. Longer ranges stay
            empty until more polls accumulate — Prometheus is not on this slice.
          </p>
        ) : layout === "split" ? (
          <div className="space-y-4">
            {selected.filter((id) => metricDef(id).live).map((id) => (
              <div key={id}>
                <p className="mb-1 text-xs text-muted-foreground">{metricDef(id).label}</p>
                <ChartBlock data={series} ids={[id]} viz={viz} />
              </div>
            ))}
          </div>
        ) : (
          <ChartBlock data={series} ids={selected} viz={viz} />
        )}
        <p className="text-xs text-muted-foreground">
          Hover a point for inventory values. Click a KPI to focus one series. Select a table row
          time, then Investigate.
        </p>
        <div className="flex flex-wrap gap-2">
          {series.slice(-6).map((s) => (
            <Chip key={s.generatedAt} active={selectedTs === s.ts} onClick={() => setSelectedTs(s.ts)}>
              {s.t}
            </Chip>
          ))}
        </div>
        {investigate && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/logs">View Logs · {formatClock(investigate.ts)}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/evidence">Investigate · Evidence</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/rca">Create / open RCA</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="ops-panel space-y-3 rounded-2xl p-4 md:p-5" aria-labelledby="selector-title">
        <h2 id="selector-title" className="font-display text-sm font-semibold">
          4. Metric selector
        </h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search metrics"
          className="max-w-sm"
        />
        {categories.map((cat) => (
          <div key={cat}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {catalog
                .filter((m) => m.category === cat)
                .map((m) => (
                  <Chip
                    key={m.id}
                    active={selected.includes(m.id)}
                    disabled={!m.live}
                    onClick={() => toggleMetric(m.id)}
                  >
                    {m.live ? m.label : `${m.label} · not in slice`}
                  </Chip>
                ))}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-panel space-y-3 rounded-2xl p-4" aria-labelledby="health-title">
          <div className="flex items-center justify-between">
            <h2 id="health-title" className="font-display text-sm font-semibold">
              Service health
            </h2>
            <Chip active={groupBy === "namespace"} onClick={() => setGroupBy("namespace")}>
              Group by namespace
            </Chip>
          </div>
          <ul className="space-y-2">
            {nsHealth.slice(0, 10).map((row) => (
              <li key={row.namespace} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{row.namespace}</span>
                <span className="flex items-center gap-2">
                  <StatusPill
                    tone={row.tone === "healthy" ? "success" : row.tone === "critical" ? "danger" : "warning"}
                  >
                    {row.tone}
                  </StatusPill>
                  <span className="tabular-nums text-muted-foreground">
                    {row.pods} pods · {row.attention} attn
                  </span>
                </span>
              </li>
            ))}
            {nsHealth.length === 0 && (
              <li className="text-sm text-muted-foreground">No namespace inventory on this host.</li>
            )}
          </ul>
        </section>

        <section className="ops-panel space-y-3 rounded-2xl p-4" aria-labelledby="alerts-title">
          <h2 id="alerts-title" className="font-display text-sm font-semibold">
            Active alerts · incident overlay
          </h2>
          <ul className="space-y-2">
            {warnings.map((e, i) => (
              <li key={`${e.object}-${i}`} className="rounded-xl border border-border bg-surface/50 px-3 py-2">
                <p className="text-sm font-medium">{e.reason}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {e.namespace} · {e.object}
                </p>
              </li>
            ))}
            {warnings.length === 0 && (
              <li className="text-sm text-muted-foreground">
                {live ? "No Warning events in the current snapshot." : "Alerts unavailable."}
              </li>
            )}
          </ul>
          <p className="text-xs text-muted-foreground">
            Deployment overlay is not in this slice. Incident marker follows INC-LIVE-* from
            attention pods.
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ops-panel space-y-3 rounded-2xl p-4" aria-labelledby="topo-title">
          <h2 id="topo-title" className="font-display text-sm font-semibold">
            19. Live Kubernetes topology
          </h2>
          <pre className="max-h-72 overflow-auto rounded-xl border border-white/10 bg-[#0e1116] p-3 font-mono text-[11px] leading-relaxed text-[#e8e4dc]">
            {live
              ? `CLUSTER ${cluster}\n${nsHealth
                  .slice(0, 8)
                  .map(
                    (n) =>
                      `├── ${n.namespace} ${n.tone === "healthy" ? "green" : n.tone === "watch" ? "watch" : "critical"}\n│     pods=${n.pods} attention=${n.attention}`,
                  )
                  .join("\n")}`
              : "Topology unavailable — snapshot source is not live-k8s."}
          </pre>
        </section>
        <section className="ops-panel space-y-3 rounded-2xl p-4" aria-labelledby="dep-title">
          <h2 id="dep-title" className="font-display text-sm font-semibold">
            20. Service dependency
          </h2>
          <pre className="overflow-auto rounded-xl border border-white/10 bg-[#0e1116] p-3 font-mono text-[11px] leading-relaxed text-[#e8e4dc]">
            {`Operator
   │
   ▼
Command Center
   │
   ▼
GET /cluster/snapshot
   │
   ▼
Stage-1  ${live ? "healthy" : "critical"}
   │
   └── kubectl finspot-dev ${live ? "healthy" : "unreachable"}`}
          </pre>
        </section>
      </div>

      <section className="ops-panel space-y-3 rounded-2xl p-4" aria-labelledby="cap-title">
        <h2 id="cap-title" className="font-display text-sm font-semibold">
          22. Capacity (inventory only)
        </h2>
        {latest ? (
          <div className="space-y-2">
            {[
              { label: "Ready ratio", pct: latest.pods ? Math.round((latest.ready / latest.pods) * 100) : 0 },
              { label: "Estate score", pct: latest.estate },
            ].map((bar) => (
              <button
                key={bar.label}
                type="button"
                onClick={() => setSelected(bar.label === "Estate score" ? ["k8s.estate"] : ["k8s.ready", "k8s.pods"])}
                className="block w-full text-left"
              >
                <p className="mb-1 text-xs text-muted-foreground">
                  {bar.label} · {bar.pct}%
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
                  <div className="h-full bg-brand-blue" style={{ width: `${bar.pct}%` }} />
                </div>
              </button>
            ))}
            <p className="text-xs text-muted-foreground">
              CPU, memory, disk, and DB connections are not in the kubectl snapshot.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Capacity unknown until live-k8s arrives.</p>
        )}
      </section>

      <section className="ops-panel space-y-3 rounded-2xl p-4" aria-labelledby="corr-title">
        <h2 id="corr-title" className="font-display text-sm font-semibold">
          9–12. Correlation
        </h2>
        <p className="text-sm text-muted-foreground">
          Traces, Prometheus baselines, and deployment markers are not collected. Selecting a sample
          time opens Logs → Evidence → RCA for the same Finspot-dev window.
        </p>
        <p className="font-mono text-xs">
          Compare / baseline / HTTP heatmap: unavailable. Group by {groupBy}. Aggregate: latest
          snapshot count (not rate).
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Observe inventory on this page</li>
          <li>Detect attention via not-ready / warnings</li>
          <li>
            Analyze the selected sample {investigate ? formatClock(investigate.ts) : "—"}
          </li>
          <li>Correlate in Logs and Evidence</li>
          <li>Document in RCA</li>
        </ol>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="size-3.5" aria-hidden="true" />
        Saved views persist only as the selected metric set in this session. Widget builder and
        drag layout are not on this slice.
      </p>
    </div>
  );
}
