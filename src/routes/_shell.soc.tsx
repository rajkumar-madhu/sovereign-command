import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldAlert, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { agentName, securityEvents, tenantName } from "@/data/seed";
import { useOps } from "@/lib/ops-context";
import { cn } from "@/lib/utils";
import { ResourceIdentityChips } from "@/components/ops/resource-identity-panel";

export const Route = createFileRoute("/_shell/soc")({
  head: () => ({
    meta: [
      { title: "Agent Security SOC · Wecrew Ops" },
      {
        name: "description",
        content:
          "Detect and triage prompt injection, secret access, cross-tenant attempts, malicious MCP tools, token anomalies and reasoning loops.",
      },
      { property: "og:title", content: "Agent Security SOC · Wecrew Ops" },
      {
        property: "og:description",
        content: "Prompt injection, secret access, cross-tenant and malicious tool detections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocPage,
});

const CATEGORIES = [
  "prompt-injection",
  "secret-access",
  "cross-tenant",
  "malicious-mcp",
  "token-anomaly",
  "loop-detection",
  "failed-action",
] as const;

function useLiveIngress(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(2, Math.min(48, Math.round(v + (Math.random() - 0.42) * 3))));
    }, 1700);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function useLiveBlockRate(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(62, Math.min(99, Math.round(v + (Math.random() - 0.48) * 2))));
    }, 2100);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function SocPage() {
  const ops = useOps();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");

  const scopedEvents = useMemo(
    () => securityEvents.filter((e) => e.tenantId === ops.tenantId),
    [ops.tenantId],
  );

  const rows = useMemo(
    () =>
      scopedEvents.filter(
        (e) =>
          (severity === "all" || e.severity === severity) &&
          (category === "all" || e.category === category) &&
          `${e.detail} ${e.agentId} ${agentName(e.agentId)} ${tenantName(e.tenantId)} ${e.resource?.hostname ?? ""} ${e.resource?.ipAddress ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [scopedEvents, query, severity, category],
  );

  const count = (c: string) => scopedEvents.filter((e) => e.category === c).length;
  const p1 = scopedEvents.filter((e) => e.severity === "P1").length;
  const blocked = scopedEvents.filter((e) => e.action === "blocked" || e.action === "quarantined").length;
  const blockPctBase = Math.round((blocked / Math.max(1, scopedEvents.length)) * 100);
  const liveIngress = useLiveIngress(7);
  const liveBlock = useLiveBlockRate(blockPctBase);

  return (
    <div className="space-y-6">
      <section
        aria-label="Security SOC pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-destructive/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · threat detection
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Agent Security SOC
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Control-plane security signal correlated by tenant and agent identity — injection,
              secrets, boundary breaches and malicious tools.
            </p>
            <Button
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              onClick={() =>
                toast.success("SOC refresh queued", {
                  description: "Read-only re-correlation of the last 24h security event stream.",
                })
              }
            >
              <Siren className="size-4" aria-hidden="true" />
              Refresh detections
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Events", value: securityEvents.length, hint: "24h stream" },
              { label: "P1 open", value: p1, hint: "critical", hot: p1 > 0 },
              {
                label: "Ingress / min",
                value: liveIngress,
                hint: "live",
                live: true,
              },
              {
                label: "Block rate",
                value: liveBlock,
                unit: "%",
                hint: "live",
                live: true,
              },
              {
                label: "Injection",
                value: count("prompt-injection"),
                hint: "prompt",
                hot: count("prompt-injection") > 0,
              },
              {
                label: "Cross-tenant",
                value: count("cross-tenant"),
                hint: "boundary",
                hot: count("cross-tenant") > 0,
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
                    "font-display mt-1 text-2xl font-semibold tabular-nums",
                    s.hot ? "text-destructive" : "text-sidebar-accent-foreground",
                  )}
                >
                  {s.live && (
                    <span className="mr-1.5 inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral align-middle" />
                  )}
                  {s.value}
                  {s.unit ? (
                    <span className="ml-0.5 text-sm font-medium text-sidebar-foreground/55">{s.unit}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Detection stream"
        description="Triage prompt injection, secret access, cross-tenant attempts and malicious MCP registrations."
        crumbs={[{ label: "Govern" }, { label: "Agent Security SOC" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Category breakdown">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <ShieldAlert className="size-4 text-brand-coral" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold">Category signal</h2>
            <p className="text-xs text-muted-foreground">Tap a category filter via the stream below</p>
          </div>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {CATEGORIES.map((c) => {
            const n = count(c);
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(active ? "all" : c)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-brand-coral/50 bg-brand-coral/10"
                    : "border-border bg-surface/50 hover:bg-surface-strong",
                )}
              >
                <p className="truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {c.replace(/-/g, " ")}
                </p>
                <p
                  className={cn(
                    "font-display mt-1 text-xl font-semibold tabular-nums",
                    n > 0 && (c === "prompt-injection" || c === "secret-access" || c === "cross-tenant")
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {n}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Security events">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3">
          <Siren className="size-4 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold">Security event stream</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} of {scopedEvents.length} events · tenant {tenantName(ops.tenantId)} · host / IP attached
            </p>
          </div>
          {p1 > 0 && (
            <StatusPill tone="danger">
              {p1} P1
            </StatusPill>
          )}
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search detail, agent, host or IP"
              aria-label="Search security events"
              className="bg-surface sm:max-w-xs"
            />
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="bg-surface sm:w-40" aria-label="Filter by severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {["P1", "P2", "P3", "P4"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-surface sm:w-52" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium">No security events match these filters</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setSeverity("all");
                  setCategory("all");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Host / IP</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow
                      key={e.id}
                      className={e.severity === "P1" ? "bg-destructive/5" : undefined}
                    >
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">
                        {new Date(e.time).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.category}</TableCell>
                      <TableCell>
                        <StatusPill tone={toneForSeverity(e.severity)}>{e.severity}</StatusPill>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {agentName(e.agentId)}
                      </TableCell>
                      <TableCell className="min-w-[10rem]">
                        <ResourceIdentityChips resource={e.resource} />
                        {!e.resource && (
                          <span className="font-mono text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {tenantName(e.tenantId)}
                      </TableCell>
                      <TableCell className="max-w-md text-sm text-muted-foreground">
                        {e.detail}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneForStatus(e.action)}>{e.action}</StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
