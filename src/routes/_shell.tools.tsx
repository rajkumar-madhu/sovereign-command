import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Globe, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForStatus } from "@/components/ops/status-badge";
import { mcpTools } from "@/data/seed";
import type { McpTool } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/tools")({
  head: () => ({
    meta: [
      { title: "Tool & MCP Registry · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Registry of every MCP tool available to the agent fleet: owner, version, permissions, security scan status, call volume, error rate, external access and trust score.",
      },
      { property: "og:title", content: "Tool & MCP Registry · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Governed MCP tool inventory with scan status, trust scores and per-tool telemetry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolRegistry,
});

function errorRate(t: McpTool) {
  return t.calls30d === 0 ? 0 : (t.errors30d / t.calls30d) * 100;
}

function useLiveCallsPerMin(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(8, Math.min(420, Math.round(v + (Math.random() - 0.45) * 14))));
    }, 1800);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function useLiveErrPct(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(0.05, Math.min(4.5, +(v + (Math.random() - 0.5) * 0.12).toFixed(2))));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function ToolRegistry() {
  const [query, setQuery] = useState("");
  const [scan, setScan] = useState("all");
  const [access, setAccess] = useState("all");
  const [selected, setSelected] = useState<McpTool | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mcpTools.filter((t) => {
      if (scan !== "all" && t.scan !== scan) return false;
      if (access === "external" && !t.externalAccess) return false;
      if (access === "internal" && t.externalAccess) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q) ||
        t.permissions.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [query, scan, access]);

  const failed = mcpTools.filter((t) => t.scan === "failed").length;
  const warning = mcpTools.filter((t) => t.scan === "warning").length;
  const external = mcpTools.filter((t) => t.externalAccess).length;
  const calls = mcpTools.reduce((s, t) => s + t.calls30d, 0);
  const avgErr =
    calls === 0
      ? 0
      : (mcpTools.reduce((s, t) => s + t.errors30d, 0) / calls) * 100;
  const avgTrust = Math.round(
    mcpTools.reduce((s, t) => s + t.trustScore, 0) / mcpTools.length,
  );

  const liveCpm = useLiveCallsPerMin(48);
  const liveErr = useLiveErrPct(+avgErr.toFixed(2));

  return (
    <div className="space-y-6">
      <section
        aria-label="Tool registry pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-primary/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · supply chain
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Tool & MCP Registry
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Every MCP tool the fleet can reach — scan status, permissions, egress posture and
              trust scoring. Registry mutations are simulated only.
            </p>
            <Button
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              onClick={() =>
                toast.success("Registry re-scan queued", {
                  description: `${mcpTools.length} tool manifests queued for read-only supply-chain scanning.`,
                })
              }
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              Re-scan registry
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Registered", value: mcpTools.length, hint: "MCP tools" },
              {
                label: "Failed scans",
                value: failed,
                hint: `${warning} warn`,
                hot: failed > 0,
              },
              { label: "External", value: external, hint: "egress" },
              {
                label: "Calls / min",
                value: liveCpm,
                hint: "live",
                live: true,
              },
              {
                label: "Error rate",
                value: liveErr.toFixed(2),
                unit: "%",
                hint: "live",
                live: true,
              },
              {
                label: "Avg trust",
                value: avgTrust,
                hint: "fleet",
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
        title="Inventory & trust"
        description="Supply-chain scans, permissions and call telemetry for every registered MCP tool."
        crumbs={[{ label: "Govern" }, { label: "Tool & MCP Registry" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Tool inventory">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Wrench className="size-4 text-brand-coral" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold">Tool inventory</h2>
            <p className="text-xs text-muted-foreground">
              {(calls / 1000).toFixed(1)}k calls · 30d · open a row for trust detail
            </p>
          </div>
          {failed > 0 && (
            <StatusPill tone="danger" className="ml-auto">
              <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
              {failed} quarantined
            </StatusPill>
          )}
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tool, owner or permission"
              aria-label="Search tools"
              className="bg-surface"
            />
            <Select value={scan} onValueChange={setScan}>
              <SelectTrigger className="bg-surface" aria-label="Filter by scan status">
                <SelectValue placeholder="Scan status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scan results</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={access} onValueChange={setAccess}>
              <SelectTrigger className="bg-surface" aria-label="Filter by external access">
                <SelectValue placeholder="Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All access types</SelectItem>
                <SelectItem value="external">External access</SelectItem>
                <SelectItem value="internal">Internal only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No tool matches these filters. Clear the search or reset the scan filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Scan</TableHead>
                    <TableHead className="text-right">Calls 30d</TableHead>
                    <TableHead className="text-right">Errors 30d</TableHead>
                    <TableHead>External</TableHead>
                    <TableHead className="text-right">Trust</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id} className={t.scan === "failed" ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-medium whitespace-nowrap">{t.name}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{t.owner}</TableCell>
                      <TableCell className="tabular-nums">{t.version}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.permissions.map((p) => (
                            <span
                              key={p}
                              className="rounded-md border border-border bg-surface-strong px-1.5 py-0.5 text-xs"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneForStatus(t.scan)}>{t.scan}</StatusPill>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.calls30d.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.errors30d.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={t.externalAccess ? "warning" : "neutral"}>
                          {t.externalAccess ? (
                            <>
                              <Globe className="mr-1 inline size-3" aria-hidden="true" />
                              external
                            </>
                          ) : (
                            "internal"
                          )}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusPill tone={toneForScore(t.trustScore)}>{t.trustScore}</StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(t)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.owner} · v{selected.version} · {selected.transport}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={toneForStatus(selected.scan)}>scan: {selected.scan}</StatusPill>
                  <StatusPill tone={toneForScore(selected.trustScore)}>
                    trust {selected.trustScore}
                  </StatusPill>
                  <StatusPill tone={selected.externalAccess ? "warning" : "neutral"}>
                    {selected.externalAccess ? "external access" : "internal only"}
                  </StatusPill>
                </div>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Trust score
                  </p>
                  <Progress
                    value={selected.trustScore}
                    className="mt-2"
                    aria-label={`Trust score ${selected.trustScore} of 100`}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Calls (30d)</dt>
                    <dd className="font-medium tabular-nums">
                      {selected.calls30d.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Errors (30d)</dt>
                    <dd className="font-medium tabular-nums">
                      {selected.errors30d.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Error rate</dt>
                    <dd className="font-medium tabular-nums">{errorRate(selected).toFixed(2)}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Last scanned</dt>
                    <dd className="font-medium">{selected.lastScanned}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Permissions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-md border border-border bg-surface-strong px-2 py-0.5 text-xs"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Registry notes
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.notes}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success("Scan requested", {
                        description: `${selected.name} queued for a read-only supply-chain scan.`,
                      })
                    }
                  >
                    Request re-scan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info("Review raised", {
                        description: `Access review opened for ${selected.name} with Security Engineering.`,
                      })
                    }
                  >
                    Raise access review
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
