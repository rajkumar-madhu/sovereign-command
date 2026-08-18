import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  FileSearch,
  ScrollText,
  ShieldCheck,
  Terminal,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { customerName, customers, getRcaReport, incidents, tenantName, tenants } from "@/data/seed";
import { crashLoopRca } from "@/data/control-tower";
import {
  fetchLiveRca,
  overlayLiveRca,
  STAGE1_EXECUTION_ID,
  STAGE1_INCIDENT_ID,
  stage1ApiConfigured,
} from "@/lib/stage1-api";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/rca")({
  validateSearch: (search: Record<string, unknown>): { incident?: string } => {
    const incident = typeof search.incident === "string" ? search.incident : undefined;
    return incident ? { incident } : {};
  },
  head: () => ({
    meta: [
      { title: "RCA Report · Wecrew Ops" },
      {
        name: "description",
        content:
          "Read-only root cause analysis packages with confidence scoring, verified evidence classes, and rejected hypotheses.",
      },
      { property: "og:title", content: "RCA Report · Wecrew Ops" },
      {
        property: "og:description",
        content: "Evidence-backed root cause analysis with confidence scoring and rejected hypotheses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RcaPage,
});

function useLiveConfidence(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(base - 3, Math.min(96, Math.round(v + (Math.random() - 0.48) * 0.8))));
    }, 2300);
    return () => window.clearInterval(id);
  }, [base]);
  return n;
}

function formatCaptured(iso: string) {
  const d = new Date(iso);
  return {
    label: d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }),
    iso,
  };
}

