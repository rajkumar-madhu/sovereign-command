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
import { Activity, Building2, CalendarClock, Radio, ShieldAlert } from "lucide-react";
import type { LivePodMonitoringSnapshot } from "@/hooks/use-live-pod-monitoring";
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

function MonitorRow({ monitor }: { monitor: PodMonitor }) {
  return (
    <li className="rounded-xl border border-border/80 bg-surface/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{monitor.name}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{monitor.query}</p>
        </div>
        <StatusPill tone={monitorTone(monitor.state)}>{monitor.state}</StatusPill>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-display text-lg font-semibold tabular-nums">{monitor.value}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{monitor.threshold}</p>
      </div>
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
      <section className="ops-panel rounded-2xl p-4" aria-label="Live pod monitoring">
        <p className="text-sm text-muted-foreground">
          Live monitoring requires Stage-1 API (`VITE_STAGE1_API_URL`).
        </p>
      </section>
    );
  }

  return (
    <section className="ops-panel space-y-4 rounded-2xl p-5" aria-label="Live pod monitoring">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <LiveDot active={Boolean(pod)} />
            <h2 className="font-display text-lg font-semibold tracking-tight">Live monitoring</h2>
            {hasAlert ? (
              <StatusPill tone="danger">alerting</StatusPill>
            ) : (
              <StatusPill tone="success">watching</StatusPill>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {pod
              ? `${pod.application ?? "payments-auth"} on ${pod.nodeName ?? "—"} · historical from onset + live poll every 15s`
              : "Polling Stage-1 pod evidence…"}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-3.5 shrink-0 text-brand-coral" aria-hidden="true" />
              <span>
                <span className="text-muted-foreground/70">Client</span> {customerName}
                <span className="mx-1.5 text-border">·</span>
                {tenantName}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
              Range {formatRangeLabel(range)}
            </span>
          </div>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          updated {new Date(updatedAt).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border/80 bg-surface/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="size-4 text-primary/70" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold">Restart count · historical + live</h3>
              <p className="text-xs text-muted-foreground">
                Filtered by date range · full history {historyLabel}
              </p>
            </div>
          </div>
          <div className="h-44 w-full">
            {seriesInRange.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesInRange} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-restarts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={28} />
                  <YAxis tick={{ fontSize: 10 }} width={40} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                    labelFormatter={(_, payload) => {
                      const ts = payload?.[0]?.payload?.ts;
                      return typeof ts === "number"
                        ? new Date(ts).toLocaleString()
                        : "";
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="restarts"
                    name="Restarts"
                    stroke="var(--destructive)"
                    fill="url(#fill-restarts)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted-foreground">
                <p>No restart samples in the selected customer date range.</p>
                <p className="font-mono text-[11px]">
                  Widen the range above (Incident window / Full day / custom) to see historical data.
                </p>
              </div>
            )}
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {monitors.map((m) => (
            <MonitorRow key={m.id} monitor={m} />
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border/80 bg-surface/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Radio className="size-4 text-brand-coral" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Kubelet events · in range</h3>
          <span className="font-mono text-[10px] text-muted-foreground">
            {eventsInRange.length} event{eventsInRange.length === 1 ? "" : "s"}
          </span>
        </div>
        {eventsInRange.length ? (
          <ul className="space-y-1.5">
            {eventsInRange.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 font-mono text-[11px] text-muted-foreground"
              >
                {e.severity === "critical" ? (
                  <ShieldAlert className="mt-0.5 size-3 shrink-0 text-destructive" aria-hidden="true" />
                ) : (
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                )}
                <span>
                  <span className="text-foreground/70">
                    {new Date(e.ts).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="mx-1.5 text-border">·</span>
                  {e.label}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No kubelet events in this date range. Expand the customer date range above to include
            recent BackOff / Pulled events.
          </p>
        )}
      </div>
    </section>
  );
}
