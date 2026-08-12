import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocsChrome } from "@/components/docs/docs-chrome";

export const Route = createFileRoute("/docs/aegis")({
  head: () => ({
    meta: [
      { title: "WeCrew AEGIS™ Product Freeze · Docs" },
      {
        name: "description",
        content:
          "Frozen CEO product family for WeCrew AEGIS — Sovereign Autonomous Operations OS. Modules, Stage-1 slice, and what Wecrew Ops implements today.",
      },
      { property: "og:title", content: "WeCrew AEGIS™ Product Freeze · Docs" },
      {
        property: "og:description",
        content: "Freeze the product family: Command Center, Agent OS, Control Tower, evidence-backed RCA, sovereign local AI.",
      },
      { property: "og:url", content: "https://sovereign.ops.wecrew.in/docs/aegis" },
    ],
  }),
  component: DocsAegisPage,
});

const toc = [
  { id: "thesis", label: "CEO thesis" },
  { id: "family", label: "Product family" },
  { id: "loop", label: "Operating loop" },
  { id: "sovereign", label: "Sovereign Mode" },
  { id: "stages", label: "Roadmap stages" },
  { id: "ops", label: "Wecrew Ops today" },
] as const;

const modules = [
  ["Command Center", "Unified NOC/SRE/SOC executive surface"],
  ["WeCrew ITSM", "System of record — integrate, do not duplicate here"],
  ["AlertMind", "Alert correlation → actionable incidents"],
  ["Agent OS", "Multi-talented governed AI workforce"],
  ["AI Control Tower", "Prompt→model→MCP→infra flight recorder"],
  ["AgentSecOps", "AI security posture & forensics"],
  ["OpsGraph / ChangeGraph", "Blast radius + what changed"],
  ["Evidence & RCA", "Provenance, contradictions, confidence"],
  ["Sovereign Control", "Policy, approvals, kill switch"],
  ["Workflow Studio / AutoRemediate", "Deterministic action after approval"],
] as const;

const stages = [
  {
    n: "1",
    title: "Thin vertical slice",
    body: "One tenant, one read-only agent, one local model, one tool, one approval, one immutable execution ID.",
    cta: "Run Stage-1 demo",
    to: "/demo/vertical-slice" as const,
  },
  {
    n: "2",
    title: "V1 control plane",
    body: "Identity, orchestration, evidence, MCP, model gateway, approvals, metering, flight recorder UI.",
    cta: "Command Centre",
    to: "/command" as const,
  },
  {
    n: "3",
    title: "Operational intelligence",
    body: "OpsGraph, ChangeGraph, Incident Memory, Control Tower and AgentSecOps as first-class apps.",
    cta: "AI Control Tower",
    to: "/control-tower" as const,
  },
  {
    n: "4–5",
    title: "Governed action → predictive",
    body: "Workflow Studio + StackStorm, verification/rollback, then certified L4/L5 and FinOps.",
    cta: "Approvals",
    to: "/approvals" as const,
  },
] as const;

