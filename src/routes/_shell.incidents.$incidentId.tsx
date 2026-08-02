import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { MetricCard } from "@/components/ops/metric-card";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { agentName, customerName, incidentTimeline, incidents, rcaReport, tenantName } from "@/data/seed";

export const Route = createFileRoute("/_shell/incidents/$incidentId")({
  loader: ({ params }) => {
    const incident = incidents.find((i) => i.id === params.incidentId);
    if (!incident) throw notFound();
    return { incident };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.incident.title ?? "Incident";
    return {
      meta: [
        { title: `${title} · Incident Workspace` },
        { name: "description", content: `Agent investigation workspace with the full evidence timeline for: ${title}.` },
        { property: "og:title", content: `${title} · Incident Workspace` },
        { property: "og:description", content: "Evidence timeline, hypotheses and read-only root cause analysis." },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: IncidentWorkspace,
  notFoundComponent: () => (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">Incident not found</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/investigations">Back to investigations</Link></Button>
    </div>
  ),
});

function IncidentWorkspace() {
  const { incident } = Route.useLoaderData();
  const isPrimary = incident.id === "inc-4821";
  const steps = isPrimary ? incidentTimeline : incidentTimeline.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={incident.title}
        description={incident.summary}
        crumbs={[{ label: "Investigate" }, { label: "Investigations", to: "/investigations" }, { label: incident.id }]}
        actions={
          <>
            <Button variant="outline" asChild><Link to="/evidence">Evidence viewer</Link></Button>
            <Button asChild><Link to="/rca">Open RCA report</Link></Button>
          </>
        }
      />
      <SafetyBanner />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Status" value={incident.status} tone="info" />
        <MetricCard label="Tenant" value={tenantName(incident.tenantId)} hint={customerName(incident.customerId)} />
        <MetricCard label="Lead agent" value={agentName(incident.assignedAgent)} hint={`Environment: ${incident.environment}`} />
        <MetricCard label="RCA confidence" value={isPrimary ? `${rcaReport.confidence}%` : "pending"} tone={isPrimary ? "success" : "warning"} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Investigation timeline</CardTitle>
          <CardDescription>Every step is read-only, bounded and audited · severity {incident.severity}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {steps.map((s) => (
              <li key={s.id} className="relative border-l border-border pl-5">
                <span
                  className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ${
                    s.status === "verified" ? "bg-success" : s.status === "anomaly" ? "bg-warning" : s.status === "rejected" ? "bg-destructive" : "bg-primary"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <StatusPill tone={toneForStatus(s.status)}>{s.status}</StatusPill>
                  <span className="text-xs text-muted-foreground">{s.phase} · {s.time}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                {s.evidence && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {s.evidence.map((e) => (
                      <li key={e} className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{e}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {isPrimary && (
        <Card>
          <CardHeader>
            <CardTitle>Final root cause</CardTitle>
            <CardDescription>Confidence {rcaReport.confidence}% · risk {rcaReport.risk} · no production write required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>{rcaReport.rootCause}</p>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Recommendation</p>
              <p>{rcaReport.recommendation}</p>
            </div>
            <Button variant="outline" onClick={() => toast.success("RCA shared with Network Operations", { description: "Read-only report, no remediation executed." })}>
              Share RCA with owner
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        Opened {new Date(incident.opened).toLocaleString()} · recurrence {incident.recurrence}x
        <StatusPill tone={toneForSeverity(incident.severity)}>{incident.severity}</StatusPill>
      </p>
    </div>
  );
}