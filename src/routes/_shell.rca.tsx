import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileSearch, ScrollText, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { rcaReport } from "@/data/seed";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/rca")({
  head: () => ({
    meta: [
      { title: "RCA Report · Wecrew Ops" },
      {
        name: "description",
        content:
          "Read-only root cause analysis for fs-prod-cs-tool2 NotReady: registry egress interruption at 88% confidence with a full evidence trail.",
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

function RcaPage() {
  const { focusMode, setFocusMode } = useShellChrome();
  const liveConf = useLiveConfidence(rcaReport.confidence);

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
              <StatusPill tone="success">risk {rcaReport.risk}</StatusPill>
              <StatusPill tone="success">no prod write</StatusPill>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              {rcaReport.title}
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Incident {rcaReport.incidentId} · owner {rcaReport.owner}. Focus mode widens the
              reading canvas for evidence review.
            </p>
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
                <Link to="/incidents/$incidentId" params={{ incidentId: rcaReport.incidentId }}>
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
                value: liveConf,
                unit: "%",
                hint: "live",
                live: true,
              },
              { label: "Risk", value: rcaReport.risk, hint: "posture" },
              { label: "Prod write", value: "none", hint: "required" },
              {
                label: "Evidence",
                value: rcaReport.evidence.length,
                hint: "classes",
              },
              {
                label: "Rejected",
                value: rcaReport.rejected.length,
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
        description="Verification agent confidence, supporting evidence and rejected hypotheses."
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
          <span className="font-display text-lg font-semibold tabular-nums">{liveConf}%</span>
        </div>
        <Progress value={liveConf} className="mb-4" aria-label={`Confidence ${liveConf}%`} />
        <p className="text-sm leading-relaxed">{rcaReport.rootCause}</p>
      </section>

      <div className={cn("grid gap-4", focusMode ? "xl:grid-cols-2" : "lg:grid-cols-2")}>
        <section className="ops-panel rounded-2xl p-5" aria-label="Supporting evidence">
          <div className="mb-4 flex items-center gap-2">
            <FileSearch className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Supporting evidence</h2>
              <p className="text-xs text-muted-foreground">{rcaReport.evidence.length} verified classes</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            {rcaReport.evidence.map((e) => (
              <li
                key={e}
                className="flex gap-2 rounded-xl border border-border bg-surface/40 p-3"
              >
                <StatusPill tone="success">verified</StatusPill>
                <span className="flex-1">{e}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ops-panel rounded-2xl p-5" aria-label="Rejected hypotheses">
          <div className="mb-4 flex items-center gap-2">
            <XCircle className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Rejected hypotheses</h2>
              <p className="text-xs text-muted-foreground">{rcaReport.rejected.length} ruled out</p>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            {rcaReport.rejected.map((r) => (
              <li
                key={r}
                className="flex gap-2 rounded-xl border border-border bg-surface/40 p-3"
              >
                <StatusPill tone="danger">rejected</StatusPill>
                <span className="flex-1">{r}</span>
              </li>
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
        <p className="text-sm leading-relaxed">{rcaReport.recommendation}</p>
      </section>
    </div>
  );
}
