import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { evidenceArtifacts } from "@/data/seed";

export const Route = createFileRoute("/_shell/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence Viewer · Sovereign Agentic Operations OS" },
      { name: "description", content: "Hash-verified, read-only evidence artefacts collected during agent investigations: cluster snapshots, journals, probes and metrics." },
      { property: "og:title", content: "Evidence Viewer · Sovereign Agentic Operations OS" },
      { property: "og:description", content: "Hash-verified read-only evidence artefacts from agent investigations." },
    ],
  }),
  component: EvidenceViewer,
});

function EvidenceViewer() {
  const [selected, setSelected] = useState(evidenceArtifacts[0]!.id);
  const artifact = evidenceArtifacts.find((a) => a.id === selected)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Viewer"
        description="Immutable artefacts captured for incident inc-4821, each with a content hash."
        crumbs={[{ label: "Investigate" }, { label: "Evidence Viewer" }]}
        actions={
          <Button variant="outline" onClick={() => toast.success("Evidence bundle exported", { description: "Signed archive prepared for audit hand-off." })}>
            Export bundle
          </Button>
        }
      />
      <SafetyBanner compact />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle>Artefacts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {evidenceArtifacts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                aria-pressed={a.id === selected}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${a.id === selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}
              >
                <p className="truncate font-mono text-xs font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.kind} · {a.collected}</p>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">{artifact.name}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <StatusPill tone="success">integrity verified</StatusPill>
              <span className="font-mono text-xs">{artifact.hash}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed">{artifact.body}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}