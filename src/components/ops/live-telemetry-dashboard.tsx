import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Radio, ShieldAlert } from "lucide-react";
import { StatusPill } from "@/components/ops/status-badge";
import type { LiveTelemetrySnapshot } from "@/hooks/use-live-telemetry";
import type { LiveMonitor, MonitorState, TelemetryPoint } from "@/lib/live-telemetry";
import { cn } from "@/lib/utils";

function monitorTone(state: MonitorState): "success" | "warning" | "danger" {
  if (state === "alert") return "danger";
  if (state === "warn") return "warning";
  return "success";
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex size-2" aria-hidden="true">
      <span
        className={cn(
          "absolute inline-flex size-full rounded-full opacity-60",
          active ? "animate-ping bg-brand-coral" : "bg-muted-foreground/40",
        )}
      />
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          active ? "bg-brand-coral" : "bg-muted-foreground/50",
        )}
      />
    </span>
  );
}

function MetricTile({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
        {unit ? <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function TimeseriesWidget({
  title,
  subtitle,
  data,
  dataKey,
  color,
  unit,
  yDomain,
}: {
  title: string;
  subtitle: string;
  data: TelemetryPoint[];
  dataKey: keyof TelemetryPoint;
  color: string;
  unit: string;
  yDomain?: [number, number];
}) {
  return (
    <section className="ops-panel flex min-w-0 flex-col rounded-2xl p-4" aria-label={title}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Activity className="size-3.5 shrink-0 text-primary/70" aria-hidden="true" />
      </div>
      <div className="h-40 min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              minTickGap={28}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              width={36}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              tickFormatter={(v: number) =>
                unit === "%" ? `${Math.round(v)}` : unit === "ms" ? `${Math.round(v)}` : `${Math.round(v)}`
              }
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [
                unit === "%"
                  ? `${value.toFixed(2)}${unit}`
                  : unit === "ms"
                    ? `${Math.round(value)}${unit}`
                    : `${Math.round(value)} ${unit}`,
                title,
              ]}
              labelFormatter={(label) => `t ${label}`}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${String(dataKey)})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function MonitorsStrip({ monitors }: { monitors: LiveMonitor[] }) {
  return (
    <section className="ops-panel rounded-2xl p-4" aria-labelledby="monitors-title">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="size-4 text-brand-coral" aria-hidden="true" />
        <div>
          <h3 id="monitors-title" className="font-display text-sm font-semibold tracking-tight">
            Active monitors
          </h3>
          <p className="text-xs text-muted-foreground">
            Threshold checks on live series — monitors-as-code pattern (no vendor lock-in)
          </p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {monitors.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-border/80 bg-surface px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">{m.name}</p>
              <StatusPill tone={monitorTone(m.state)}>{m.state}</StatusPill>
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{m.query}</p>
            <p className="mt-1.5 text-xs tabular-nums text-foreground">
              <span className="font-semibold">{m.value}</span>
              <span className="text-muted-foreground"> · thr {m.threshold}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventStream({ events }: { events: { id: string; ts: number; label: string; severity: string }[] }) {
  return (
    <section className="ops-panel flex h-full flex-col rounded-2xl p-4" aria-labelledby="events-title">
      <div className="mb-3 flex items-center gap-2">
        <Radio className="size-4 text-primary" aria-hidden="true" />
        <div>
          <h3 id="events-title" className="font-display text-sm font-semibold tracking-tight">
            Live event stream
          </h3>
          <p className="text-xs text-muted-foreground">Rolling ingest from collectors & agents</p>
        </div>
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5"
          >
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                e.severity === "critical"
                  ? "bg-destructive"
                  : e.severity === "warn"
                    ? "bg-warning"
                    : "bg-primary",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{e.label}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {new Date(e.ts).toLocaleTimeString(undefined, { hour12: false })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LiveTelemetryDashboard({ snapshot }: { snapshot: LiveTelemetrySnapshot }) {
  const { series, latest, monitors, events, updatedAt } = snapshot;
  const ageSec = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));

  return (
    <div className="space-y-4" aria-label="Live telemetry dashboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand-coral">
            Live telemetry
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
            Fleet metrics & monitors
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Streaming timeseries widgets and threshold monitors — Datadog-style dashboard layout,
            vendor-neutral simulated feed (1.5s ticks).
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-surface px-3 py-1.5 text-xs">
          <LiveDot active />
          <span className="font-medium text-foreground">LIVE</span>
          <span className="font-mono text-muted-foreground">
            updated {ageSec === 0 ? "now" : `${ageSec}s ago`}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="CPU" value={latest.cpu.toFixed(1)} unit="%" hint="fleet avg" />
        <MetricTile
          label="Latency p95"
          value={`${Math.round(latest.latencyMs)}`}
          unit="ms"
          hint="model gateway"
        />
        <MetricTile
          label="Error rate"
          value={latest.errorRate.toFixed(2)}
          unit="%"
          hint="production"
        />
        <MetricTile
          label="Throughput"
          value={`${Math.round(latest.throughput)}`}
          unit="rps"
          hint="agent invoke"
        />
        <MetricTile
          label="Agents busy"
          value={latest.agentBusy.toFixed(0)}
          unit="%"
          hint="active workers"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_minmax(220px,0.85fr)]">
        <TimeseriesWidget
          title="CPU utilization"
          subtitle="Agent hosts · last ~60s"
          data={series}
          dataKey="cpu"
          color="var(--chart-1)"
          unit="%"
          yDomain={[0, 100]}
        />
        <TimeseriesWidget
          title="Request latency"
          subtitle="Gateway p95 · ms"
          data={series}
          dataKey="latencyMs"
          color="var(--chart-3)"
          unit="ms"
          yDomain={[0, 600]}
        />
        <EventStream events={events} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TimeseriesWidget
          title="Error rate"
          subtitle="Failed invokes / total"
          data={series}
          dataKey="errorRate"
          color="var(--chart-4)"
          unit="%"
          yDomain={[0, 6]}
        />
        <TimeseriesWidget
          title="Throughput"
          subtitle="Requests per second"
          data={series}
          dataKey="throughput"
          color="var(--chart-2)"
          unit="rps"
          yDomain={[300, 1600]}
        />
      </div>

      <MonitorsStrip monitors={monitors} />
    </div>
  );
}
