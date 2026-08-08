import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, Bot, PanelRightOpen, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForScore, toneForStatus } from "@/components/ops/status-badge";
import { agents, customerName, tenantName } from "@/data/seed";
import { useFleetPulse } from "@/hooks/use-fleet-pulse";
import { useInspector } from "@/lib/inspector-context";
import { useOps } from "@/lib/ops-context";
import type { Agent } from "@/data/types";
import { cn } from "@/lib/utils";

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
  const pulse = useFleetPulse(true);
  const { selectedAgentId, focusAgent, open: inspectorOpen } = useInspector();
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
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
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
      <section
        aria-label="Fleet pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-brand-coral/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Operate · fleet
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Agent Registry
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Passport posture and operating envelope for every registered agent. Select a row to
              open details — inspector stays closed until you need it.
            </p>
          </div>
          <div className="grid w-full max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Active", value: pulse.active, hint: "running" },
              { label: "Degraded", value: pulse.degraded, hint: "watch", warn: pulse.degraded > 0 },
              { label: "High-risk", value: pulse.highRisk, hint: "posture", warn: true },
              {
                label: "Invokes/min",
                value: pulse.invokesPerMin,
                hint: "live",
                live: true,
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
                    s.warn ? "text-warning" : "text-sidebar-accent-foreground",
                  )}
                >
                  {s.value}
                </p>
                <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-sidebar-foreground/50">
                  {s.live && (
                    <span className="inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral" />
                  )}
                  {s.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Registry"
        description="Search, filter and sort the fleet. Click a row for passport controls in the details panel."
        crumbs={[{ label: "Operate", to: "/" }, { label: "Agent Registry" }]}
        actions={
          !inspectorOpen ? (
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <PanelRightOpen className="size-3.5" aria-hidden="true" />
              Row click opens details
            </p>
          ) : null
        }
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Agent table">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-brand-coral" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold">{rows.length} agents</h2>
            <span className="text-xs text-muted-foreground">avg trust {pulse.avgTrust}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, owner or model"
              aria-label="Search agents"
              className="bg-surface sm:max-w-xs"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-surface sm:w-44" aria-label="Filter by status">
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
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-surface sm:w-44" aria-label="Filter by capability class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {kinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <ShieldAlert className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">No agents match these filters</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setKind("all");
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
                    <TableHead>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => sortBy("name")}
                      >
                        Agent <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => sortBy("trustScore")}
                      >
                        Trust <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    </TableHead>
                    <TableHead>Autonomy</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => sortBy("lastActive")}
                      >
                        Last active <ArrowUpDown className="size-3" aria-hidden="true" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((a) => {
                    const st = ops.agentStates[a.id] ?? a.status;
                    const selected = selectedAgentId === a.id;
                    return (
                      <TableRow
                        key={a.id}
                        data-state={selected ? "selected" : undefined}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selected && "bg-primary/5 hover:bg-primary/10",
                        )}
                        onClick={() => focusAgent(a.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            focusAgent(a.id);
                          }
                        }}
                        tabIndex={0}
                        aria-selected={selected}
                      >
                        <TableCell>
                          <Link
                            to="/agents/$agentId"
                            params={{ agentId: a.id }}
                            className="font-medium text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{customerName(a.customerId)}</p>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={toneForStatus(st)}>{st}</StatusPill>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={toneForScore(a.trustScore)}>{a.trustScore}</StatusPill>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{a.autonomy}</TableCell>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 1}
                  onClick={() => setPage(current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === pages}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
