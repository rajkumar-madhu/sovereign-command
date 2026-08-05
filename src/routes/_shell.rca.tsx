import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { rcaReport } from "@/data/seed";

export const Route = createFileRoute("/_shell/rca")({
  head: () => ({
    meta: [
      { title: "RCA Report · Sovereign Agentic Operations OS" },
      { name: "description", content: "Read-only root cause analysis for fs-prod-cs-tool2 NotReady: registry egress interruption at 88% confidence with a full evidence trail." },
      { property: "og:title", content: "RCA Report · Sovereign Agentic Operations OS" },
      { property: "og:description", content: "Evidence-backed root cause analysis with confidence scoring and rejected hypotheses." },
    ],
  }),
  component: RcaPage,
});

function RcaPage() {
  const empty = !rcaReport.incidentId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={empty ? "RCA Report" : rcaReport.title}
        description={
          empty
            ? "Root cause analyses appear here after an investigation is verified."
            : `Incident ${rcaReport.incidentId} · owner ${rcaReport.owner}`
        }
        crumbs={[{ label: "Investigate" }, { label: "RCA Report" }]}
        actions={
          empty ? (
            <Button variant="outline" asChild>
              <Link to="/investigations">Open investigations</Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to="/incidents/$incidentId" params={{ incidentId: rcaReport.incidentId }}>
                  Back to workspace
                </Link>
              </Button>
              <Button onClick={() => toast.success("RCA published to the incident record")}>
                Publish RCA
              </Button>
            </>
          )
        }
      />
      <SafetyBanner />

      {empty ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No published RCA yet. Complete an investigation to generate a root-cause report.
          </CardContent>
        </Card>
      ) : (
        <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Confidence" value={`${rcaReport.confidence}%`} tone="success" />
        <MetricCard label="Risk" value={rcaReport.risk} tone="success" />
        <MetricCard label="Production write" value="not required" tone="success" />
        <MetricCard label="Evidence classes" value={rcaReport.evidence.length} tone="info" />
      </section>

      <Card>
        <CardHeader><CardTitle>Root cause</CardTitle><CardDescription>Verification agent confidence score</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Progress value={rcaReport.confidence} />
          <p className="text-sm">{rcaReport.rootCause}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Supporting evidence</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {rcaReport.evidence.map((e) => (
                <li key={e} className="flex gap-2"><StatusPill tone="success">verified</StatusPill><span className="flex-1">{e}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rejected hypotheses</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {rcaReport.rejected.map((r) => (
                <li key={r} className="flex gap-2"><StatusPill tone="danger">rejected</StatusPill><span className="flex-1">{r}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recommendation</CardTitle><CardDescription>Requires human execution — the Agent OS never remediates</CardDescription></CardHeader>
        <CardContent className="text-sm">{rcaReport.recommendation}</CardContent>
      </Card>
        </>
      )}
    </div>
  );
}