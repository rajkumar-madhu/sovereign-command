import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { customerName, incidents, tenantName } from "@/data/seed";
import { inOpsScope, useOps } from "@/lib/ops-context";

export const Route = createFileRoute("/_shell/investigations")({
  head: () => ({
    meta: [
      { title: "Investigations · Wecrew Ops" },
      {
        name: "description",
        content:
          "Agent-led, evidence-backed investigations across every tenant estate, with SLA exposure and recurrence signals.",
      },
      { property: "og:title", content: "Investigations · Wecrew Ops" },
      {
        property: "og:description",
        content: "Evidence-backed agent investigations with SLA exposure and recurrence.",
      },
    ],
  }),
  component: Investigations,
});

function Investigations() {
  const navigate = useNavigate();
  const ops = useOps();
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState(false);

  const scoped = useMemo(
    () =>
      incidents.filter((i) =>
        inOpsScope(i, {
          tenantId: ops.tenantId,
          customerId: ops.customerId,
          environment: ops.environment,
        }),
      ),
    [ops.tenantId, ops.customerId, ops.environment],
  );

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return scoped;
    return scoped.filter((i) => {
      const hay = [
        i.id,
        i.title,
        i.application,
        i.summary,
        tenantName(i.tenantId),
        customerName(i.customerId),
        i.resources?.[0]?.hostname,
        i.resources?.[0]?.ipAddress,
        i.resources?.[0]?.cluster,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [scoped, query]);

  const open = scoped.filter((i) => i.status !== "closed");
  const p1 = open.filter((i) => i.severity === "P1").length;
  const slaRisk = open.filter((i) => i.slaRisk).length;

  function start() {
    setStarting(true);
    window.setTimeout(() => {
      setStarting(false);
      toast.success("Investigation started", {
        description: "Supervisor agent dispatched in read-only mode.",
      });
      void navigate({ to: "/incidents/$incidentId", params: { incidentId: "inc-4821" } });
    }, 600);
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Investigations pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Investigate · queue
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Investigations
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Open incidents for the selected tenant / client / environment in the top bar. Search
              by host, IP, application, or ID.
            </p>
            <Button
              onClick={start}
              disabled={starting}
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
            >
              <Siren className="size-4" aria-hidden="true" />
              {starting ? "Dispatching…" : "Start investigation"}
            </Button>
          </div>
          <div className="grid w-full max-w-sm grid-cols-3 gap-2">
            {[
              { label: "Open", value: open.length },
              { label: "P1", value: p1, hot: true },
              { label: "SLA risk", value: slaRisk, hot: slaRisk > 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  {s.label}
                </p>
                <p
                  className={`font-display mt-1 text-2xl font-semibold tabular-nums ${
                    s.hot ? "text-destructive" : "text-sidebar-accent-foreground"
                  }`}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Active queue"
        description="Search by incident reference or title — open a workspace for the full timeline."
        crumbs={[{ label: "Investigate" }, { label: "Investigations" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-semibold">{rows.length} investigations</h2>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search investigations"
            aria-label="Search investigations"
            className="bg-surface sm:max-w-xs"
          />
        </div>
        <div className="p-4">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No investigations match this search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Application / host</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead className="text-right">Recurrence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i.id} className="hover:bg-accent/40">
                      <TableCell>
                        <Link
                          to="/incidents/$incidentId"
                          params={{ incidentId: i.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {i.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{i.id}</p>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneForSeverity(i.severity)}>{i.severity}</StatusPill>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneForStatus(i.status)}>{i.status}</StatusPill>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <p className="text-foreground/90">{i.application ?? "—"}</p>
                        <p className="text-muted-foreground">
                          {i.resources?.[0]?.hostname ?? "—"}
                          {i.resources?.[0]?.ipAddress
                            ? ` · ${i.resources[0].ipAddress}`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{tenantName(i.tenantId)}</TableCell>
                      <TableCell className="text-sm">{customerName(i.customerId)}</TableCell>
                      <TableCell>
                        {i.slaRisk ? (
                          <StatusPill tone="danger">at risk</StatusPill>
                        ) : (
                          <StatusPill tone="success">within SLA</StatusPill>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{i.recurrence}x</TableCell>
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
