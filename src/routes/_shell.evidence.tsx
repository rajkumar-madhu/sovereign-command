import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileSearch, Logs, ScrollText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ReportChecks,
  ReportFields,
  ReportPre,
  ReportSection,
  ReportTable,
} from "@/components/ops/formal-report";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import {
  buildLiveEvidence,
  filterLiveEvidence,
  type EvidenceArtefact,
  type EvidenceFilters,
  type EvidenceSeverity,
  type EvidenceType,
} from "@/lib/live-evidence";
import { snapshotAgeLabel } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/evidence")({
  validateSearch: (search: Record<string, unknown>): { artifact?: string } => {
    const artifact = typeof search["artifact"] === "string" ? search["artifact"] : undefined;
    return artifact ? { artifact } : {};
  },
  head: () => ({
    meta: [
      { title: "Evidence Viewer · Wecrew Ops" },
      {
        name: "description",
        content:
          "Twenty-six-section investigation artefacts sealed from the live Finspot-dev kubectl snapshot.",
      },
    ],
  }),
  component: EvidenceViewer,
});

function useNowMs() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const SEVERITIES: Array<"all" | EvidenceSeverity> = [
  "all",
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "CRITICAL",
];
const TYPES: Array<"all" | EvidenceType> = [
  "all",
  "logs",
  "events",
  "snapshot",
  "metrics",
  "traces",
  "screenshots",
  "configuration",
  "deployment",
  "network",
  "database",
  "authentication",
];

function sevTone(sev: EvidenceSeverity): "success" | "warning" | "danger" | "info" | "neutral" {
  if (sev === "CRITICAL" || sev === "ERROR") return "danger";
  if (sev === "WARN") return "warning";
  if (sev === "INFO") return "info";
  return "neutral";
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-brand-coral/50 bg-brand-coral/10 text-foreground"
          : "border-border bg-surface/40 text-muted-foreground hover:bg-accent/50",
      )}
    >
      {children}
    </button>
  );
}