function EvidenceClassCard({
  item,
  open,
  onToggle,
}: {
  item: ReturnType<typeof getRcaReport>["evidence"][number];
  open: boolean;
  onToggle: () => void;
}) {
  const when = formatCaptured(item.capturedAt);
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <StatusPill tone="success">{item.status}</StatusPill>
        <span className="min-w-0 flex-1 text-sm leading-relaxed">{item.claim}</span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/70 px-3 pb-3 pt-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>
              host <span className="text-foreground/80">{item.hostname ?? "—"}</span>
            </span>
            <span>
              ip <span className="text-foreground/80">{item.ipAddress ?? "—"}</span>
            </span>
            <span>
              captured <span className="text-foreground/80">{when.label}</span>
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Check · <span className="font-mono text-foreground/85">{item.check}</span>
          </p>

          <ul className="flex flex-wrap gap-1.5">
            {item.artifacts.map((id) => (
              <li key={id}>
                <Link
                  to="/evidence"
                  search={{ artifact: id }}
                  className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-brand-coral/50 hover:text-foreground"
                >
                  {id}
                </Link>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-border bg-[#0e1116] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
              <Terminal className="size-3.5" aria-hidden />
              Logs · attached excerpt
            </p>
            <pre className="max-h-48 overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#e8e4dc]">
              {item.logs}
            </pre>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Output · verified details
            </p>
            <pre className="max-h-44 overflow-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/85">
              {item.output}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

function RejectedCard({
  item,
  open,
  onToggle,
}: {
  item: ReturnType<typeof getRcaReport>["rejected"][number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <StatusPill tone="danger">rejected</StatusPill>
        <span className="min-w-0 flex-1 text-sm leading-relaxed">{item.claim}</span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/70 px-3 pb-3 pt-2">
          <p className="text-sm text-muted-foreground">{item.reason}</p>
          <ul className="flex flex-wrap gap-1.5">
            {item.artifacts.map((id) => (
              <li key={id}>
                <Link
                  to="/evidence"
                  search={{ artifact: id }}
                  className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-brand-coral/50 hover:text-foreground"
                >
                  {id}
                </Link>
              </li>
            ))}
          </ul>
          <pre className="overflow-auto rounded-lg border border-border bg-background/80 p-2 font-mono text-[11px] text-foreground/80">
            {item.output}
          </pre>
        </div>
      )}
    </li>
  );
}

function RcaPage() {
  const { incident: incidentParam } = Route.useSearch();
  const seed = getRcaReport(incidentParam);
  const [liveReport, setLiveReport] = useState<typeof seed | null>(null);
  const [liveReady, setLiveReady] = useState(false);
  const wantsClb = !incidentParam || incidentParam === STAGE1_INCIDENT_ID;

  useEffect(() => {
    if (!wantsClb || !stage1ApiConfigured()) {
      setLiveReady(true);
      setLiveReport(null);
      return;
    }
    let cancelled = false;
    fetchLiveRca(STAGE1_EXECUTION_ID, "tn-nordic").then((live) => {
      if (cancelled) return;
      if (live?.rca) {
        setLiveReport(overlayLiveRca(crashLoopRca, live.rca, []));
      } else {
        setLiveReport(null);
      }
      setLiveReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [wantsClb]);

  const report = liveReport ?? seed;
  const liveOverlay = liveReady && liveReport !== null;
  const { focusMode, setFocusMode } = useShellChrome();
  const liveConf = useLiveConfidence(report.confidence);
  const shownConf = liveOverlay ? report.confidence : liveConf;
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(report.evidence.map((e) => [e.id, true])),
  );
  const [openRejected, setOpenRejected] = useState<Record<string, boolean>>({});
  const incident = incidents.find((i) => i.id === report.incidentId);
  const tenant = tenants.find((t) => t.id === incident?.tenantId);
  const customer = customers.find((c) => c.id === incident?.customerId);

  useEffect(() => {
    setOpenEvidence(Object.fromEntries(report.evidence.map((e) => [e.id, true])));
    setOpenRejected({});
  }, [report.incidentId, report.evidence]);

  return (
    <div className="space-y-6">
      <section
        aria-label="RCA pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-brand-coral/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
                Investigate · root cause
              </p>
              {liveOverlay && <StatusPill tone="info">live Stage-1</StatusPill>}
              <StatusPill tone="success">risk {report.risk}</StatusPill>
              <StatusPill tone="success">no prod write</StatusPill>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              {report.title}
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Incident {report.incidentId} · owner {report.owner}. Each verified class includes
              attached logs, probe output, and artefact links.
            </p>

            {incident && (
              <div
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/55 p-3 backdrop-blur"
                aria-label="Organisation and client"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Building2 className="size-3.5 text-brand-coral" aria-hidden />
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
                    Organisation · client scope
                  </p>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">
                      Tenant / org
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-sidebar-accent-foreground">
                      {tenant?.name ?? tenantName(incident.tenantId)}
                    </dd>
                    <dd className="font-mono text-[10px] text-sidebar-foreground/55">
                      {incident.tenantId}
                      {tenant ? ` · ${tenant.region} · ${tenant.residency}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50">
                      Client / customer
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-sidebar-accent-foreground">
                      {customer?.name ?? customerName(incident.customerId)}
                    </dd>
                    <dd className="font-mono text-[10px] text-sidebar-foreground/55">
                      {incident.customerId} · {incident.environment}
                      {customer ? ` · ${customer.contract}` : ""}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
                onClick={() =>
                  toast.success("RCA published to the incident record", {
                    description: "Read-only publication — no remediation was executed.",
                  })
                }
              >
                <ScrollText className="size-4" aria-hidden="true" />
                Publish RCA
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/incidents/$incidentId" params={{ incidentId: report.incidentId }}>
                  Back to workspace
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                <Link to="/evidence">
                  <FileSearch className="size-4" aria-hidden="true" />
                  Evidence
                </Link>
              </Button>
              {!focusMode && (
                <Button
                  variant="outline"
                  className="border-sidebar-border bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent"
                  onClick={() => setFocusMode(true)}
                >
                  Enter focus
                </Button>
              )}
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              {
                label: "Confidence",
                value: shownConf,
                unit: "%",
                hint: liveOverlay ? "sealed" : "live",
                live: true,
              },
              { label: "Risk", value: report.risk, hint: "posture" },
              { label: "Prod write", value: "none", hint: "required" },
              {
                label: "Evidence",
                value: report.evidence.length,
                hint: "classes",
              },
              {
                label: "Rejected",
                value: report.rejected.length,
                hint: "hypotheses",
              },
              {
                label: "Focus",
                value: focusMode ? "on" : "off",
                hint: "⌘\\",
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
        title="Analysis package"
        description="Verification agent confidence, supporting evidence with attached logs/output, and rejected hypotheses."
        crumbs={[{ label: "Investigate" }, { label: "RCA Report" }]}
      />
      <SafetyBanner />

      <section className="ops-panel rounded-2xl p-5" aria-label="Root cause">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-coral" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold">Root cause</h2>
            <p className="text-xs text-muted-foreground">Verification agent confidence score</p>
          </div>
          <span className="font-display text-lg font-semibold tabular-nums">{shownConf}%</span>
        </div>
        <Progress value={shownConf} className="mb-4" aria-label={`Confidence ${shownConf}%`} />
        <p className="text-sm leading-relaxed">{report.rootCause}</p>
      </section>

      <div className={cn("grid gap-4", focusMode ? "xl:grid-cols-2" : "lg:grid-cols-2")}>
        <section className="ops-panel rounded-2xl p-5" aria-label="Supporting evidence">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSearch className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">Supporting evidence</h2>
                <p className="text-xs text-muted-foreground">
                  {report.evidence.length} verified classes · expand for logs & output
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setOpenEvidence(Object.fromEntries(report.evidence.map((e) => [e.id, true])))
                }
              >
                Expand all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenEvidence({})}>
                Collapse
              </Button>
            </div>
          </div>
          <ul className="space-y-3">
            {report.evidence.map((e) => (
              <EvidenceClassCard
                key={e.id}
                item={e}
                open={Boolean(openEvidence[e.id])}
                onToggle={() =>
                  setOpenEvidence((prev) => ({ ...prev, [e.id]: !prev[e.id] }))
                }
              />
            ))}
          </ul>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-label="Rejected hypotheses">
          <div className="mb-4 flex items-center gap-2">
            <XCircle className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Rejected hypotheses</h2>
              <p className="text-xs text-muted-foreground">
                {report.rejected.length} ruled out · with counter-evidence
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            {report.rejected.map((r) => (
              <RejectedCard
                key={r.id}
                item={r}
                open={Boolean(openRejected[r.id])}
                onToggle={() =>
                  setOpenRejected((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                }
              />
            ))}
          </ul>
        </section>
      </div>

      <section className="ops-panel rounded-2xl p-5" aria-label="Recommendation">
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="size-4 text-brand-coral" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold">Recommendation</h2>
            <p className="text-xs text-muted-foreground">
              Requires human execution — the Agent OS never remediates
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{report.recommendation}</p>
      </section>
    </div>
  );
}
