import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Copy, FileSearch, Logs, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useContainerLogs } from "@/hooks/use-container-logs";
import {
  buildProductLogAnalysis,
  collapseRepeatedLines,
  DEFAULT_LOG_COLUMNS,
  filterParsedLines,
  levelBarHeight,
  LOG_EXPLORER_COLUMNS,
  logSourceCandidates,
  mergeLogColumns,
  parseLogstashDump,
  sortParsedLines,
  type LayerTone,
  type LogColumnKey,
  type LogRow,
  type LogSortKey,
  type ParsedLogLevel,
} from "@/lib/live-logs";
import { snapshotAgeLabel } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";
import { useOpsSession } from "@/lib/ops-session";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

const COLUMN_STORAGE = "logsExplorerVisibleColumns";
const AUTOSCROLL_STORAGE = "logsExplorerAutoscroll";
const PAGE_SIZE = 80;

export const Route = createFileRoute("/_shell/logs")({
  validateSearch: (search: Record<string, unknown>): { line?: string } => {
    const line = typeof search["line"] === "string" ? search["line"] : "";
    if (!/^ls-\d+$/.test(line)) return {};
    return { line };
  },
  head: () => ({
    meta: [
      { title: "Logs Explorer · Wecrew Ops" },
      {
        name: "description",
        content:
          "Grafana-style logs dashboard: data source, query, transform, and a raw Logstash panel from live kubectl logs.",
      },
    ],
  }),
  component: LogsExplorer,
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

function layerMark(tone: LayerTone): string {
  if (tone === "healthy") return "healthy";
  if (tone === "watch") return "watch";
  if (tone === "critical") return "critical";
  return "n/a";
}

function layerTone(tone: LayerTone): "success" | "warning" | "danger" | "neutral" {
  if (tone === "healthy") return "success";
  if (tone === "watch") return "warning";
  if (tone === "critical") return "danger";
  return "neutral";
}

function lineTone(level: ParsedLogLevel): string {
  if (level === "ERROR" || level === "FATAL") return "text-[#ff5b2e]";
  if (level === "WARN") return "text-[#f0b429]";
  if (level === "DEBUG") return "text-[#8b93a7]";
  return "text-[#d7d2c8]";
}

function levelPillTone(level: ParsedLogLevel): "success" | "warning" | "danger" | "neutral" {
  if (level === "ERROR" || level === "FATAL") return "danger";
  if (level === "WARN") return "warning";
  if (level === "INFO") return "success";
  return "neutral";
}

function readColumns(): Record<LogColumnKey, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_LOG_COLUMNS };
  try {
    return mergeLogColumns(JSON.parse(window.localStorage.getItem(COLUMN_STORAGE) ?? "null"));
  } catch {
    return { ...DEFAULT_LOG_COLUMNS };
  }
}

function readAutoscroll(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(AUTOSCROLL_STORAGE) !== "0";
}