function EvidenceViewer() {
  const { artifact: artifactParam } = Route.useSearch();
  const ops = useOps();
  const nowMs = useNowMs();
  const { focusMode, setFocusMode } = useShellChrome();
  const report = useMemo(
    () => buildLiveEvidence(ops.clusterSnapshot, nowMs),
    [ops.clusterSnapshot, nowMs],
  );
  const age = snapshotAgeLabel(ops.clusterSnapshot?.generatedAt, nowMs);
  const [filters, setFilters] = useState<EvidenceFilters>({
    windowMin: 0,
    severity: "all",
    type: "all",
    namespace: "all",
  });
  const visible = useMemo(
    () => filterLiveEvidence(report.artefacts, filters, nowMs),
    [report.artefacts, filters, nowMs],
  );
  const [selectedId, setSelectedId] = useState(artifactParam ?? report.artefacts[0]?.id ?? "");
  const selected: EvidenceArtefact =
    visible.find((a) => a.id === selectedId) ??
    report.artefacts.find((a) => a.id === selectedId) ??
    visible[0] ??
    report.artefacts[0]!;

  useEffect(() => {
    if (artifactParam && report.artefacts.some((a) => a.id === artifactParam)) {
      setSelectedId(artifactParam);
    }
  }, [artifactParam, report.artefacts]);

  function openArtefact(id: string) {
    setSelectedId(id);
    document.getElementById("application")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Evidence pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-white/10"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-brand-coral/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 lg:p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Investigate · artefacts
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#f4f1ea] md:text-4xl">
              Evidence Viewer
            </h1>
            <p className="text-sm leading-relaxed text-[#f4f1ea]/75">
              Twenty-six-section artefact package sealed from the existing Finspot-dev kubectl
              snapshot. No seed tenants. Remediator held.
            </p>
            <StatusPill
              tone={report.live ? (report.attention > 0 ? "warning" : "success") : "warning"}
              className="w-fit bg-[#f4f1ea]/10 text-[#f4f1ea]"
            >
              {report.incidentId} · {report.severity} · {report.status}
            </StatusPill>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild className="bg-[#f4f1ea] text-brand-ink hover:bg-white">
                <Link to="/rca">
                  <ScrollText className="size-4" aria-hidden="true" />
                  Add to RCA
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]">
                <Link to="/logs">
                  <Logs className="size-4" aria-hidden="true" />
                  Open Logs
                </Link>
              </Button>
              <Button
                variant="outline"
                className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]"
                onClick={() =>
                  toast.success("Evidence bundle copied", {
                    description: `${report.incidentId} · ${visible.length} artefacts · remediator held`,
                  })
                }
              >
                Download
              </Button>
              {!focusMode && (
                <Button
                  variant="outline"
                  className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]"
                  onClick={() => setFocusMode(true)}
                >
                  Enter focus
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Collected", value: report.collected, hint: "artefacts" },
              { label: "Critical", value: report.criticalCount, hint: "ERROR+", hot: report.criticalCount > 0 },
              { label: "Attention", value: report.attention, hint: "pods", hot: report.attention > 0 },
              { label: "Nodes", value: report.nodes, hint: "cluster" },
              { label: "Snapshot", value: age, hint: report.live ? "k8s poll" : "offline", live: true },
              { label: "Write", value: "none", hint: "held" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/12 bg-[#141820]/80 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#f4f1ea]/55">{s.label}</p>
                <p
                  className={cn(
                    "font-display mt-1 text-2xl font-semibold tabular-nums",
                    s.hot ? "text-[#ff5b2e]" : "text-[#f4f1ea]",
                  )}
                >
                  {s.live && (
                    <span className="mr-1.5 inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral align-middle" />
                  )}
                  {s.value}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-[#f4f1ea]/45">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Formal artefact package"
        description="Incident context through recovery — filled from the live cluster, not demo clients."
        crumbs={[{ label: "Investigate" }, { label: "Evidence Viewer" }]}
      />
      <SafetyBanner />

      <ReportSection id="context" title="1. Incident Context">
        <ReportFields
          fields={[
            { label: "Incident ID", value: report.incidentId },
            { label: "Incident Title", value: report.title },
            { label: "Product", value: report.product },
            { label: "Environment", value: report.environment },
            { label: "Tenant / Client", value: report.tenant },
            { label: "Severity", value: report.severity },
            { label: "Investigation Window", value: report.window },
            { label: "Current Status", value: report.status },
          ]}
        />
      </ReportSection>

      <ReportSection id="summary" title="2. Evidence Summary">
        <ReportTable
          headers={["Evidence Type", "Count", "Status", "Critical Findings"]}
          rows={report.summary.map((s) => [s.type, String(s.count), s.status, s.critical])}
        />
      </ReportSection>

      <ReportSection id="timeline" title="3. Evidence Timeline">
        <p className="text-muted-foreground">
          Click a row to open the underlying artefact. Empty types stay empty — they are not seeded.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Timestamp</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Evidence</th>
                <th className="py-2 pr-3 font-medium">Severity</th>
                <th className="py-2 font-medium">Correlation</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">{row.timestamp}</td>
                  <td className="py-2 pr-3">{row.source}</td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => openArtefact(row.id)}
                      className="text-left text-primary hover:underline"
                    >
                      {row.evidence}
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <StatusPill tone={sevTone(row.severity)}>{row.severity}</StatusPill>
                  </td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{row.correlation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No artefacts match the current filters.</p>
        )}
      </ReportSection>

      <ReportSection id="filters" title="4. Evidence Filters">
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Time
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  [0, "Snapshot window"],
                  [5, "Last 5 minutes"],
                  [15, "Last 15 minutes"],
                  [60, "Last 1 hour"],
                ] as const
              ).map(([min, label]) => (
                <Chip
                  key={label}
                  active={filters.windowMin === min}
                  onClick={() => setFilters((f) => ({ ...f, windowMin: min }))}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Severity
            </p>
            <div className="flex flex-wrap gap-2">
              {SEVERITIES.map((sev) => (
                <Chip
                  key={sev}
                  active={filters.severity === sev}
                  onClick={() => setFilters((f) => ({ ...f, severity: sev }))}
                >
                  {sev}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Evidence type
            </p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Chip
                  key={t}
                  active={filters.type === t}
                  onClick={() => setFilters((f) => ({ ...f, type: t }))}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Namespace
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={filters.namespace === "all"}
                onClick={() => setFilters((f) => ({ ...f, namespace: "all" }))}
              >
                all
              </Chip>
              {report.namespaces.map((ns) => (
                <Chip
                  key={ns}
                  active={filters.namespace === ns}
                  onClick={() => setFilters((f) => ({ ...f, namespace: ns }))}
                >
                  {ns}
                </Chip>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Environment is pinned to {report.environment}. Metrics, traces, screenshots, database,
            authentication, deployment, and CI/CD filters stay empty because those sources are not
            in the Stage-1 slice.
          </p>
        </div>
      </ReportSection>

      <ReportSection id="application" title="5. Application Logs">
        <ReportFields
          fields={[
            { label: "Source", value: report.appSource },
            { label: "Service", value: report.appService },
            { label: "Pod", value: selected.pod },
            { label: "Artefact", value: selected.id },
          ]}
        />
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          10 lines before
        </p>
        <ReportPre>{report.contextBefore}</ReportPre>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Selected artefact
        </p>
        <ReportPre>{selected.body}</ReportPre>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          10 lines after
        </p>
        <ReportPre>{report.contextAfter}</ReportPre>
      </ReportSection>

      <ReportSection id="k8s" title="6. Kubernetes Evidence">
        <ReportFields
          fields={[
            { label: "Namespace", value: report.k8sNamespace },
            { label: "Pod", value: report.k8sPod },
            { label: "Node", value: report.k8sNode },
            { label: "Status", value: report.k8sStatus },
            { label: "Restart Count", value: report.k8sRestarts },
            { label: "Container Image", value: report.k8sImage },
          ]}
        />
        <h3 className="font-display text-sm font-semibold">Container State</h3>
        <ReportPre>{report.containerState}</ReportPre>
        <h3 className="font-display text-sm font-semibold">Kubernetes Events</h3>
        <ReportPre>{report.eventOutput}</ReportPre>
      </ReportSection>

      <ReportSection id="metrics" title="7. Metrics Evidence">
        <p>{report.metrics}</p>
        <ReportTable
          headers={["Metric", "Before", "Incident", "After"]}
          rows={report.latency.map((r) => [r.metric, r.before, r.incident, r.after])}
        />
        <ReportPre>{report.dbConnections}</ReportPre>
      </ReportSection>

      <ReportSection id="traces" title="8. Distributed Trace Evidence">
        <ReportFields fields={[{ label: "Trace ID", value: report.traceId }]} />
        <ReportPre>{report.traceTree}</ReportPre>
        <p>{report.traceFinding}</p>
      </ReportSection>

      <ReportSection id="database" title="9. Database Evidence">
        <p>{report.database}</p>
      </ReportSection>

      <ReportSection id="network" title="10. Network Evidence">
        <p>{report.network}</p>
      </ReportSection>

      <ReportSection id="ingress" title="11. Ingress Evidence">
        <p>{report.ingress}</p>
      </ReportSection>

      <ReportSection id="auth" title="12. Authentication Evidence">
        <p>{report.auth}</p>
      </ReportSection>

      <ReportSection id="config" title="13. Configuration Evidence">
        <ReportPre>{report.configuration}</ReportPre>
      </ReportSection>

      <ReportSection id="deploy" title="14. Deployment Evidence">
        <p>{report.deployment}</p>
      </ReportSection>

      <ReportSection id="cicd" title="15. CI/CD Evidence">
        <p>{report.cicd}</p>
      </ReportSection>

      <ReportSection id="shots" title="16. Screenshot Evidence">
        <p>{report.screenshots}</p>
      </ReportSection>

      <ReportSection id="metadata" title="17. Artefact Metadata">
        <ReportPre>{report.metadataJson}</ReportPre>
      </ReportSection>

      <ReportSection id="correlation" title="18. Evidence Correlation View">
        <ReportPre>{report.correlationTree}</ReportPre>
      </ReportSection>

      <ReportSection id="confidence" title="19. Evidence Confidence">
        <ReportTable
          headers={["Finding", "Evidence", "Confidence"]}
          rows={report.confidence.map((c) => [c.finding, c.evidence, c.confidence])}
        />
      </ReportSection>

      <ReportSection id="notes" title="20. Investigation Notes">
        <ReportPre>{report.notes}</ReportPre>
      </ReportSection>

      <ReportSection id="bookmarks" title="21. Evidence Bookmarks">
        <ReportTable
          headers={["Bookmark", "Count"]}
          rows={report.bookmarks.map((b) => [b.label, String(b.count)])}
        />
      </ReportSection>

      <ReportSection id="root-set" title="22. Root Cause Evidence Set">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 text-brand-coral" aria-hidden="true" />
          <p>{report.rootCause}</p>
        </div>
        <ol className="list-decimal space-y-1 pl-5">
          {report.supporting.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </ReportSection>

      <ReportSection id="recovery" title="23. Recovery Evidence">
        <h3 className="font-display text-sm font-semibold">Before</h3>
        <ReportPre>{report.recoveryBefore}</ReportPre>
        <h3 className="font-display text-sm font-semibold">After</h3>
        <ReportPre>{report.recoveryAfter}</ReportPre>
        <ReportChecks items={report.recoveryChecks} />
      </ReportSection>

      <ReportSection id="integrity" title="24. Evidence Integrity">
        <p className="text-muted-foreground">
          Digests are FNV-1a of the captured body — not a fabricated SHA-256 of seed logs.
        </p>
        <ReportTable
          headers={["Evidence ID", "Digest", "Source", "Collected", "Integrity"]}
          rows={report.integrity.map((i) => [i.id, i.digest, i.source, i.collected, i.status])}
        />
      </ReportSection>

      <ReportSection id="actions" title="25. Evidence Viewer Actions">
        <ul className="list-disc space-y-1 pl-5">
          {report.actions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/rca">
              <FileSearch className="size-4" aria-hidden="true" />
              Add to RCA
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/logs">Open in Logs</Link>
          </Button>
        </div>
      </ReportSection>

      <ReportSection id="final" title="26. Final Evidence Summary">
        <ReportFields
          fields={[
            { label: "Evidence Collected", value: String(report.collected) },
            { label: "Critical Evidence", value: String(report.criticalCount) },
            { label: "Root Cause Evidence", value: String(report.rootCauseCount) },
            { label: "Components Investigated", value: String(report.investigated) },
            { label: "Components Excluded", value: String(report.excluded) },
            { label: "Evidence Confidence", value: report.evidenceConfidence },
            { label: "Root Cause Proven", value: report.rootCauseProven },
            { label: "Recovery Proven", value: report.recoveryProven },
            { label: "Investigation Status", value: report.investigationStatus },
          ]}
        />
      </ReportSection>
    </div>
  );
}
