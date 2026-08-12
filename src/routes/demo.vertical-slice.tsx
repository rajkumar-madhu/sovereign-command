import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocsChrome } from "@/components/docs/docs-chrome";

export const Route = createFileRoute("/demo/vertical-slice")({
  head: () => ({
    meta: [
      { title: "Stage-1 Vertical Slice · CrashLoopBackOff" },
      {
        name: "description",
        content:
          "Guided AEGIS Stage-1 demo: one tenant, one read-only agent, one local model, one tool, one approval, one immutable execution ID — CrashLoopBackOff on payments-auth.",
      },
      { property: "og:title", content: "Stage-1 Vertical Slice · CrashLoopBackOff" },
    ],
  }),
  component: VerticalSliceDemo,
});

const steps = [
  {
    n: "01",
    title: "Freeze the contract",
    body: "AEGIS Stage-1 exit: end-to-end trace and evidence complete; no secret leakage; no production write from the console.",
    cta: "AEGIS freeze",
    to: "/docs/aegis" as const,
  },
  {
    n: "02",
    title: "One tenant scope",
    body: "Nordic Federated Bank · FS Core Banking · production. Scope filters bind every tool call.",
    cta: "Command Centre",
    to: "/command" as const,
  },
  {
    n: "03",
    title: "One read-only agent",
    body: "Kubernetes Agent 01 passport: L2 investigate, write verbs stripped, step budget enforced.",
    cta: "Agent passport",
    to: "/agents/$agentId" as const,
    params: { agentId: "ag-kubernetes-01" },
  },
  {
    n: "04",
    title: "One local model",
    body: "Model Gateway routes to Ollama llama-3.3-70b. Sovereign Mode denies external LLM APIs.",
    cta: "Model Gateway",
    to: "/models" as const,
  },
  {
    n: "05",
    title: "One tool",
    body: "k8s-read MCP — get/list/watch only. Delete and exec stripped at the gateway.",
    cta: "Tool registry",
    to: "/tools" as const,
  },
  {
    n: "06",
    title: "Investigate CrashLoopBackOff",
    body: "payments-auth pod after deploy v4.21 — missing AUTH_JWKS_URI. Full timeline + sealed RCA.",
    cta: "Incident workspace",
    to: "/incidents/$incidentId" as const,
    params: { incidentId: "inc-clb-01" },
  },
  {
    n: "07",
    title: "One immutable execution ID",
    body: "AI Control Tower exec-clb-01: prompt → firewall → agent → Ollama → MCP → evidence → policy → approval hold.",
    cta: "Open exec-clb-01",
    to: "/control-tower/$executionId" as const,
    params: { executionId: "exec-clb-01" },
  },
  {
    n: "08",
    title: "One approval gate",
    body: "apr-clb-01 queues ConfigMap patch + rollout. Deterministic remediator does not start until approved.",
    cta: "Approval queue",
    to: "/approvals" as const,
  },
] as const;

function VerticalSliceDemo() {
  return (
    <DocsChrome active="intro">
      <section className="relative overflow-hidden border-b border-[#e8e6e0]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 20% 0%, rgba(255,91,46,0.14), transparent 55%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
          <p className="text-sm font-medium text-brand-coral">AEGIS · Stage 1</p>
          <h1 className="font-display mt-3 text-[clamp(2rem,4vw,2.85rem)] font-semibold leading-[1.1] tracking-tight">
            CrashLoopBackOff vertical slice
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#5c5a56]">
            Walk the thinnest defensible product path:{" "}
            <strong className="font-medium text-[#1c1c1c]">
              one tenant · one agent · one model · one tool · one approval · one audit execution ID
            </strong>
            . Remediation stays held — evidence before action.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand-coral text-white hover:bg-brand-coral/90">
              <Link to="/incidents/$incidentId" params={{ incidentId: "inc-clb-01" }}>
                Jump to incident
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#d4cdc0] bg-white">
              <Link to="/control-tower/$executionId" params={{ executionId: "exec-clb-01" }}>
                Jump to execution ID
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-[#e8e6e0] bg-white px-4 py-3 text-sm text-[#5c5a56]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
            <p>
              Console remains read-only. Stage-1 proves the correlation fabric — not AutoRemediate.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <ol className="space-y-4">
            {steps.map((s) => (
              <li
                key={s.n}
                className="flex flex-col gap-4 rounded-xl border border-[#e8e6e0] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-4">
                  <span className="font-mono text-sm text-brand-coral">{s.n}</span>
                  <div>
                    <p className="font-semibold text-[#1c1c1c]">{s.title}</p>
                    <p className="mt-1 text-sm text-[#5c5a56]">{s.body}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="shrink-0 border-[#d4cdc0]">
                  {"params" in s && s.params ? (
                    <Link to={s.to} params={s.params as never}>
                      {s.cta}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : (
                    <Link to={s.to}>
                      {s.cta}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  )}
                </Button>
              </li>
            ))}
          </ol>

          <ul className="mt-10 space-y-2 text-sm text-[#5c5a56]">
            {[
              "Exit criteria: complete AI path in Control Tower",
              "Exit criteria: sealed RCA with rejected hypotheses",
              "Exit criteria: approval pending — no silent write",
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </DocsChrome>
  );
}
