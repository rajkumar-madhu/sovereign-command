import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Building2, CalendarClock, Radio, Server } from "lucide-react";
import type { LivePodMonitoringSnapshot } from "@/hooks/use-live-pod-monitoring";
import { restartCount, podStatusLabel } from "@/lib/live-pod-context";
import type { PodMonitor, PodMonitorState } from "@/lib/live-pod-monitoring";
import { StatusPill } from "@/components/ops/status-badge";
import {
  formatRangeLabel,
  type TimeRange,
} from "@/components/ops/time-range-control";
import { cn } from "@/lib/utils";

function monitorTone(state: PodMonitorState): "success" | "warning" | "danger" {
  if (state === "alert") return "danger";
  if (state === "warn") return "warning";
  return "success";
}

function statusLabel(state: PodMonitorState): string {
  if (state === "alert") return "Alert";
  if (state === "warn") return "Warn";
  return "OK";
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

function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  const accent = {
    neutral: "text-foreground",
    danger: "text-destructive",
    warning: "text-amber-800 dark:text-warning-foreground",
    success: "text-emerald-700 dark:text-success",
  }[tone];

  return (
    <div className="rounded-xl border border-border/80 bg-surface px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("font-display mt-1 text-2xl font-semibold tabular-nums tracking-tight", accent)}>
        {value}
      </p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function MonitorCard({ monitor }: { monitor: PodMonitor }) {
  return (
    <li className="rounded-xl border border-border/80 bg-surface px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{monitor.name}</p>
        <StatusPill tone={monitorTone(monitor.state)}>{statusLabel(monitor.state)}</StatusPill>
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground" title={monitor.query}>
        {monitor.query}
      </p>
      <p className="mt-1.5 text-xs tabular-nums text-foreground">
        <span className="font-semibold">{monitor.value}</span>
        <span className="text-muted-foreground"> · thr {monitor.threshold}</span>
      </p>
    </li>
  );
}

type LivePodMonitorPanelProps = {
  snapshot: LivePodMonitoringSnapshot;
  range: TimeRange;
  customerName: string;
  tenantName: string;
};

export function LivePodMonitorPanel({
  snapshot,
  range,
  customerName,
  tenantName,
}: LivePodMonitorPanelProps) {
  const {
    pod,
    seriesInRange,
    monitors,
    eventsInRange,
    updatedAt,
    live,
    historyFromMs,
    historyToMs,
  } = snapshot;

  const hasAlert = monitors.some((m) => m.state === "alert");
  const hasWarn = monitors.some((m) => m.state === "warn");
  const ageSec = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  const restarts = pod ? restartCount(pod) : 0;
  const phase = pod ? podStatusLabel(pod) : "—";
  const ready = pod?.containerStatuses?.[0]?.ready ?? false;

  const historyLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return `${new Date(historyFromMs).toLocaleString(undefined, opts)} → ${new Date(historyToMs).toLocaleString(undefined, opts)}`;
  }, [historyFromMs, historyToMs]);

  if (!live) {
    return (
      <section className="ops-panel rounded-2xl p-5" aria-label="Workload monitoring">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand-coral">
          Workload monitoring
        </p>
        <h2 className="font-display mt-1 text-lg font-semibold tracking-tight">Unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Stage-1 API to stream pod health, restart history, and kubelet events.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Workload monitoring">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand-coral">
            Workload monitoring
          </p>
          <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
            {pod?.application ?? "payments-auth"} · health & history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Historical restart series from incident onset, live threshold monitors, and kubelet
            events scoped to the selected customer date range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={hasAlert ? "danger" : hasWarn ? "warning" : "success"}>
            {hasAlert ? "Alerting" : hasWarn ? "Degraded" : "Healthy"}
          </StatusPill>
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-surface px-3 py-1.5 text-xs">
            <LiveDot active={Boolean(pod)} />
            <span className="font-medium text-foreground">LIVE</span>
            <span className="font-mono text-muted-foreground">
              {ageSec === 0 ? "updated now" : `updated ${ageSec}s ago`}
            </span>
          </div>
        </div>
      </div>

      <div className="ops-panel grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-2">
          <Building2 className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Customer scope
            </p>
            <p className="truncate text-sm font-medium">{customerName}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{tenantName}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Server className="mt-0.5 size-4 shrink-0 text-primary/70" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Placement
            </p>
            <p className="truncate font-mono text-sm">{pod?.cluster ?? "—"}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {pod?.nodeName ?? "—"} · ns {pod?.namespace ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Date range
            </p>
            <p className="text-sm font-medium leading-snug">{formatRangeLabel(range)}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              History {historyLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Ready"
          value={ready ? "1/1" : "0/1"}
          hint={pod?.name ?? "pod"}
          tone={ready ? "success" : "danger"}
        />
        <KpiTile
          label="Restarts"
          value={String(restarts)}
          hint="container total"
          tone={restarts >= 100 ? "danger" : restarts >= 14 ? "warning" : "success"}
        />
        <KpiTile
          label="Phase"
          value={phase}
          hint="waiting reason"
          tone={phase === "CrashLoopBackOff" ? "danger" : "neutral"}
        />
        <KpiTile
          label="Samples in range"
          value={String(seriesInRange.length)}
          hint="historical + live points"
          tone={seriesInRange.length ? "neutral" : "warning"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="ops-panel flex min-w-0 flex-col rounded-2xl p-4" aria-label="Restart history">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold tracking-tight">
                Restart history
              </h3>
              <p className="text-xs text-muted-foreground">
                Onset → now series · filtered by customer date range
              </p>
            </div>
            <Activity className="size-3.5 shrink-0 text-primary/70" aria-hidden="true" />
          </div>
          <div className="h-48 min-w-0 flex-1">
            {seriesInRange.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesInRange} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-restarts-pro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={32} />
                  <YAxis tick={{ fontSize: 10 }} width={42} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.ts;
                      return typeof ts === "number" ? new Date(ts).toLocaleString() : "";
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="restarts"
                    name="Restarts"
                    stroke="var(--destructive)"
                    fill="url(#fill-restarts-pro)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface/40 px-4 text-center">
                <p className="text-sm font-medium text-foreground/80">No samples in range</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Select <span className="font-medium">Onset → now (history)</span> or{" "}
                  <span className="font-medium">Last 24h</span> above to load historical restart
                  data for this customer.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="ops-panel rounded-2xl p-4" aria-labelledby="pod-monitors-title">
          <div className="mb-3 flex items-center gap-2">
            <div>
              <h3 id="pod-monitors-title" className="font-display text-sm font-semibold tracking-tight">
                Active monitors
              </h3>
              <p className="text-xs text-muted-foreground">
                Threshold checks on live pod evidence
              </p>
            </div>
          </div>
          <ul className="grid gap-2">
            {monitors.map((m) => (
              <MonitorCard key={m.id} monitor={m} />
            ))}
          </ul>
        </section>
      </div>

      <section className="ops-panel rounded-2xl p-4" aria-labelledby="pod-events-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-primary" aria-hidden="true" />
            <div>
              <h3 id="pod-events-title" className="font-display text-sm font-semibold tracking-tight">
                Kubelet event stream
              </h3>
              <p className="text-xs text-muted-foreground">
                Events in selected date range · {eventsInRange.length} shown
              </p>
            </div>
          </div>
        </div>
        {eventsInRange.length ? (
          <ul className="grid gap-1.5 md:grid-cols-2">
            {eventsInRange.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-2"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    e.severity === "critical" ? "bg-destructive" : "bg-primary",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug text-foreground/90">{e.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {new Date(e.ts).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground/80">No events in this range</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Expand the date range to include recent BackOff and Pulled events for this workload.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
