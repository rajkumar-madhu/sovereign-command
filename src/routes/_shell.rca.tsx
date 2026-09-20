import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileSearch, ScrollText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ReportChecks,
  ReportFields,
  ReportPre,
  ReportSection,
} from "@/components/ops/formal-report";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { buildLiveRca } from "@/lib/live-rca";
import { snapshotAgeLabel } from "@/lib/live-ops";
import { useOps } from "@/lib/ops-context";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/rca")({
  validateSearch: (search: Record<string, unknown>): { incident?: string } => {
    const incident = typeof search["incident"] === "string" ? search["incident"] : undefined;
    return incident ? { incident } : {};
  },
  head: () => ({
    meta: [
      { title: "RCA Report · Wecrew Ops" },
      {
        name: "description",
        content:
          "Eighteen-section root cause analysis sealed from the live Finspot-dev kubectl snapshot.",
      },
      { property: "og:title", content: "RCA Report · Wecrew Ops" },
      {
        property: "og:description",
        content: "Incident summary, timeline, kubectl evidence, five-why, and sign-off.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RcaPage,
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

function RcaPage() {
  const ops = useOps();
  const nowMs = useNowMs();
  const { focusMode, setFocusMode } = useShellChrome();
  const report = useMemo(() => buildLiveRca(ops.clusterSnapshot, nowMs), [ops.clusterSnapshot, nowMs]);
  const age = snapshotAgeLabel(ops.clusterSnapshot?.generatedAt, nowMs);

  return (
    <div className="space-y-6">
      <section
        aria-label="RCA pulse"
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
              Investigate · root cause
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[#f4f1ea] md:text-4xl">
              Root Cause Analysis Report
            </h1>
            <p className="text-sm leading-relaxed text-[#f4f1ea]/75">
              Eighteen-section package sealed from the existing Finspot-dev kubectl snapshot. Remediator
              held. No seed tenants.
            </p>
            <StatusPill
              tone={report.live ? (report.attention > 0 ? "warning" : "success") : "warning"}
              className="w-fit bg-[#f4f1ea]/10 text-[#f4f1ea]"
            >
              {report.incidentId} · {report.severity} · {report.status}
            </StatusPill>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="bg-[#f4f1ea] text-brand-ink hover:bg-white"
                onClick={() =>
                  toast.success("RCA published to the incident record", {
                    description: "Read-only publication — no remediation was executed.",
                  })
                }
              >
                <ScrollText className="size-4" aria-hidden="true" />
                Publish RCA
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-[#141820]/70 text-[#f4f1ea]">
                <Link to="/evidence">
                  <FileSearch className="size-4" aria-hidden="true" />
                  Evidence
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
              { label: "Severity", value: report.severity, hint: report.status },
              { label: "Attention", value: report.attention, hint: "pods", hot: report.attention > 0 },
              { label: "Nodes", value: report.nodes, hint: "cluster" },
              { label: "Namespaces", value: report.namespaces, hint: "live" },
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
        title="Formal RCA package"
        description="Incident summary through sign-off — filled from the live cluster, not demo clients."
        crumbs={[{ label: "Investigate" }, { label: "RCA Report" }]}
      />
      <SafetyBanner />

      <ReportSection id="summary" title="1. Incident Summary">
        <ReportFields fields={report.summaryFields} />
      </ReportSection>

      <ReportSection id="description" title="2. Incident Description">
        <p>{report.description}</p>
      </ReportSection>

      <ReportSection id="impact" title="3. Business / User Impact">
        <ReportFields
          fields={[
            { label: "Affected Services", value: report.affectedServices },
            { label: "Affected Users", value: report.affectedUsers },
            { label: "Estimated Impact Duration", value: report.impactDuration },
          ]}
        />
        <ul className="list-disc space-y-1 pl-5">
          {report.impact.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection id="detection" title="4. Detection">
        <ReportFields
          fields={[
            { label: "How detected", value: report.detectionHow },
            { label: "Detection Time", value: `${report.detectionTime} IST` },
            { label: "Monitoring Alert", value: report.monitoringAlert },
            { label: "Automatically detected", value: report.autoDetected ? "Yes" : "No" },
          ]}
        />
        <p className="text-muted-foreground">{report.monitoringGap}</p>
      </ReportSection>

      <ReportSection id="timeline" title="5. Timeline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Time</th>
                <th className="py-2 pr-3 font-medium">Event / Action</th>
                <th className="py-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {report.timeline.map((row) => (
                <tr key={`${row.time}-${row.event}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">{row.time}</td>
                  <td className="py-2 pr-3">{row.event}</td>
                  <td className="py-2 text-muted-foreground">{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection id="investigation" title="6. Technical Investigation">
        <h3 className="font-display text-sm font-semibold">Infrastructure Checks</h3>
        <p className="text-xs text-muted-foreground">Node status · {report.nodeFinding}</p>
        <ReportPre>{`kubectl get nodes -o wide\n\n${report.nodeOutput}`}</ReportPre>
        <p className="text-xs text-muted-foreground">Pod status · {report.podFinding}</p>
        <ReportPre>{`kubectl get pods -A -o wide\n\n${report.podOutput}`}</ReportPre>
        <p className="text-xs text-muted-foreground">Warning events</p>
        <ReportPre>{`kubectl get events --field-selector type=Warning\n\n${report.eventOutput}`}</ReportPre>
        <p className="text-xs text-muted-foreground">Application / inventory logs</p>
        <ReportPre>{report.logOutput}</ReportPre>
        <ReportFields
          fields={[
            { label: "Service / Endpoint", value: report.svcFinding },
            { label: "Ingress", value: report.ingressFinding },
            { label: "Database", value: `${report.database} · ${report.dbConnectivity}` },
            { label: "Network", value: report.networkFinding },
          ]}
        />
      </ReportSection>

      <ReportSection id="root-cause" title="7. Root Cause">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 text-brand-coral" aria-hidden="true" />
          <p>{report.rootCause}</p>
        </div>
      </ReportSection>

      <ReportSection id="contributing" title="8. Contributing Factors">
        <ul className="list-disc space-y-1 pl-5">
          {report.contributing.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection id="five-why" title="9. Five-Why Analysis">
        <ol className="space-y-3">
          {report.fiveWhys.map((item, i) => (
            <li key={item.why} className="rounded-xl border border-border/80 bg-surface/40 p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Why {i + 1}
              </p>
              <p className="mt-1 font-medium">{item.why}</p>
              <p className="mt-1 text-muted-foreground">{item.answer}</p>
            </li>
          ))}
        </ol>
        <p>
          <span className="font-medium">Final root cause: </span>
          {report.finalRootCause}
        </p>
      </ReportSection>

      <ReportSection id="resolution" title="10. Resolution">
        <p>{report.immediateFix}</p>
        <ReportPre>{report.resolutionCommands}</ReportPre>
      </ReportSection>

      <ReportSection id="validation" title="11. Validation Performed">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">Kubernetes</h3>
            <ReportChecks items={report.k8sChecks} />
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">Application</h3>
            <ReportChecks items={report.appChecks} />
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">Database</h3>
            <ReportChecks items={report.dbChecks} />
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">Network</h3>
            <ReportChecks items={report.netChecks} />
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">Monitoring</h3>
            <ReportChecks items={report.monChecks} />
          </div>
        </div>
      </ReportSection>

      <ReportSection id="corrective" title="12. Corrective Actions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Action</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 pr-3 font-medium">Owner</th>
                <th className="py-2 pr-3 font-medium">Due</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.corrective.map((row) => (
                <tr key={row.action} className="border-b border-border/60">
                  <td className="py-2 pr-3">{row.action}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{row.priority}</td>
                  <td className="py-2 pr-3">{row.owner}</td>
                  <td className="py-2 pr-3">{row.due}</td>
                  <td className="py-2">
                    <StatusPill tone={row.status === "Completed" ? "success" : "warning"}>
                      {row.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection id="preventive" title="13. Preventive Actions">
        <ul className="list-disc space-y-1 pl-5">
          {report.preventive.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection id="monitoring" title="14. Monitoring Improvements">
        <p className="text-muted-foreground">{report.monitoringGap}</p>
        <ul className="list-disc space-y-1 pl-5">
          {report.newMonitoring.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ReportSection>

      <ReportSection id="lessons" title="15. Lessons Learned">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">What went well</h3>
            <ul className="list-disc space-y-1 pl-5">
              {report.wentWell.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">What did not go well</h3>
            <ul className="list-disc space-y-1 pl-5">
              {report.wentPoorly.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold">What should be improved</h3>
            <ul className="list-disc space-y-1 pl-5">
              {report.improve.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </ReportSection>

      <ReportSection id="evidence" title="16. Evidence">
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
      </ReportSection>

      <ReportSection id="conclusion" title="17. Final Conclusion">
        <p>
          The incident occurred because: <span className="font-medium">{report.conclusionCause}</span>
        </p>
        <p>
          Service was restored by: <span className="font-medium">{report.conclusionResolution}</span>
        </p>
        <p>
          To prevent recurrence: <span className="font-medium">{report.conclusionPrevent}</span>
        </p>
      </ReportSection>

      <ReportSection id="signoff" title="18. Sign-Off">
        <ReportFields
          fields={[
            { label: "RCA Prepared By", value: report.preparedBy },
            { label: "Reviewed By", value: report.reviewedBy },
            { label: "Approved By", value: report.approvedBy },
            { label: "RCA Date", value: report.rcaDate },
            { label: "Incident Status", value: report.incidentStatus },
          ]}
        />
      </ReportSection>
    </div>
  );
}