function DocsAegisPage() {
  return (
    <DocsChrome active="aegis">
      <section className="relative overflow-hidden border-b border-[#e8e6e0]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(255,91,46,0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, rgba(43,76,255,0.06), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div className="space-y-6">
            <p className="text-sm font-medium text-brand-coral">Product architecture · v4.0 freeze</p>
            <h1 className="font-display text-[clamp(2.1rem,4.2vw,3.1rem)] font-semibold leading-[1.08] tracking-tight text-[#1c1c1c]">
              WeCrew AEGIS™
              <span className="mt-2 block text-[#5c5a56]">
                Sovereign Autonomous Operations OS
              </span>
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-[#5c5a56] md:text-base">
              Freeze the product family now. Sell one platform with modular apps — not 18 unrelated
              dashboards. Inference stays inside the customer trust boundary in Sovereign Mode.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brand-coral text-white hover:bg-brand-coral/90">
                <Link to="/demo/vertical-slice">
                  Stage-1 vertical slice
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#d4cdc0] bg-white">
                <Link to="/docs">Ops intro</Link>
              </Button>
            </div>
            <ul className="space-y-2.5 pt-1 text-sm text-[#5c5a56]">
              {[
                "Self-hosted-first · Ollama behind Model Gateway",
                "No external LLM API key required in Sovereign Mode",
                "Evidence before action · L0–L5 autonomy ladder",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#0e1116] text-[#f7f7f4] shadow-[0_24px_80px_-24px_rgba(14,17,22,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px]">
              <span className="font-mono text-white/55">aegis › product freeze</span>
              <span className="text-brand-coral">9 Aug 2026</span>
            </div>
            <nav className="space-y-1 p-4" aria-label="On this page">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/85 hover:border-brand-coral/40"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="size-3.5 text-white/35" aria-hidden />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section id="thesis" className="border-b border-[#e8e6e0] py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <p className="text-sm font-medium text-brand-coral">North-star</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            CEO thesis
          </h2>
          <blockquote className="mt-6 border-l-2 border-brand-coral pl-5 text-[15px] leading-relaxed text-[#5c5a56] md:text-base">
            “WeCrew is a Sovereign Autonomous Operations OS that understands the technology estate,
            predicts and detects failures, investigates incidents with governed AI agents, proves RCA
            with evidence, safely remediates within policy, and continuously learns — entirely inside
            the customer trust boundary.”
          </blockquote>
        </div>
      </section>

      <section id="family" className="border-b border-[#e8e6e0] bg-white/40 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-sm font-medium text-brand-coral">Modules</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Final product family
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[#5c5a56]">
            Distinct applications, one operating model. Start with ITSM + AlertMind; attach Agent OS,
            Control Tower, AgentSecOps and governed remediation without replacing the platform.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {modules.map(([name, mission]) => (
              <li
                key={name}
                className="rounded-xl border border-[#e8e6e0] bg-[#f7f7f4] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[#1c1c1c]">{name}</p>
                <p className="mt-1 text-sm text-[#5c5a56]">{mission}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="loop" className="border-b border-[#e8e6e0] py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-sm font-medium text-brand-coral">Closed loop</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Observe → learn without losing context
          </h2>
          <p className="mt-6 overflow-x-auto font-mono text-[11px] leading-relaxed text-[#5c5a56] md:text-xs">
            OBSERVE → UNDERSTAND → PREDICT → DETECT → CORRELATE → INVESTIGATE → REASON → PROVE →
            SIMULATE → DECIDE → APPROVE → REMEDIATE → VERIFY → LEARN
          </p>
        </div>
      </section>

      <section id="sovereign" className="border-b border-[#e8e6e0] bg-white/40 py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <p className="text-sm font-medium text-brand-coral">Deployment</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Sovereign Mode
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-[#5c5a56]">
            {[
              "No external inference, embedding, or reranking calls",
              "No external telemetry of prompts / traces",
              "No unapproved model download; approved offline registry only",
              "No cross-tenant memory; no tool credentials inside model context",
              "Ollama initially behind WeCrew Model Gateway — never hard-coded as the product",
            ].map((line) => (
              <li key={line} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="stages" className="border-b border-[#e8e6e0] py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-sm font-medium text-brand-coral">CEO roadmap</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Sequence for a defensible product
          </h2>
          <ol className="mt-8 space-y-4">
            {stages.map((s) => (
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
                  <Link to={s.to}>
                    {s.cta}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="ops" className="py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <p className="text-sm font-medium text-brand-coral">This console</p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            What Wecrew Ops implements today
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#5c5a56]">
            <strong className="font-medium text-[#1c1c1c]">sovereign.ops</strong> is the Command
            Center / Agent OS experience layer: passports, investigations, evidence-backed RCA,
            SOC, model/tool registries, approvals, and now AI Control Tower plus the Stage-1
            CrashLoopBackOff vertical slice. ITSM remains the service-management system of record
            elsewhere. Control Tower, OpsGraph, and governed remediations deepen in Stages 3–4.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-brand-coral text-white hover:bg-brand-coral/90">
              <Link to="/control-tower">Open Control Tower</Link>
            </Button>
            <Button asChild variant="outline" className="border-[#d4cdc0] bg-white">
              <Link to="/incidents/$incidentId" params={{ incidentId: "inc-clb-01" }}>
                CrashLoopBackOff incident
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </DocsChrome>
  );
}