function LogsExplorer() {
  const ops = useOps();
  const { session } = useOpsSession();
  const nowMs = useNowMs();
  const { focusMode, setFocusMode } = useShellChrome();
  const { line: selectedLineId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"dashboard" | "analysis">("dashboard");
  const [namespace, setNamespace] = useState("");
  const [pod, setPod] = useState("");
  const [level, setLevel] = useState<ParsedLogLevel | "ALL">("ALL");
  const [pipeline, setPipeline] = useState("");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [panelMode, setPanelMode] = useState<"table" | "raw">("table");
  const [sort, setSort] = useState<LogSortKey>("oldest");
  const [collapseRepeats, setCollapseRepeats] = useState(false);
  const [columns, setColumns] = useState<Record<LogColumnKey, boolean>>({ ...DEFAULT_LOG_COLUMNS });
  const [autoscroll, setAutoscroll] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState(false);

  const dump = useContainerLogs(
    session?.tenantId ?? "",
    namespace && pod ? { namespace, pod } : undefined,
    Boolean(session),
    Boolean(selectedLineId),
  );
  const report = useMemo(
    () => buildProductLogAnalysis(ops.clusterSnapshot, nowMs, dump),
    [ops.clusterSnapshot, nowMs, dump],
  );
  const age = snapshotAgeLabel(dump?.generatedAt || ops.clusterSnapshot?.generatedAt, nowMs);
  const sources = logSourceCandidates(ops.clusterSnapshot);
  const parsed = useMemo(() => parseLogstashDump(dump?.text ?? ""), [dump?.text]);
  const visible = useMemo(
    () =>
      filterParsedLines(parsed, {
        level,
        ...(pipeline ? { pipeline } : {}),
        ...(query ? { query } : {}),
      }),
    [parsed, level, pipeline, query],
  );
  const ordered = useMemo(
    () => sortParsedLines(collapseRepeatedLines(visible, collapseRepeats), sort),
    [visible, collapseRepeats, sort],
  );
  const shown = autoscroll ? ordered : ordered.slice(0, limit);
  const selectedIndex = selectedLineId ? ordered.findIndex((line) => line.id === selectedLineId) : -1;
  const selected = selectedIndex >= 0 ? ordered[selectedIndex] : undefined;
  const pipelines = report.pipelines;
  const volumeLevels: ParsedLogLevel[] = ["INFO", "WARN", "ERROR", "DEBUG", "FATAL"];
  const volume = volumeLevels.map((name) => ({
    level: name,
    count: visible.filter((line) => line.level === name).length,
  }));
  const maxVolume = Math.max(1, ...volume.map((row) => row.count));
  const streamState = !dump ? "loading" : dump.source === "unavailable" ? "offline" : "live";

  useEffect(() => {
    setColumns(readColumns());
    setAutoscroll(readAutoscroll());
  }, []);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [level, pipeline, query, sort, collapseRepeats, dump?.pod]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "f" && event.key !== "F") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      queryRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openLine = (id: string) => {
    void navigate({ search: { line: id }, replace: true });
  };
  const closeLine = () => {
    setCopied(false);
    void navigate({ search: {}, replace: true });
  };
  const stepLine = (delta: number) => {
    const next = ordered[selectedIndex + delta];
    if (!next) return;
    setCopied(false);
    void navigate({ search: { line: next.id }, replace: true });
  };
  const toggleColumn = (key: LogColumnKey) => {
    setColumns((current) => {
      const next = mergeLogColumns({ ...current, [key]: !current[key] });
      try {
        window.localStorage.setItem(COLUMN_STORAGE, JSON.stringify(next));
      } catch {
        /* preference is optional */
      }
      return next;
    });
  };
  const toggleAutoscroll = () => {
    setAutoscroll((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(AUTOSCROLL_STORAGE, next ? "1" : "0");
      } catch {
        /* preference is optional */
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Logs explorer pulse"
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
              Investigate · logs explorer
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#f4f1ea] md:text-4xl">
              Logs Explorer
            </h1>
            <p className="text-sm leading-relaxed text-[#f4f1ea]/75">
              Grafana path: data source → query → transform → panel. The live source is{" "}
              <span className="font-mono">kubectl logs</span> on Finspot-dev (Logstash{" "}
              <span className="font-mono">analytics-ls</span> first). Passwords stay redacted.
              Remediator held.
            </p>
            <StatusPill
              tone={streamState === "live" ? (report.attention > 0 ? "warning" : "success") : "warning"}
              className="w-fit bg-[#f4f1ea]/10 text-[#f4f1ea]"
            >
              {streamState === "live" ? "LIVE" : streamState === "loading" ? "LOADING" : "OFFLINE"} ·{" "}
              {report.streamSource || "no stream"} · {report.cluster}
            </StatusPill>
            <div className="flex flex-wrap gap-2 pt-1" role="tablist" aria-label="Logs views">
              <Button
                role="tab"
                aria-selected={view === "dashboard"}
                className={cn(
                  view === "dashboard" ? "bg-[#f4f1ea] text-brand-ink hover:bg-white" : "border-white/20 bg-[#141820]/70 text-[#f4f1ea]",
                )}
                variant={view === "dashboard" ? "default" : "outline"}
                onClick={() => setView("dashboard")}
              >
                Dashboard
              </Button>
              <Button
                role="tab"
                aria-selected={view === "analysis"}
                className={cn(
                  view === "analysis" ? "bg-[#f4f1ea] text-brand-ink hover:bg-white" : "border-white/20 bg-[#141820]/70 text-[#f4f1ea]",
                )}
                variant={view === "analysis" ? "default" : "outline"}
                onClick={() => setView("analysis")}
              >
                Formal analysis
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]">
                <Link to="/rca">
                  <FileSearch className="size-4" aria-hidden="true" />
                  Open RCA
                </Link>
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
              { label: "Source", value: streamState === "live" ? "live-k8s" : streamState, hint: dump?.pod || "kubectl logs" },
              { label: "Lines", value: parsed.length, hint: `tail ${dump?.tailLines ?? 400}` },
              { label: "WARN", value: report.levels.find((l) => l.level === "WARN")?.count ?? 0, hint: report.warnPct, hot: true },
              { label: "ERROR", value: report.totalErrors, hint: report.errorPct },
              { label: "Pipelines", value: pipelines.length, hint: pipelines.join(" · ") || "none" },
              { label: "Snapshot", value: age, hint: "k8s poll", live: true },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/12 bg-[#141820]/80 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#f4f1ea]/55">{s.label}</p>
                <p
                  className={cn(
                    "font-display mt-1 text-2xl font-semibold tabular-nums",
                    s.hot && Number(s.value) > 0 ? "text-[#ff5b2e]" : "text-[#f4f1ea]",
                  )}
                >
                  {s.live && (
                    <span className="mr-1.5 inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral align-middle" />
                  )}
                  {s.value}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-[#f4f1ea]/45">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {view === "dashboard" ? (
        <>
          <PageHeader
            title="Dashboard"
            description="Same gates as Grafana: plugin, query, optional transform, then panels."
            crumbs={[{ label: "Investigate" }, { label: "Logs Explorer" }]}
          />
          <SafetyBanner />

          <section className="ops-panel space-y-4 rounded-2xl p-5 md:p-6" aria-label="Query editor">
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="space-y-1.5 text-xs">
                <span className="uppercase tracking-[0.12em] text-muted-foreground">1. Data source</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm"
                  value={pod ? `${namespace}/${pod}` : ""}
                  onChange={(event) => {
                    const [nextNs = "", nextPod = ""] = event.target.value.split("/");
                    setNamespace(nextNs);
                    setPod(nextPod);
                  }}
                >
                  <option value="">auto · analytics-ls / Logstash</option>
                  {sources.map((row) => (
                    <option key={`${row.namespace}/${row.name}`} value={`${row.namespace}/${row.name}`}>
                      {row.kind} · {row.namespace}/{row.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-xs lg:col-span-2">
                <span className="uppercase tracking-[0.12em] text-muted-foreground">2. Query</span>
                <div className="flex gap-2">
                  <Input
                    ref={queryRef}
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setQuery(draftQuery);
                    }}
                    placeholder="Filter text, e.g. noren_filebeat or DEPRECATION"
                    aria-keyshortcuts="F"
                    className="font-mono"
                  />
                  <Button type="button" onClick={() => setQuery(draftQuery)}>
                    Run
                  </Button>
                </div>
              </label>
              <label className="space-y-1.5 text-xs">
                <span className="uppercase tracking-[0.12em] text-muted-foreground">3. Transform</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={pipeline}
                  onChange={(event) => setPipeline(event.target.value)}
                >
                  <option value="">All pipelines</option>
                  {pipelines.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={level === item}
                  onClick={() => setLevel(item)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs",
                    level === item
                      ? "border-brand-ink bg-brand-ink text-[#f4f1ea]"
                      : "border-border bg-surface/60 text-muted-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
              <p className="self-center font-mono text-[11px] text-muted-foreground">
                plugin=k8s-read · verb=get logs · client filter of last {dump?.tailLines ?? 400} lines · not Loki · press F to search
              </p>
            </div>
          </section>

          <section className="ops-panel space-y-3 rounded-2xl p-5 md:p-6" aria-label="Log volume">
            <h2 className="font-display text-lg font-semibold">Log volume</h2>
            <p className="text-sm text-muted-foreground">
              Counts from the filtered tail — not a Loki range query, no invented RPS.
            </p>
            <div className="flex h-8 items-end gap-px" aria-hidden="true">
              {visible.slice(-72).map((line) => (
                <span
                  key={line.id}
                  title={line.level}
                  className={cn(
                    "w-1 flex-1 rounded-sm",
                    line.level === "ERROR" || line.level === "FATAL"
                      ? "bg-[#ff5b2e]"
                      : line.level === "WARN"
                        ? "bg-[#f0b429]"
                        : line.level === "DEBUG"
                          ? "bg-[#8b93a7]"
                          : "bg-[#2b4cff]",
                  )}
                  style={{ height: levelBarHeight(line.level) }}
                />
              ))}
            </div>
            <div className="space-y-2">
              {volume.map((row) => (
                <div key={row.level} className="grid grid-cols-[5rem_1fr_4rem] items-center gap-3 text-sm">
                  <span className="font-mono text-xs">{row.level}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.level === "ERROR" || row.level === "FATAL"
                          ? "bg-[#ff5b2e]"
                          : row.level === "WARN"
                            ? "bg-[#f0b429]"
                            : "bg-[#2b4cff]",
                      )}
                      style={{ width: `${Math.round((row.count / maxVolume) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </section>

          <LogsPanel
            autoscroll={autoscroll}
            columns={columns}
            collapseRepeats={collapseRepeats}
            dumpLabel={`${dump?.namespace || "—"}/${dump?.pod || "waiting"}`}
            empty={
              streamState === "loading"
                ? "Loading kubectl logs from Finspot-dev…"
                : streamState === "live"
                  ? "Filter returned 0 lines."
                  : "No live stream. Stage-1 cannot reach Finspot-dev from this host, or kubectl logs is empty. Seed Logstash dumps are not substituted."
            }
            limit={limit}
            onOpen={openLine}
            onToggleAutoscroll={toggleAutoscroll}
            onToggleCollapse={() => setCollapseRepeats((current) => !current)}
            onToggleColumn={toggleColumn}
            orderedCount={ordered.length}
            panelMode={panelMode}
            parsedCount={parsed.length}
            selectedId={selectedLineId}
            setLimit={setLimit}
            setPanelMode={setPanelMode}
            setSort={setSort}
            shown={shown}
            sort={sort}
            streamState={streamState}
            streamDetail={streamState === "live" ? "LIVE" : streamState === "loading" ? "loading" : dump?.error || "unavailable"}
            visibleCount={visible.length}
          />
          <LogLineDialog
            copied={copied}
            line={selected}
            missing={Boolean(selectedLineId) && !selected}
            onClose={closeLine}
            onCopy={async (raw) => {
              try {
                await navigator.clipboard.writeText(raw);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            onStep={stepLine}
            open={Boolean(selectedLineId)}
            position={selectedIndex >= 0 ? `${selectedIndex + 1} / ${ordered.length}` : ""}
          />
        </>
      ) : (
        <>
          <PageHeader
            title="Formal log analysis"
            description="Thirty-six-section package sealed from the live snapshot plus the Logstash stream."
            crumbs={[{ label: "Investigate" }, { label: "Logs Explorer" }, { label: "Analysis" }]}
          />
          <SafetyBanner />

          <ReportSection id="summary" title="1. Analysis Summary">
            <ReportFields
              fields={[
                { label: "Product Name", value: report.product },
                { label: "Application / Module", value: report.module },
                { label: "Environment", value: report.environment },
                { label: "Client / Tenant", value: report.client },
                { label: "Analysis Date", value: report.analysisDate },
                { label: "Analysis Window", value: report.window },
                { label: "Prepared By", value: report.preparedBy },
                { label: "Overall Status", value: report.overall },
                { label: "Severity", value: report.severity },
                { label: "Stream", value: report.streamSource || "—" },
              ]}
            />
          </ReportSection>

          <ReportSection id="executive" title="2. Executive Summary">
            <p>{report.executive}</p>
          </ReportSection>

          <ReportSection id="impact" title="3. User / Business Impact">
            <h3 className="font-display text-sm font-semibold">User Impact</h3>
            <ReportFields
              fields={[
                { label: "Affected Users", value: report.affectedUsers },
                { label: "Impact Level", value: report.businessLevel },
                { label: "Failed Requests", value: String(report.failedRequests) },
                { label: "Delayed Requests", value: String(report.delayedRequests) },
              ]}
            />
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Affected functions
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {report.affectedFunctions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Observed symptoms
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {report.symptoms.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportSection>

          <ReportSection id="sources" title="4. Log Sources Analyzed">
            <ReportTable
              headers={["Source", "Component", "Location / Platform", "Status"]}
              rows={report.sources.map((s) => [s.source, s.component, s.location, s.status])}
            />
          </ReportSection>

          <ReportSection id="flow" title="5. Product Request Flow">
            <p className="text-xs text-muted-foreground">Complete poll path</p>
            <ReportPre>{report.requestFlow}</ReportPre>
            <p className="text-xs text-muted-foreground">Affected transaction</p>
            <ReportPre>{report.affectedFlow}</ReportPre>
          </ReportSection>

          <ReportSection id="scope" title="6. Analysis Scope">
            <ReportFields
              fields={[
                { label: "From", value: report.from },
                { label: "To", value: report.to },
              ]}
            />
            <ReportChecks items={report.scope.map((s) => ({ label: s.label, ok: s.included }))} />
          </ReportSection>

          <ReportSection id="volume" title="7. Log Volume Summary">
            <ReportTable
              headers={["Log Level", "Count", "Percentage"]}
              rows={report.levels.map((l) => [l.level, String(l.count), l.pct])}
            />
            <ReportFields
              fields={[
                { label: "Total Logs", value: String(report.totalLogs) },
                { label: "Total Errors", value: String(report.totalErrors) },
                { label: "Error Percentage", value: report.errorPct },
                { label: "Warning Percentage", value: report.warnPct },
              ]}
            />
          </ReportSection>

          <ReportSection id="categories" title="8. Error Category Analysis">
            <ReportTable
              headers={["Category", "Count", "Severity", "Component"]}
              rows={report.categories.map((c) => [c.category, String(c.count), c.severity, c.component])}
            />
          </ReportSection>

          <ReportSection id="top-errors" title="9. Top Errors">
            {report.topErrors.map((err, i) => (
              <div key={`${err.component}-${err.message}`} className="space-y-3">
                <h3 className="font-display text-sm font-semibold">Error {i + 1}</h3>
                <ReportPre>{err.message}</ReportPre>
                <ReportFields
                  fields={[
                    { label: "Component", value: err.component },
                    { label: "Occurrence Count", value: String(err.count) },
                    { label: "First Seen", value: err.first },
                    { label: "Last Seen", value: err.last },
                    { label: "Affected Endpoint", value: err.endpoint },
                    { label: "Affected Users/Tenant", value: err.tenant },
                    { label: "Impact", value: err.impact },
                    { label: "Likely Cause", value: err.cause },
                  ]}
                />
              </div>
            ))}
          </ReportSection>

          <ReportSection id="http" title="10. HTTP Error Analysis">
            <p className="text-muted-foreground">
              HTTP status counts are not present in the kubectl inventory slice. Zeros are explicit, not
              inferred success.
            </p>
            <ReportTable
              headers={["HTTP Code", "Meaning", "Count", "Primary Endpoint"]}
              rows={report.http.map((h) => [h.code, h.meaning, String(h.count), h.endpoint])}
            />
          </ReportSection>

          <ReportSection id="api" title="11. API-Level Analysis">
            <ReportTable
              headers={["API Endpoint", "Requests", "Success", "Failed", "Avg Latency", "P95", "P99"]}
              rows={report.apis.map((a) => [
                a.endpoint,
                String(a.requests),
                String(a.success),
                String(a.failed),
                a.avg,
                a.p95,
                a.p99,
              ])}
            />
          </ReportSection>

          <ReportSection id="latency" title="12. Latency Analysis">
            <ReportFields
              fields={[
                { label: "P50", value: report.latency.p50 },
                { label: "P95", value: report.latency.p95 },
                { label: "P99", value: report.latency.p99 },
                { label: "Maximum", value: report.latency.max },
              ]}
            />
            <ul className="list-disc space-y-1 pl-5">
              {report.latency.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </ReportSection>

          <ReportSection id="frontend" title="13. Frontend Log Analysis">
            <p>{report.frontend}</p>
          </ReportSection>

          <ReportSection id="backend" title="14. Backend Log Analysis">
            <p>{report.backend}</p>
          </ReportSection>

          <ReportSection id="database" title="15. Database Log Analysis">
            <p>{report.database}</p>
          </ReportSection>

          <ReportSection id="auth" title="16. Authentication / Authorization Analysis">
            <p>{report.auth}</p>
          </ReportSection>

          <ReportSection id="k8s" title="17. Kubernetes Analysis">
            <h3 className="font-display text-sm font-semibold">Pod Status</h3>
            <ReportPre>{`kubectl get pods -A\n\n${report.podOutput}`}</ReportPre>
            <h3 className="font-display text-sm font-semibold">Pod Restart Analysis</h3>
            <ReportPre>{report.restartOutput}</ReportPre>
            <h3 className="font-display text-sm font-semibold">Kubernetes Events</h3>
            <ReportPre>{`kubectl get events -A --sort-by='.lastTimestamp'\n\n${report.eventOutput}`}</ReportPre>
          </ReportSection>

          <ReportSection id="resources" title="18. CPU / Memory / Resource Analysis">
            <ReportTable
              headers={["Component", "CPU", "Memory", "Limit", "Status"]}
              rows={report.resources.map((r) => [r.component, r.cpu, r.memory, r.limit, r.status])}
            />
          </ReportSection>

          <ReportSection id="ingress" title="19. Ingress / Load Balancer Analysis">
            <p>{report.ingress}</p>
          </ReportSection>

          <ReportSection id="network" title="20. Network Analysis">
            <p>{report.network}</p>
          </ReportSection>

          <ReportSection id="cache" title="21. Cache Analysis">
            <p>{report.cache}</p>
          </ReportSection>

          <ReportSection id="queue" title="22. Message Queue Analysis">
            <p>{report.queue}</p>
          </ReportSection>

          <ReportSection id="deps" title="23. External Dependency Analysis">
            <ReportTable
              headers={["Dependency", "Status", "Latency", "Errors"]}
              rows={report.deps.map((d) => [d.name, d.status, d.latency, d.errors])}
            />
          </ReportSection>

          <ReportSection id="correlation" title="24. Error Correlation">
            <ReportPre>{report.correlation}</ReportPre>
          </ReportSection>

          <ReportSection id="timeline" title="25. Timeline Correlation">
            <ReportTable
              headers={["Time", "Component", "Log/Event", "Impact"]}
              rows={report.timeline.map((t) => [t.time, t.component, t.event, t.impact])}
            />
          </ReportSection>

          <ReportSection id="root-cause" title="26. Root Cause">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 text-brand-coral" aria-hidden="true" />
              <p>{report.rootCause}</p>
            </div>
          </ReportSection>

          <ReportSection id="contributing" title="27. Contributing Factors">
            <ul className="list-disc space-y-1 pl-5">
              {report.contributing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportSection>

          <ReportSection id="evidence-root" title="28. Root-Cause Evidence">
            <h3 className="font-display text-sm font-semibold">Application Evidence</h3>
            <ReportPre>{report.appEvidence}</ReportPre>
            <h3 className="font-display text-sm font-semibold">Database Evidence</h3>
            <ReportPre>{report.dbEvidence}</ReportPre>
            <h3 className="font-display text-sm font-semibold">Monitoring Evidence</h3>
            <ReportPre>{report.monEvidence}</ReportPre>
          </ReportSection>

          <ReportSection id="resolution" title="29. Resolution">
            <p>{report.resolution}</p>
          </ReportSection>

          <ReportSection id="corrective" title="30. Corrective Actions">
            <ReportTable
              headers={["Action", "Owner", "Priority", "Due Date", "Status"]}
              rows={report.corrective.map((c) => [c.action, c.owner, c.priority, c.due, c.status])}
            />
          </ReportSection>

          <ReportSection id="preventive" title="31. Preventive Actions">
            <ul className="list-disc space-y-1 pl-5">
              {report.preventive.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportSection>

          <ReportSection id="quality" title="32. Log Quality Assessment">
            <ul className="flex flex-wrap gap-2">
              {report.logQuality.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border bg-surface/60 px-2.5 py-1 font-mono text-xs"
                >
                  {item}
                </li>
              ))}
            </ul>
            <ReportPre>{report.sampleJson}</ReportPre>
          </ReportSection>

          <ReportSection id="scorecard" title="33. Product Health Scorecard">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Layer</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Observation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.scorecard.map((row) => (
                    <tr key={row.layer} className="border-b border-border/60">
                      <td className="py-2 pr-3">{row.layer}</td>
                      <td className="py-2 pr-3">
                        <StatusPill tone={layerTone(row.tone)}>{layerMark(row.tone)}</StatusPill>
                      </td>
                      <td className="py-2 text-muted-foreground">{row.observation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          <ReportSection id="findings" title="34. Final Findings">
            <h3 className="font-display text-sm font-semibold">Critical Findings</h3>
            <ul className="list-disc space-y-1 pl-5">
              {report.critical.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="font-display text-sm font-semibold">Major Findings</h3>
            <ul className="list-disc space-y-1 pl-5">
              {report.major.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="font-display text-sm font-semibold">Minor Findings</h3>
            <ul className="list-disc space-y-1 pl-5">
              {report.minor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ReportSection>

          <ReportSection id="conclusion" title="35. Final Conclusion">
            <ReportFields
              fields={[
                { label: "Product Status", value: report.conclusion.status },
                { label: "Primary Issue", value: report.conclusion.issue },
                { label: "Root Cause", value: report.conclusion.rootCause },
                { label: "Resolution", value: report.conclusion.resolution },
                { label: "Remaining Risk", value: report.conclusion.risk },
                { label: "Recommended Next Action", value: report.conclusion.next },
              ]}
            />
          </ReportSection>

          <ReportSection id="attachments" title="36. Evidence / Attachments">
            <ul className="flex flex-wrap gap-2">
              {report.evidence.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-border bg-surface/60 px-2.5 py-1 font-mono text-xs"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Logs className="size-4" aria-hidden="true" />
              Live inventory lines: {report.lines.length} · nodes {report.nodes} · namespaces{" "}
              {report.namespaces}
            </p>
          </ReportSection>
        </>
      )}
    </div>
  );
}

function LogsPanel({
  autoscroll,
  columns,
  collapseRepeats,
  dumpLabel,
  empty,
  limit,
  onOpen,
  onToggleAutoscroll,
  onToggleCollapse,
  onToggleColumn,
  orderedCount,
  panelMode,
  parsedCount,
  selectedId,
  setLimit,
  setPanelMode,
  setSort,
  shown,
  sort,
  streamDetail,
  streamState,
  visibleCount,
}: {
  autoscroll: boolean;
  columns: Record<LogColumnKey, boolean>;
  collapseRepeats: boolean;
  dumpLabel: string;
  empty: string;
  limit: number;
  onOpen: (id: string) => void;
  onToggleAutoscroll: () => void;
  onToggleCollapse: () => void;
  onToggleColumn: (key: LogColumnKey) => void;
  orderedCount: number;
  panelMode: "table" | "raw";
  parsedCount: number;
  selectedId: string | undefined;
  setLimit: (value: number | ((current: number) => number)) => void;
  setPanelMode: (mode: "table" | "raw") => void;
  setSort: (sort: LogSortKey) => void;
  shown: LogRow[];
  sort: LogSortKey;
  streamDetail: string;
  streamState: "loading" | "live" | "offline";
  visibleCount: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const stickingRef = useRef(false);

  useEffect(() => {
    scrolledRef.current = false;
  }, [sort, panelMode, collapseRepeats]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !autoscroll) return;
    stickingRef.current = true;
    node.scrollTop = sort === "newest" ? 0 : node.scrollHeight;
    const id = window.setTimeout(() => {
      stickingRef.current = false;
    }, 80);
    return () => window.clearTimeout(id);
  }, [autoscroll, shown, sort]);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || autoscroll || shown.length >= orderedCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && scrolledRef.current) {
          setLimit((current) => current + PAGE_SIZE);
        }
      },
      { root, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoscroll, orderedCount, setLimit, shown.length]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1116]" aria-label="Logs panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#f4f1ea]/50">4. Panel · Logs</p>
          <p className="font-mono text-xs text-[#f4f1ea]/80">
            {dumpLabel} · {shown.length}/{visibleCount} shown · {parsedCount} in tail
            {selectedId ? " · poll paused" : ""}
          </p>
        </div>
        <StatusPill tone={streamState === "live" ? "success" : "warning"}>{streamDetail}</StatusPill>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <div className="flex rounded-lg border border-white/15 p-0.5" role="group" aria-label="Panel format">
          {(["table", "raw"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={panelMode === mode}
              onClick={() => setPanelMode(mode)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[11px] uppercase",
                panelMode === mode ? "bg-[#f4f1ea] text-brand-ink" : "text-[#f4f1ea]/70",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
        <label className="font-mono text-[11px] text-[#f4f1ea]/70">
          Sort{" "}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as LogSortKey)}
            className="rounded-md border border-white/15 bg-transparent px-2 py-1"
          >
            <option value="oldest">oldest</option>
            <option value="newest">newest</option>
            <option value="level">level</option>
          </select>
        </label>
        <button
          type="button"
          aria-pressed={collapseRepeats}
          onClick={onToggleCollapse}
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[11px]",
            collapseRepeats ? "border-[#f4f1ea] text-[#f4f1ea]" : "border-white/15 text-[#f4f1ea]/60",
          )}
        >
          Collapse repeats
        </button>
        <button
          type="button"
          aria-pressed={autoscroll}
          onClick={onToggleAutoscroll}
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[11px]",
            autoscroll ? "border-brand-coral text-brand-coral" : "border-white/15 text-[#f4f1ea]/60",
          )}
        >
          {autoscroll ? "Follow tail" : "Follow off"}
        </button>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-white/15 px-2.5 py-1 font-mono text-[11px] text-[#f4f1ea]/70">
            Columns
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-white/15 bg-[#141820] p-2 shadow-lg">
            {LOG_EXPLORER_COLUMNS.map((column) => (
              <label key={column.key} className="flex items-center gap-2 py-1 font-mono text-[11px] text-[#f4f1ea]">
                <input
                  type="checkbox"
                  checked={columns[column.key]}
                  onChange={() => onToggleColumn(column.key)}
                />
                {column.label}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[36rem] overflow-auto"
        onScroll={(event) => {
          const node = event.currentTarget;
          if (node.scrollTop > 24) scrolledRef.current = true;
          if (stickingRef.current) return;
          const atLiveEdge =
            sort === "newest"
              ? node.scrollTop < 24
              : node.scrollHeight - node.scrollTop - node.clientHeight < 24;
          if (autoscroll && !atLiveEdge) onToggleAutoscroll();
        }}
      >
        {shown.length === 0 ? (
          <p className="p-4 font-mono text-[11px] text-[#8b93a7]">{empty}</p>
        ) : panelMode === "raw" ? (
          <pre className="p-4 font-mono text-[11px] leading-relaxed">
            {shown.map((line) => (
              <button
                key={line.id}
                type="button"
                onClick={() => onOpen(line.id)}
                className={cn(
                  "block w-full whitespace-pre-wrap text-left hover:bg-white/5",
                  lineTone(line.level),
                  selectedId === line.id && "bg-white/10",
                )}
              >
                {line.repeat > 1 ? `×${line.repeat} ` : ""}
                {line.raw}
              </button>
            ))}
          </pre>
        ) : (
          <table className="w-full min-w-[42rem] text-left font-mono text-[11px]">
            <thead className="sticky top-0 bg-[#141820] text-[10px] uppercase tracking-[0.12em] text-[#f4f1ea]/55">
              <tr>
                {LOG_EXPLORER_COLUMNS.filter((column) => columns[column.key]).map((column) => (
                  <th key={column.key} className="px-3 py-2 font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((line) => (
                <tr
                  key={line.id}
                  tabIndex={0}
                  className={cn("cursor-pointer border-t border-white/5 hover:bg-white/5", selectedId === line.id && "bg-white/10")}
                  onClick={() => onOpen(line.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(line.id);
                    }
                  }}
                >
                  {columns.time && <td className="whitespace-nowrap px-3 py-1.5 text-[#f4f1ea]/70">{line.timestamp || "—"}</td>}
                  {columns.level && (
                    <td className="px-3 py-1.5">
                      <span className={lineTone(line.level)}>{line.level}</span>
                    </td>
                  )}
                  {columns.logger && <td className="max-w-[14rem] truncate px-3 py-1.5 text-[#d7d2c8]">{line.logger || "—"}</td>}
                  {columns.pipeline && <td className="px-3 py-1.5 text-[#f4f1ea]/70">{line.pipeline || "—"}</td>}
                  {columns.message && (
                    <td className={cn("px-3 py-1.5", lineTone(line.level))}>
                      {line.repeat > 1 && (
                        <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-[#f4f1ea]">×{line.repeat}</span>
                      )}
                      {line.message || line.raw}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={sentinelRef} className="h-8" />
      </div>
      {!autoscroll && shown.length < orderedCount && (
        <div className="border-t border-white/10 px-4 py-2">
          <Button type="button" variant="outline" className="h-8 border-white/20 text-[#f4f1ea]" onClick={() => setLimit(limit + PAGE_SIZE)}>
            Load {Math.min(PAGE_SIZE, orderedCount - shown.length)} more
          </Button>
        </div>
      )}
    </section>
  );
}

function LogLineDialog({
  copied,
  line,
  missing,
  onClose,
  onCopy,
  onStep,
  open,
  position,
}: {
  copied: boolean;
  line: LogRow | undefined;
  missing: boolean;
  onClose: () => void;
  onCopy: (raw: string) => void;
  onStep: (delta: number) => void;
  open: boolean;
  position: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto border-white/15 bg-[#0e1116] text-[#f4f1ea]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 font-mono text-base">
            {line ? <StatusPill tone={levelPillTone(line.level)}>{line.level}</StatusPill> : <span>Log line</span>}
            <span className="text-[#f4f1ea]/60">{position || "not in this tail"}</span>
          </DialogTitle>
          <DialogDescription className="text-[#f4f1ea]/60">
            {line?.timestamp || "No timestamp on this line."}
            {line?.logger ? ` · ${line.logger}` : ""}
            {line?.pipeline ? ` · ${line.pipeline}` : ""}
            {line && line.repeat > 1 ? ` · repeated ×${line.repeat}` : ""}
            {" · poll paused while this line is open"}
          </DialogDescription>
        </DialogHeader>
        {missing || !line ? (
          <p className="text-sm text-[#f4f1ea]/70">That line is not in the current filtered tail.</p>
        ) : (
          <div className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs leading-relaxed">
              {line.message || line.raw}
            </pre>
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-[11px] text-[#f4f1ea]/75">
              {line.raw}
            </pre>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="border-white/20" disabled={!line} onClick={() => line && onStep(-1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>
          <Button type="button" variant="outline" className="border-white/20" disabled={!line} onClick={() => line && onStep(1)}>
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" className="border-white/20" disabled={!line} onClick={() => line && onCopy(line.raw)}>
            <Copy className="size-4" aria-hidden="true" />
            {copied ? "Copied" : "Copy raw"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
