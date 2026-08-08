import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileSearch, Maximize2, ScrollText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { evidenceArtifacts } from "@/data/seed";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence Viewer · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Hash-verified, read-only evidence artefacts collected during agent investigations: cluster snapshots, journals, probes and metrics.",
      },
      { property: "og:title", content: "Evidence Viewer · Sovereign Agentic Operations OS" },
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

function EvidenceViewer() {
  const [selected, setSelected] = useState(evidenceArtifacts[0]!.id);
  const artifact = evidenceArtifacts.find((a) => a.id === selected)!;
  const { focusMode, setFocusMode } = useShellChrome();
  const liveVerify = useLiveVerifyRate(6);
  const kinds = new Set(evidenceArtifacts.map((a) => a.kind)).size;

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
              Immutable artefacts for incident inc-4821 — each with a content hash. Focus mode
              hides sidebars for full-width reading.
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
                onClick={() =>
                  toast.success("Evidence bundle exported", {
                    description: "Signed archive prepared for audit hand-off.",
                  })
                }
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
                <Link to="/rca">
                  <ScrollText className="size-4" aria-hidden="true" />
                  Open RCA
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Artefacts", value: evidenceArtifacts.length, hint: "inc-4821" },
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
        description="Select an artefact to inspect body content. Focus (⌘\\) maximizes the reading canvas."
        crumbs={[{ label: "Investigate" }, { label: "Evidence Viewer" }]}
      />
      <SafetyBanner compact />

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
              <p className="text-xs text-muted-foreground">{evidenceArtifacts.length} captured</p>
            </div>
          </div>
          <div className="space-y-2 p-3">
            {evidenceArtifacts.map((a) => (
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
                <p className="text-xs text-muted-foreground">
                  {a.kind} · {a.collected}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="ops-panel min-w-0 overflow-hidden rounded-2xl" aria-label="Artefact detail">
          <div className="flex flex-wrap items-start gap-2 border-b border-border/70 px-4 py-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-mono text-sm font-semibold">{artifact.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusPill tone="success">integrity verified</StatusPill>
                <span className="break-all font-mono">{artifact.hash}</span>
              </p>
            </div>
            <StatusPill tone="neutral">{artifact.kind}</StatusPill>
          </div>
          <div className="p-4">
            <pre
              className={cn(
                "overflow-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre",
                focusMode ? "max-h-[min(72vh,780px)]" : "max-h-[520px]",
              )}
            >
              {artifact.body}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
