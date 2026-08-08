import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlarmClock, GitCompareArrows, History, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity } from "@/components/ops/status-badge";
import { useOps } from "@/lib/ops-context";
import { tenants } from "@/data/seed";
import {
  AT_RISK_PCT_MAX,
  AT_RISK_PCT_MIN,
  RISK_LEVELS,
  SLA_MINUTES_MAX,
  SLA_MINUTES_MIN,
  formatWindow,
  resolveSlaMinutes,
  validateRiskOrdering,
  validateSlaMinutes,
} from "@/lib/approval-sla";
import type { RiskLevel } from "@/data/types";
import { cn } from "@/lib/utils";

const ACTOR = "support@wecrew.in";

export const Route = createFileRoute("/_shell/sla-admin")({
  head: () => ({
    meta: [
      { title: "SLA Administration · Wecrew Ops" },
      {
        name: "description",
        content:
          "Configure approval SLA risk windows, the at-risk alert threshold and per-tenant SLA overrides with validation and a full change audit trail.",
      },
      { property: "og:title", content: "SLA Administration · Wecrew Ops" },
      {
        property: "og:description",
        content:
          "Govern dual-control approval SLA windows per risk level and per tenant, with validated, audited changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SlaAdmin,
});

function useLiveBreachWatch(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(0, Math.min(12, Math.round(v + (Math.random() - 0.55) * 1.4))));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function useLiveAtRiskCount(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(0, Math.min(18, Math.round(v + (Math.random() - 0.48) * 1.6))));
    }, 1900);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function SlaAdmin() {
  const { slaConfig, slaAuditLog, setSlaDefault, setAtRiskPct, setTenantSlaOverride } = useOps();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pct, setPct] = useState<number>(Math.round(slaConfig.atRiskPct));
  const [tenantId, setTenantId] = useState<string>(tenants[0]!.id);

  const overrideCount = useMemo(
    () => Object.values(slaConfig.tenantOverrides).reduce((sum, o) => sum + Object.keys(o).length, 0),
    [slaConfig.tenantOverrides],
  );

  const liveBreaches = useLiveBreachWatch(1);
  const liveAtRisk = useLiveAtRiskCount(4);
  const criticalWindow = formatWindow(slaConfig.defaults.critical);

  function draftFor(key: string, fallback: number | undefined) {
    return drafts[key] ?? (fallback === undefined ? "" : String(fallback));
  }

  function saveDefault(risk: RiskLevel) {
    const key = `default-${risk}`;
    const raw = draftFor(key, slaConfig.defaults[risk]);
    const error = validateSlaMinutes(raw);
    if (error) {
      setErrors((p) => ({ ...p, [key]: error }));
      toast.error("Invalid SLA window", { description: error });
      return;
    }
    const minutes = Number(raw);
    const ordering = validateRiskOrdering({ ...slaConfig.defaults, [risk]: minutes });
    if (ordering) {
      setErrors((p) => ({ ...p, [key]: ordering }));
      toast.error("SLA escalation ordering violated", { description: ordering });
      return;
    }
    setErrors((p) => ({ ...p, [key]: "" }));
    setSlaDefault(risk, minutes, ACTOR);
    toast.success(`Default ${risk} SLA set to ${formatWindow(minutes)}`, {
      description:
        "Change written to the SLA audit trail. Live countdowns updated; no production change executed.",
    });
  }

  function saveOverride(risk: RiskLevel) {
    const key = `${tenantId}-${risk}`;
    const raw = draftFor(key, slaConfig.tenantOverrides[tenantId]?.[risk]);
    if (!raw.trim()) {
      setErrors((p) => ({ ...p, [key]: "" }));
      setTenantSlaOverride(tenantId, risk, null, ACTOR);
      toast.success("Override removed", {
        description: `Tenant now inherits the default ${risk} window.`,
      });
      return;
    }
    const error = validateSlaMinutes(raw);
    if (error) {
      setErrors((p) => ({ ...p, [key]: error }));
      toast.error("Invalid tenant override", { description: error });
      return;
    }
    const minutes = Number(raw);
    if (minutes > slaConfig.defaults[risk]) {
      const msg = `Override must be at or below the ${formatWindow(slaConfig.defaults[risk])} default — tenants may tighten, not relax, an SLA.`;
      setErrors((p) => ({ ...p, [key]: msg }));
      toast.error("Override rejected", { description: msg });
      return;
    }
    setErrors((p) => ({ ...p, [key]: "" }));
    setTenantSlaOverride(tenantId, risk, minutes, ACTOR);
    toast.success(`${risk} override set to ${formatWindow(minutes)}`, {
      description: "Tenant override recorded in the SLA audit trail.",
    });
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="SLA administration pulse"
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
              Govern · dual-control clocks
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              SLA Administration
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Approval SLA windows, at-risk paging threshold and per-tenant overrides. Every change is
              validated and written to an append-only audit trail.
            </p>
            <Button
              asChild
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
            >
              <Link to="/approvals">
                <AlarmClock className="size-4" aria-hidden="true" />
                Open approval queue
              </Link>
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Critical", value: criticalWindow, hint: "fleet default" },
              {
                label: "At-risk %",
                value: Math.round(slaConfig.atRiskPct),
                unit: "%",
                hint: "consumed",
              },
              { label: "Overrides", value: overrideCount, hint: "tenant" },
              {
                label: "Audited",
                value: slaAuditLog.length,
                hint: "session",
              },
              {
                label: "At risk now",
                value: liveAtRisk,
                hint: "live",
                live: true,
                hot: liveAtRisk > 0,
              },
              {
                label: "Breaches",
                value: liveBreaches,
                hint: "live watch",
                live: true,
                hot: liveBreaches > 0,
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
        title="Windows & overrides"
        description="Configure risk windows, at-risk alerts and tenant tightenings. Simulation only — no production enforcement write."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "SLA Administration" }]}
      />
      <SafetyBanner compact />

      <Tabs defaultValue="defaults" className="space-y-4">
        <TabsList className="bg-surface">
          <TabsTrigger value="defaults">Risk thresholds</TabsTrigger>
          <TabsTrigger value="tenants">Per-tenant SLAs</TabsTrigger>
          <TabsTrigger value="audit">Change audit</TabsTrigger>
        </TabsList>

        <TabsContent value="defaults" className="mt-0 space-y-4">
          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Fleet default SLA windows">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <AlarmClock className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">Fleet default SLA windows</h2>
                <p className="text-xs text-muted-foreground">
                  {SLA_MINUTES_MIN}–{SLA_MINUTES_MAX} min · critical ≤ high ≤ medium ≤ low
                </p>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {RISK_LEVELS.map((risk) => {
                const key = `default-${risk}`;
                return (
                  <div key={risk} className="space-y-2 rounded-xl border border-border bg-surface/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <StatusPill tone={toneForSeverity(risk)}>{risk}</StatusPill>
                      <span className="text-xs text-muted-foreground">
                        current {formatWindow(slaConfig.defaults[risk])}
                      </span>
                    </div>
                    <Label htmlFor={key} className="text-xs text-muted-foreground">
                      SLA window (minutes)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={key}
                        inputMode="numeric"
                        className="bg-surface"
                        value={draftFor(key, slaConfig.defaults[risk])}
                        onChange={(e) => setDrafts((p) => ({ ...p, [key]: e.target.value }))}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={errors[key] ? `${key}-error` : undefined}
                      />
                      <Button size="sm" onClick={() => saveDefault(risk)}>
                        Save
                      </Button>
                    </div>
                    {errors[key] ? (
                      <p id={`${key}-error`} role="alert" className="text-xs text-destructive">
                        {errors[key]}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="ops-panel rounded-2xl p-5" aria-label="At-risk alert threshold">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">At-risk alert threshold</h2>
                <p className="text-xs text-muted-foreground">
                  Page once this share of the window is consumed · {AT_RISK_PCT_MIN}–{AT_RISK_PCT_MAX}%
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Alert when window consumed reaches</span>
                <span className="font-display text-lg font-semibold tabular-nums">{pct}%</span>
              </div>
              <Slider
                value={[pct]}
                min={AT_RISK_PCT_MIN}
                max={AT_RISK_PCT_MAX}
                step={1}
                onValueChange={(v) => setPct(v[0] ?? pct)}
                aria-label="At-risk alert threshold percentage"
              />
              <p className="text-xs text-muted-foreground">
                At {pct}%, a critical request alerts after{" "}
                {formatWindow(Math.round((slaConfig.defaults.critical * pct) / 100))} of its{" "}
                {formatWindow(slaConfig.defaults.critical)} window.
              </p>
              <Button
                onClick={() => {
                  setAtRiskPct(pct, ACTOR);
                  toast.success(`At-risk threshold set to ${pct}%`, {
                    description: "Applied to all pending approvals and written to the SLA audit trail.",
                  });
                }}
              >
                Apply threshold
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="tenants" className="mt-0 space-y-4">
          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Per-tenant SLA overrides">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <GitCompareArrows className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">Per-tenant SLA overrides</h2>
                <p className="text-xs text-muted-foreground">
                  Overrides may only tighten a window — clear and save to inherit
                </p>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="tenant-select">Tenant</Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger id="tenant-select" className="bg-surface" aria-label="Select tenant">
                    <SelectValue placeholder="Tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {t.residency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {RISK_LEVELS.map((risk) => {
                  const key = `${tenantId}-${risk}`;
                  const override = slaConfig.tenantOverrides[tenantId]?.[risk];
                  return (
                    <div key={key} className="space-y-2 rounded-xl border border-border bg-surface/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill tone={toneForSeverity(risk)}>{risk}</StatusPill>
                        <span className="text-xs text-muted-foreground">
                          {override === undefined
                            ? `inherits ${formatWindow(slaConfig.defaults[risk])}`
                            : `override ${formatWindow(override)}`}
                        </span>
                      </div>
                      <Label htmlFor={key} className="text-xs text-muted-foreground">
                        Override (minutes, blank inherits)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={key}
                          inputMode="numeric"
                          className="bg-surface"
                          placeholder={String(slaConfig.defaults[risk])}
                          value={draftFor(key, override)}
                          onChange={(e) => setDrafts((p) => ({ ...p, [key]: e.target.value }))}
                          aria-invalid={Boolean(errors[key])}
                          aria-describedby={errors[key] ? `${key}-error` : undefined}
                        />
                        <Button size="sm" onClick={() => saveOverride(risk)}>
                          Save
                        </Button>
                      </div>
                      {errors[key] ? (
                        <p id={`${key}-error`} role="alert" className="text-xs text-destructive">
                          {errors[key]}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Effective windows">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <GitCompareArrows className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">Effective windows</h2>
                <p className="text-xs text-muted-foreground">
                  Resolved SLA per tenant and risk · overrides marked
                </p>
              </div>
            </div>
            <div className="overflow-x-auto p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    {RISK_LEVELS.map((r) => (
                      <TableHead key={r} className="capitalize">
                        {r}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium whitespace-nowrap">{t.name}</TableCell>
                      {RISK_LEVELS.map((r) => {
                        const isOverride = slaConfig.tenantOverrides[t.id]?.[r] !== undefined;
                        return (
                          <TableCell key={r} className="text-sm tabular-nums">
                            {formatWindow(resolveSlaMinutes(slaConfig, t.id, r))}
                            {isOverride ? (
                              <span className="ml-2 text-[11px] text-primary">override</span>
                            ) : null}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="audit" className="mt-0">
          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="SLA configuration audit trail">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <History className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">SLA configuration audit trail</h2>
                <p className="text-xs text-muted-foreground">
                  Immutable, append-only record of every threshold change in this session
                </p>
              </div>
              {slaAuditLog.length > 0 && (
                <StatusPill tone="success" className="ml-auto">
                  {slaAuditLog.length} entries
                </StatusPill>
              )}
            </div>
            <div className="p-4">
              {slaAuditLog.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                  No SLA configuration changes yet. Saved threshold and override changes appear here
                  immediately.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time (UTC)</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slaAuditLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-[11px] whitespace-nowrap">
                            {entry.time.replace("T", " ").slice(0, 19)}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{entry.actor}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{entry.scope}</TableCell>
                          <TableCell className="text-sm capitalize whitespace-nowrap">
                            {entry.field}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">{entry.from}</TableCell>
                          <TableCell className="text-sm tabular-nums">{entry.to}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.outcome}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
