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
import type { LivePodMonitoringSnapshot } from "@/hooks/use-live-pod-monitoring";
import type { PodMonitor, PodMonitorState } from "@/lib/live-pod-monitoring";
import { StatusPill } from "@/components/ops/status-badge";
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

export function LivePodMonitorPanel({ snapshot }: { snapshot: LivePodMonitoringSnapshot }) {
  const { pod, series, monitors, events, updatedAt, live } = snapshot;
  const hasAlert = monitors.some((m) => m.state === "alert");

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
        <div>
          <div className="mb-1 flex items-center gap-2">
            <LiveDot active={Boolean(pod)} />
            <h2 className="font-display text-lg font-semibold tracking-tight">Live monitoring</h2>
            {hasAlert ? <StatusPill tone="danger">alerting</StatusPill> : <StatusPill tone="success">watching</StatusPill>}
          </div>
          <p className="text-sm text-muted-foreground">
            {pod
              ? `${pod.application ?? "payments-auth"} on ${pod.nodeName ?? "—"} · polled every 15s from Stage-1 evidence`
              : "Polling Stage-1 pod evidence…"}
          </p>
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
              <h3 className="text-sm font-semibold">Restart count · live</h3>
              <p className="text-xs text-muted-foreground">Container restarts from ev-clb-2 refresh</p>
            </div>
          </div>
          <div className="h-40 w-full">
            {series.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-restarts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10 }} width={36} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
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
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Waiting for first poll…
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

      {events.length ? (
        <div className="rounded-xl border border-border/80 bg-surface/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Radio className="size-4 text-brand-coral" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Kubelet events · live</h3>
          </div>
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 font-mono text-[11px] text-muted-foreground"
              >
                {e.severity === "critical" ? (
                  <ShieldAlert className="mt-0.5 size-3 shrink-0 text-destructive" aria-hidden="true" />
                ) : (
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                )}
                <span>{e.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
