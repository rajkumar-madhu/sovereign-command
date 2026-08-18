import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { FileSearch, Maximize2, ScrollText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { evidenceArtifacts, incidents, customerName, tenantName } from "@/data/seed";
import type { EvidenceArtifact } from "@/data/types";
import {
  downloadJson,
  fetchLiveEvidence,
  fetchLiveEvidenceBundle,
  STAGE1_EXECUTION_ID,
  STAGE1_INCIDENT_ID,
  stage1ApiConfigured,
} from "@/lib/stage1-api";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";
import {
  DEFAULT_INCIDENT_RANGE,
  TimeRangeControl,
  filterLogLines,
  filterSeriesByClock,
  formatRangeLabel,
  inTimeRange,
  type TimeRange,
} from "@/components/ops/time-range-control";
import {
  ResourceIdentityChips,
  ResourceIdentityPanel,
} from "@/components/ops/resource-identity-panel";
import { inOpsScope, useOps } from "@/lib/ops-context";

export const Route = createFileRoute("/_shell/evidence")({
  validateSearch: (search: Record<string, unknown>): { artifact?: string } => {
    const artifact = typeof search.artifact === "string" ? search.artifact : undefined;
    return artifact ? { artifact } : {};
  },
  head: () => ({
    meta: [
      { title: "Evidence Viewer · Wecrew Ops" },
      {
        name: "description",
        content:
          "Hash-verified, read-only evidence artefacts collected during agent investigations: cluster snapshots, journals, probes and metrics.",
      },
      { property: "og:title", content: "Evidence Viewer · Wecrew Ops" },
      {
        property: "og:description",
        content: "Hash-verified read-only evidence artefacts from agent investigations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidenceViewer,
});

function useLiveVerifyRate(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(1, Math.min(24, Math.round(v + (Math.random() - 0.45) * 2))));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function formatCollected(isoOrTime: string) {
  const d = new Date(isoOrTime);
  if (Number.isNaN(d.getTime())) return { label: isoOrTime, iso: isoOrTime };
  return {
    label: d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }),
    iso: d.toISOString(),
  };
}

function LoadGraphPanel({
  body,
  range,
}: {
  body: string;
  range: TimeRange;
}) {
  const series = useMemo(() => {
    try {
      const parsed = JSON.parse(body) as {
        series?: Array<{ t: string; cpu: number; mem: number; disk: number; pullErrors: number }>;
      };
      return filterSeriesByClock(parsed.series ?? [], range);
    } catch {
      return [];
    }
  }, [body, range]);

  if (!series.length) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-border bg-surface/40 p-4 text-sm text-muted-foreground">
        No load-graph samples in the selected time window.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface/60 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Load graph · host utilisation vs PullImage errors · {formatRangeLabel(range)}
      </p>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={32} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={28} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cpu"
              name="CPU %"
              stroke="#2b4cff"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="mem"
              name="Mem %"
              stroke="#0f7a55"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pullErrors"
              name="Pull errors"
              stroke="var(--destructive)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function mergeEvidence(
  seed: EvidenceArtifact[],
  live: EvidenceArtifact[] | null,
): EvidenceArtifact[] {
  if (!live) return seed;
  const liveIds = new Set(live.map((a) => a.id));
  return [...live, ...seed.filter((a) => !liveIds.has(a.id))];
}

function EvidenceViewer() {
  const { artifact: artifactParam } = Route.useSearch();
  const ops = useOps();
  const [range, setRange] = useState<TimeRange>(DEFAULT_INCIDENT_RANGE);
  const [presetId, setPresetId] = useState("incident");
  const [liveEvidence, setLiveEvidence] = useState<EvidenceArtifact[] | null>(null);
  const [liveReady, setLiveReady] = useState(false);

  useEffect(() => {
    if (!stage1ApiConfigured()) {
      setLiveReady(true);
      return;
    }
    let cancelled = false;
    fetchLiveEvidence(STAGE1_EXECUTION_ID, "tn-nordic", evidenceArtifacts).then((rows) => {
      if (cancelled) return;
      setLiveEvidence(rows);
      setLiveReady(true);
      if (rows && rows.length) {
        const times = rows.map((a) => new Date(a.collected).getTime()).filter((n) => !Number.isNaN(n));
        if (times.length) {
          setRange({
            from: new Date(Math.min(...times) - 60 * 60 * 1000),
            to: new Date(Math.max(...times) + 60 * 60 * 1000),
          });
          setPresetId("stage1-live");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(
    () => mergeEvidence(evidenceArtifacts, liveEvidence),
    [liveEvidence],
  );
  const liveOverlay = liveReady && liveEvidence !== null && liveEvidence.length > 0;
  const filteredArtifacts = useMemo(
    () =>
      catalog.filter((a) => {
        const d = new Date(a.collected);
        if (Number.isNaN(d.getTime()) || !inTimeRange(d, range)) return false;
        if (!a.incidentId) return true;
        const inc = incidents.find((i) => i.id === a.incidentId);
        if (!inc) return true;
        return inOpsScope(inc, {
          tenantId: ops.tenantId,
          customerId: ops.customerId,
          environment: ops.environment,
        });
      }),
    [catalog, range, ops.tenantId, ops.customerId, ops.environment],
  );
  const initial =
    filteredArtifacts.find((a) => a.id === artifactParam)?.id ??
    filteredArtifacts[0]?.id ??
    evidenceArtifacts[0]!.id;
  const [selected, setSelected] = useState(initial);
  const artifact =
    filteredArtifacts.find((a) => a.id === selected) ??
    evidenceArtifacts.find((a) => a.id === selected) ??
    evidenceArtifacts[0]!;
  const linkedIncident = artifact.incidentId
    ? incidents.find((i) => i.id === artifact.incidentId)
    : undefined;
  const { focusMode, setFocusMode } = useShellChrome();
  const liveVerify = useLiveVerifyRate(6);
  const kinds = new Set(filteredArtifacts.map((a) => a.kind)).size;
  const collected = formatCollected(artifact.collected);
  const isLoadGraph = artifact.name === "load-graph.json" || artifact.kind.includes("load graph");
  const filteredBody = useMemo(() => {
    if (isLoadGraph) return artifact.body;
    return filterLogLines(artifact.body, range);
  }, [artifact.body, isLoadGraph, range]);

  async function exportBundle() {
    if (!stage1ApiConfigured()) {
      toast.error("Stage-1 API is not configured");
      return;
    }
    const bundle = await fetchLiveEvidenceBundle(STAGE1_EXECUTION_ID, "tn-nordic");
    if (!bundle) {
      toast.error("Could not fetch Stage-1 evidence bundle");
      return;
    }
    downloadJson("exec-clb-01-evidence-bundle.json", bundle);
    toast.success("Evidence bundle exported", {
      description: `sha256 head ${bundle.chain.head.slice(7, 19)}… · remediator held`,
    });
  }

  useEffect(() => {
    if (artifactParam && filteredArtifacts.some((a) => a.id === artifactParam)) {
      setSelected(artifactParam);
      return;
    }
    if (filteredArtifacts.length && !filteredArtifacts.some((a) => a.id === selected)) {
      setSelected(filteredArtifacts[0]!.id);
    }
  }, [artifactParam, filteredArtifacts, selected]);

  return (
    <div className="space-y-6">
      <section
        aria-label="Evidence pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-primary/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Investigate · artefacts
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Evidence Viewer
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Immutable artefacts for incident inc-4821 — pick a custom date/time window to review
              previous history, logs, and graphs.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!focusMode && (
                <Button
                  className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
                  onClick={() => setFocusMode(true)}
                >
                  <Maximize2 className="size-4" aria-hidden="true" />
                  Full-width details
                </Button>
              )}
              <Button
                variant="outline"
                className={cn(
                  focusMode
                    ? "border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
                    : "",
                )}
                onClick={() => void exportBundle()}
              >
                Export bundle
              </Button>
              <Button
                asChild
                variant="outline"
                className={cn(
                  focusMode
                    ? "border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
                    : "",
                )}
              >
                <Link to="/rca" search={{ incident: linkedIncident?.id ?? STAGE1_INCIDENT_ID }}>
                  <ScrollText className="size-4" aria-hidden="true" />
                  Open RCA
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "In window", value: filteredArtifacts.length, hint: "artefacts" },
              { label: "Kinds", value: kinds, hint: "classes" },
              {
                label: "Integrity",
                value: "100",
                unit: "%",
                hint: "verified",
              },
              {
                label: "Verify / min",
                value: liveVerify,
                hint: "live",
                live: true,
              },
              {
                label: "Focus",
                value: focusMode ? "on" : "off",
                hint: "⌘\\",
              },
              {
                label: "Selected",
                value: selected.replace("ev-", "#"),
                hint: "id",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  {s.label}
                </p>
                <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
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
        title="Hash-verified stream"
        description="Select a time window, then an artefact. Focus (⌘\\) maximizes the reading canvas."
        crumbs={[{ label: "Investigate" }, { label: "Evidence Viewer" }]}
      />
      <SafetyBanner compact />

      <TimeRangeControl
        value={range}
        presetId={presetId}
        onChange={(next, id) => {
          setRange(next);
          setPresetId(id);
        }}
      />

      <div
        className={cn(
          "grid gap-4",
          focusMode ? "xl:grid-cols-[260px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]",
        )}
      >
        <section className="ops-panel min-w-0 overflow-hidden rounded-2xl" aria-label="Artefacts">
          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
            <FileSearch className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Artefacts</h2>
              <p className="text-xs text-muted-foreground">
                {filteredArtifacts.length} in selected window
                {liveOverlay ? " · live Stage-1 hashes" : ""}
              </p>
            </div>
            {liveOverlay && <StatusPill tone="info">live Stage-1</StatusPill>}
          </div>
          <div className="space-y-2 p-3">
            {filteredArtifacts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No artefacts captured in this date range. Try Incident window or Full day 2 Aug.
              </p>
            ) : (
              filteredArtifacts.map((a) => {
                const when = formatCollected(a.collected);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelected(a.id)}
                    aria-pressed={a.id === selected}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      a.id === selected
                        ? "border-brand-coral/50 bg-brand-coral/10"
                        : "border-border bg-surface/40 hover:bg-accent/50",
                    )}
                  >
                    <p className="truncate font-mono text-xs font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.kind}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">{when.label}</p>
                    <ResourceIdentityChips resource={a.resource} className="mt-2" />
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="ops-panel min-w-0 overflow-hidden rounded-2xl" aria-label="Artefact detail">
          {filteredArtifacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Select a wider history window to inspect logs and graphs.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-2 border-b border-border/70 px-4 py-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-mono text-sm font-semibold">{artifact.name}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusPill tone="success">integrity verified</StatusPill>
                    {liveOverlay && artifact.id.startsWith("ev-clb-") && (
                      <StatusPill tone="info">live sha256</StatusPill>
                    )}
                    <span className="break-all font-mono">{artifact.hash}</span>
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    Captured <span className="text-foreground/80">{collected.label}</span>
                    <span className="mx-1.5 text-border">·</span>
                    <span className="opacity-70">{collected.iso}</span>
                  </p>
                  {linkedIncident && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Incident{" "}
                      <Link
                        to="/incidents/$incidentId"
                        params={{ incidentId: linkedIncident.id }}
                        className="font-mono text-primary hover:underline"
                      >
                        {linkedIncident.id}
                      </Link>
                      <span className="mx-1.5 text-border">·</span>
                      {tenantName(linkedIncident.tenantId)} · {customerName(linkedIncident.customerId)} ·{" "}
                      {linkedIncident.environment}
                    </p>
                  )}
                </div>
                <StatusPill tone="neutral">{artifact.kind}</StatusPill>
              </div>
              <div className="p-4">
                {artifact.resource ? (
                  <ResourceIdentityPanel
                    resources={[artifact.resource]}
                    title="Capture locus"
                    description="Hostname, IP, and application identity for this artefact"
                    className="mb-4"
                    compact
                  />
                ) : null}
                {isLoadGraph && <LoadGraphPanel body={artifact.body} range={range} />}
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {isLoadGraph ? "Raw series JSON" : "Logs · filtered by time"}
                </p>
                <pre
                  className={cn(
                    "overflow-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre",
                    focusMode ? "max-h-[min(72vh,780px)]" : "max-h-[520px]",
                  )}
                >
                  {filteredBody || "No log lines in the selected time window."}
                </pre>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
