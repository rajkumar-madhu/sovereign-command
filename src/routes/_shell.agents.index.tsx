import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForStatus } from "@/components/ops/status-badge";
import { agents, customerName, tenantName } from "@/data/seed";
import { useOps } from "@/lib/ops-context";
import type { Agent } from "@/data/types";

export const Route = createFileRoute("/_shell/agents/")({
  head: () => ({
    meta: [
      { title: "Agent Registry · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Searchable registry of supervisor, platform, network, database, security and reasoning agents with trust score, autonomy, model and owner.",
      },
      { property: "og:title", content: "Agent Registry · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Trust score, autonomy, model, tenant, environment and owner for every registered agent.",
      },
    ],
  }),
  component: AgentRegistry,
});

type SortKey = "name" | "trustScore" | "lastActive" | "executions24h";
const PAGE_SIZE = 8;

function AgentRegistry() {
  const ops = useOps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState<SortKey>("trustScore");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const effective = (a: Agent) => ops.agentStates[a.id] ?? a.status;
    const filtered = agents.filter(
      (a) =>
        (status === "all" || effective(a) === status) &&
        (kind === "all" || a.kind === kind) &&
        (a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.owner.toLowerCase().includes(query.toLowerCase()) ||
          a.model.toLowerCase().includes(query.toLowerCase())),
    );
    return [...filtered].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
  }, [query, status, kind, sort, asc, ops.agentStates]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const kinds = Array.from(new Set(agents.map((a) => a.kind)));

  function sortBy(key: SortKey) {
    if (key === sort) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Registry"
        description="Every registered agent, its passport posture and current operating envelope."
        crumbs={[{ label: "Operate", to: "/" }, { label: "Agent Registry" }]}
      />
      <SafetyBanner compact />

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{rows.length} agents</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, owner or model"
              aria-label="Search agents"
              className="sm:max-w-xs"
            />
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="quarantined">Quarantined</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kind} onValueChange={(v) => { setKind(v); setPage(1); }}>
              <SelectTrigger className="sm:w-44" aria-label="Filter by capability class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {kinds.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium">No agents match these filters</p>
              <Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setStatus("all"); setKind("all"); }}>
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button className="inline-flex items-center gap-1" onClick={() => sortBy("name")}>
                        Agent <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1" onClick={() => sortBy("trustScore")}>
                        Trust <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    </TableHead>
                    <TableHead>Autonomy</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>
                      <button className="inline-flex items-center gap-1" onClick={() => sortBy("lastActive")}>
                        Last active <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((a) => {
                    const st = ops.agentStates[a.id] ?? a.status;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            to="/agents/$agentId"
                            params={{ agentId: a.id }}
                            className="font-medium text-primary hover:underline"
                          >
                            {a.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{customerName(a.customerId)}</p>
                        </TableCell>
                        <TableCell><StatusPill tone={toneForStatus(st)}>{st}</StatusPill></TableCell>
                        <TableCell><StatusPill tone={toneForScore(a.trustScore)}>{a.trustScore}</StatusPill></TableCell>
                        <TableCell className="text-sm">{a.autonomy}</TableCell>
                        <TableCell className="font-mono text-xs">{a.model}</TableCell>
                        <TableCell className="text-sm">{tenantName(a.tenantId)}</TableCell>
                        <TableCell className="text-sm">{a.environment}</TableCell>
                        <TableCell className="text-sm">{a.owner}</TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {new Date(a.lastActive).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {current} of {pages} · {rows.length} agents
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}