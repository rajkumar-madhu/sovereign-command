import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Globe, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForStatus } from "@/components/ops/status-badge";
import { mcpTools } from "@/data/seed";
import type { McpTool } from "@/data/types";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool & MCP Registry"
        description="Every MCP tool the fleet can reach, with supply-chain scan status, permissions and trust scoring."
        crumbs={[{ label: "Govern" }, { label: "Tool & MCP Registry" }]}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Registry re-scan queued", {
                description: `${mcpTools.length} tool manifests queued for read-only supply-chain scanning.`,
              })
            }
          >
            Re-scan registry
          </Button>
        }
      />
      <SafetyBanner compact />

      <section aria-label="Registry metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Registered tools" value={mcpTools.length} hint="MCP stdio and HTTP transports" icon={<Wrench className="size-4" aria-hidden="true" />} />
        <MetricCard label="Failed scans" value={failed} tone="danger" hint={`${warning} with warnings`} icon={<AlertTriangle className="size-4" aria-hidden="true" />} />
        <MetricCard label="External access" value={external} tone="warning" hint="Egress allowlist enforced" icon={<Globe className="size-4" aria-hidden="true" />} />
        <MetricCard label="Calls (30d)" value={`${(calls / 1000).toFixed(1)}k`} tone="info" hint="Read verbs only" icon={<ShieldCheck className="size-4" aria-hidden="true" />} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tool inventory</CardTitle>
          <CardDescription>Open a tool to inspect calls, errors, external access and registry notes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tool, owner or permission"
              aria-label="Search tools"
            />
            <Select value={scan} onValueChange={setScan}>
              <SelectTrigger aria-label="Filter by scan status">
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
              <SelectTrigger aria-label="Filter by external access">
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
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
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
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium whitespace-nowrap">{t.name}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{t.owner}</TableCell>
                      <TableCell className="tabular-nums">{t.version}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.permissions.map((p) => (
                            <span key={p} className="rounded-md border border-border bg-surface-strong px-1.5 py-0.5 text-xs">
                              {p}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneForStatus(t.scan)}>{t.scan}</StatusPill>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.calls30d.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.errors30d.toLocaleString()}</TableCell>
                      <TableCell>
                        <StatusPill tone={t.externalAccess ? "warning" : "neutral"}>
                          {t.externalAccess ? "external" : "internal"}
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
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.owner} · v{selected.version} · {selected.transport}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={toneForStatus(selected.scan)}>scan: {selected.scan}</StatusPill>
                  <StatusPill tone={toneForScore(selected.trustScore)}>trust {selected.trustScore}</StatusPill>
                  <StatusPill tone={selected.externalAccess ? "warning" : "neutral"}>
                    {selected.externalAccess ? "external access" : "internal only"}
                  </StatusPill>
                </div>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Trust score</p>
                  <Progress value={selected.trustScore} className="mt-2" aria-label={`Trust score ${selected.trustScore} of 100`} />
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Calls (30d)</dt>
                    <dd className="font-medium tabular-nums">{selected.calls30d.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Errors (30d)</dt>
                    <dd className="font-medium tabular-nums">{selected.errors30d.toLocaleString()}</dd>
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
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Permissions</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.permissions.map((p) => (
                      <span key={p} className="rounded-md border border-border bg-surface-strong px-2 py-0.5 text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Registry notes</p>
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
