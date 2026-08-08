import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  Cpu,
  FileSearch,
  Gauge,
  Lock,
  Radar,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wecrew Ops" },
      {
        name: "description",
        content:
          "Wecrew Ops · sovereign.ops — command centre, passports, policy, evidence-backed RCA. Read-only. Self-hosted on your cluster.",
      },
      { property: "og:title", content: "Wecrew Ops" },
      {
        property: "og:description",
        content: "Command every agent estate from one secure operations plane at sovereign.ops.wecrew.in.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sovereign.ops.wecrew.in/" },
      { property: "og:image", content: "https://sovereign.ops.wecrew.in/og-wecrew-ops.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Wecrew Ops" },
      {
        name: "twitter:description",
        content: "Command every agent estate from one secure operations plane at sovereign.ops.wecrew.in.",
      },
      { name: "twitter:image", content: "https://sovereign.ops.wecrew.in/og-wecrew-ops.jpg" },
    ],
  }),
  component: LandingPage,
});

const audiences = [
  "Site Reliability",
  "Platform Engineering",
  "Security Operations",
  "Agent Governance",
  "Compliance",
  "Incident Response",
  "FinOps",
];

const tours = [
  {
    id: "command",
    label: "Command Centre",
    title: "See the estate at a glance",
    body: "Fleet health, live telemetry, threshold monitors, and open incidents in one plane — so operators stop hopping between ten tools.",
    question: "Which agents are degraded right now?",
    answer:
      "Three agents are degraded: Planner-01 (signature expiring), NetOps-07 (elevated error rate), and CostGuard (budget 92% consumed). P1 incident inc-4821 is still open.",
    sources: ["Fleet pulse · live", "inc-4821 timeline", "Passport signatures"],
  },
  {
    id: "passport",
    label: "Agent passport",
    title: "Trust every agent’s envelope",
    body: "Signed identity, autonomy level, token budget, and blocked actions — so you know what an agent is allowed to do before it runs.",
    question: "What can Supervisor Agent 01 execute?",
    answer:
      "Read-only autonomy. Signature expiring. Max 24 steps. Token budget 1.2M / 4.0M. Blocked: shell.exec, k8s.delete, secrets.read, cluster-admin.",
    sources: ["SPIFFE identity", "Policy bind", "Token ledger"],
  },
  {
    id: "investigate",
    label: "Investigate",
    title: "Evidence-backed root cause",
    body: "Incidents, artefact hashes, and RCA recommendations stay linked — so remediation decisions cite what was collected, not memory.",
    question: "Why did checkout latency spike after 14:00?",
    answer:
      "Pool ceiling was raised below the new worker count. Evidence: node-conditions.json, change CHG-2291, and p95 latency series. Recommended: restore prior pool size.",
    sources: ["Evidence viewer", "RCA report", "Change record"],
  },
  {
    id: "govern",
    label: "Govern",
    title: "Approvals, policy, and audit",
    body: "Policy evaluations, approval queues, SLA windows, and an immutable audit trail keep agent operations inside the control plane you already trust.",
    question: "Which approvals breach SLA in the next hour?",
    answer:
      "Two pending approvals are at risk: tool-grant for NetOps-07 and model-route change for Planner-01. Escalation path is already attached.",
    sources: ["Approval queue", "SLA admin", "Audit trail"],
  },
] as const;

const capabilities = [
  {
    title: "Global Command Centre",
    body: "Cross-tenant pulse for agents, incidents, SLA risk, security signals, and spend.",
    icon: Gauge,
  },
  {
    title: "Agent passports",
    body: "Signed identity, trust score, autonomy, budgets, and blocked actions per agent.",
    icon: Bot,
  },
  {
    title: "Live telemetry",
    body: "Streaming CPU, latency, error rate, throughput, and threshold monitors.",
    icon: Radar,
  },
  {
    title: "Evidence & RCA",
    body: "Hash-verified artefacts and root-cause reports operators can defend in audit.",
    icon: FileSearch,
  },
  {
    title: "Policy & approvals",
    body: "Evaluate, queue, escalate — without giving the console write access to production.",
    icon: ShieldCheck,
  },
  {
    title: "Read-only by design",
    body: "No shell, no cluster-admin, no secret reads, no autonomous remediation from this UI.",
    icon: Lock,
  },
];

const steps = [
  {
    n: "01",
    title: "Connect estates",
    body: "Point Wecrew Ops at your tenants, environments, and agent runtimes with scoped credentials.",
  },
  {
    n: "02",
    title: "Index operations signals",
    body: "Fleet status, passports, incidents, and telemetry land in one operations graph.",
  },
  {
    n: "03",
    title: "Operate and investigate",
    body: "Command Centre for pulse; Investigation for evidence and RCA when something breaks.",
  },
  {
    n: "04",
    title: "Govern with an audit trail",
    body: "Approvals, policy, SLA, and audit keep every action reviewable — and still read-only.",
  },
];

const solutions = [
  {
    title: "SRE / Platform",
    body: "One plane for agent fleet health, incidents, and live signals across hybrid estates.",
  },
  {
    title: "Security operations",
    body: "SOC signals, blocked actions, and passport trust scores without granting write paths.",
  },
  {
    title: "Agent governance",
    body: "Autonomy levels, token budgets, and approval queues for every registered agent.",
  },
  {
    title: "Compliance",
    body: "Evidence hashes, RCA, and audit trails ready for regulated review.",
  },
  {
    title: "FinOps",
    body: "Model gateway spend, burn rate, and tenant budgets next to fleet health.",
  },
  {
    title: "Incident command",
    body: "P1 workspace, artefacts, and recommendations linked in one investigation path.",
  },
];

function LandingPage() {
  const [tour, setTour] = useState<(typeof tours)[number]["id"]>("command");
  const active = tours.find((t) => t.id === tour) ?? tours[0];

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-[#1c1c1c]">
      <a
        href="#wl-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* Header — Copilot-style */}
      <header className="sticky top-0 z-40 border-b border-[#e8e6e0]/bg-[#f7f7f4]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-coral text-sm font-bold text-white">
              W
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Wecrew <em className="not-italic text-brand-coral">Ops</em>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-[#5c5a56] lg:flex" aria-label="Primary">
            <a href="#product" className="hover:text-[#1c1c1c]">
              Product
            </a>
            <a href="#solutions" className="hover:text-[#1c1c1c]">
              Solutions
            </a>
            <a href="#features" className="hover:text-[#1c1c1c]">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#1c1c1c]">
              How it works
            </a>
            <a href="#security" className="hover:text-[#1c1c1c]">
              Security
            </a>
            <a href="#contact" className="hover:text-[#1c1c1c]">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-[#1c1c1c]">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-brand-coral text-white hover:bg-brand-coral/90">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="wl-main">
        {/* Hero */}
        <section className="border-b border-[#e8e6e0]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
            <div className="wl-hero-copy space-y-6">
              <p className="text-sm font-medium text-brand-coral">
                Secure agent operations for enterprise teams
              </p>
              <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.5rem)] font-semibold leading-[1.08] tracking-tight text-[#1c1c1c]">
                Your agent estate.{" "}
                <span className="text-[#5c5a56]">One intelligent command plane.</span>
              </h1>
              <p className="max-w-xl text-[15px] leading-relaxed text-[#5c5a56] md:text-base">
                Connect fleets, passports, incidents, and telemetry to a read-only operations OS that
                shows what agents are doing, what they are allowed to do, and why something broke —
                with evidence you can take to audit.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-coral text-white hover:bg-brand-coral/90">
                  <Link to="/signup">
                    Start using Wecrew Ops
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-[#d4cdc0] bg-white">
                  <Link to="/command">View product demo</Link>
                </Button>
              </div>
              <ul className="space-y-2.5 pt-2 text-sm text-[#5c5a56]">
                {[
                  "Passports cite identity, budget, and blocked actions",
                  "Runs on your own cluster — data stays inside your network",
                  "Role-ready audit trail; console stays strictly read-only",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product preview — Copilot-style live mock */}
            <div
              className="wl-hero-preview wl-preview-float relative overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#0e1116] text-[#f7f7f4] shadow-[0_24px_80px_-24px_rgba(14,17,22,0.55)]"
              aria-label="Animated preview of Wecrew Ops Command Centre"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px]">
                <span className="font-mono text-white/55">sovereign.ops.wecrew.in</span>
                <span className="inline-flex items-center gap-1.5 text-brand-coral">
                  <span className="size-1.5 animate-pulse rounded-full bg-brand-coral" />
                  Live
                </span>
              </div>
              <div className="space-y-3 p-4 text-[13px]">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">You</p>
                  <p className="mt-1 text-white/90">Which agents are degraded after the 14:00 release?</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-coral">
                    Retrieved 3 sources
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] text-white/60">
                    <li>Fleet pulse · live</li>
                    <li>inc-4821 timeline</li>
                    <li>Passport signatures</li>
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-coral text-xs font-bold text-white">
                      W
                    </span>
                    <div className="space-y-2">
                      <p className="leading-relaxed text-white/90">
                        Three agents degraded; P1 inc-4821 still open. Signature expiry on Planner-01
                        is the top risk — restore pool sizing per runbook §3.1 before escalating.
                      </p>
                      <ul className="space-y-1 text-[12px] text-white/55">
                        <li>
                          <strong className="text-white/80">checkout-runbook.pdf</strong> · §3.1 Latency
                          triage
                        </li>
                        <li>
                          <strong className="text-white/80">CHG-2291</strong> · Release record
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70">
                    Open incident
                  </span>
                  <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70">
                    View passport
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/45">
                  <span>Connected</span>
                  <span className="flex gap-2">
                    <Cpu className="size-3.5" aria-hidden />
                    <Siren className="size-3.5" aria-hidden />
                    <ShieldCheck className="size-3.5" aria-hidden />
                    <Bot className="size-3.5" aria-hidden />
                  </span>
                </div>
              </div>
              <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 text-[10px]">
                <span className="rounded-md bg-white/10 px-2 py-1 backdrop-blur">Read-only</span>
                <span className="rounded-md bg-white/10 px-2 py-1 backdrop-blur">3 sources cited</span>
              </div>
            </div>
          </div>
        </section>

        {/* Audience strip */}
        <section className="border-b border-[#e8e6e0] bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
            <p className="text-center text-sm text-[#5c5a56]">
              Built for teams that need secure, accurate, and actionable agent operations.
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#1c1c1c]">
              {audiences.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Product tour */}
        <section id="product" className="border-b border-[#e8e6e0]">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Product tour</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                See Wecrew Ops at work
              </h2>
              <p className="text-[#5c5a56]">
                Four of the jobs operators hand to Wecrew Ops every day — each against the screen it
                actually runs on.
              </p>
            </div>
            <div
              role="tablist"
              aria-label="Product use cases"
              className="flex flex-wrap gap-2 border-b border-[#e8e6e0] pb-3"
            >
              {tours.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tour === t.id}
                  onClick={() => setTour(t.id)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    tour === t.id
                      ? "bg-[#1c1c1c] text-white"
                      : "bg-transparent text-[#5c5a56] hover:bg-[#ebe6dc]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" key={active.id} className="wl-tour-panel grid gap-8 lg:grid-cols-2 lg:items-start">
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-semibold tracking-tight">{active.title}</h3>
                <p className="text-[#5c5a56]">{active.body}</p>
                <div className="space-y-3 rounded-2xl border border-[#ddd6c8] bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5c5a56]">
                    Question
                  </p>
                  <p className="text-sm text-[#1c1c1c]">{active.question}</p>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-coral">
                    Wecrew Ops
                  </p>
                  <p className="text-sm leading-relaxed text-[#1c1c1c]">{active.answer}</p>
                  <ul className="space-y-1 text-xs text-[#5c5a56]">
                    {active.sources.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>
                <Button asChild className="bg-brand-coral text-white hover:bg-brand-coral/90">
                  <Link to="/command">Try this in the console</Link>
                </Button>
              </div>
              <figure className="overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#0e1116] p-4 text-[#f7f7f4]">
                <figcaption className="mb-3 text-[11px] text-white/45">
                  Live console — {active.label}
                </figcaption>
                <div className="space-y-2 font-mono text-[11px] leading-relaxed text-white/75">
                  <p className="text-brand-coral">sovereign.ops › {active.id}</p>
                  <p>{active.question}</p>
                  <p className="text-white/90">{active.answer}</p>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-[#e8e6e0] bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Capabilities</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Everything an agent operations OS has to do
              </h2>
              <p className="text-[#5c5a56]">
                Observability, passports, governance, and investigation in one deployment — not a
                dashboard bolted onto a chat window.
              </p>
            </div>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((c) => (
                <li key={c.title} className="space-y-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#ebe6dc] text-[#1c1c1c]">
                    <c.icon className="size-4" aria-hidden />
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-[#5c5a56]">{c.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-[#e8e6e0]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">How it works</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                From scattered runtimes to one answer
              </h2>
              <p className="text-[#5c5a56]">
                Connect, index, operate, govern. The operations layer stays inside your deployment at
                every step.
              </p>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="space-y-2">
                  <p className="font-mono text-sm text-brand-coral">{s.n}</p>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[#5c5a56]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Solutions */}
        <section id="solutions" className="border-b border-[#e8e6e0] bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Solutions</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                One OS, every operations team
              </h2>
              <p className="text-[#5c5a56]">
                The same command plane serves an SRE mid-incident and a compliance officer reviewing
                evidence — each within their own access.
              </p>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {solutions.map((s) => (
                <li
                  key={s.title}
                  className="rounded-2xl border border-[#ddd6c8] bg-[#f7f7f4] p-5 transition-colors hover:border-brand-coral/40"
                >
                  <h3 className="font-display text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5c5a56]">{s.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-b border-[#e8e6e0]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Security and governance</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Enterprise agents without compromising control
              </h2>
              <p className="text-[#5c5a56]">
                Wecrew Ops ships as containers you run yourself. Passports, evidence, and audit stay
                inside the infrastructure you already govern.
              </p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-[#ddd6c8] bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5c5a56]">
                  Access posture
                </p>
                <ul className="mt-4 space-y-3 text-sm">
                  {[
                    ["Viewer", "Ask and inspect — no mutations"],
                    ["Operator", "Investigations and evidence export"],
                    ["Admin", "Tenants, budgets, policy binds"],
                    ["Owner", "Full control plane configuration"],
                  ].map(([role, desc]) => (
                    <li key={role} className="flex items-start justify-between gap-3 border-b border-[#ebe6dc] pb-3 last:border-0">
                      <span className="font-medium text-[#1c1c1c]">{role}</span>
                      <span className="text-right text-[#5c5a56]">{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Read-only console", "No shell, cluster-admin, secret reads, or autonomous remediations."],
                  ["Private deployment", "Kubernetes manifests on your cluster — same pattern as Copilot."],
                  ["Audit trail", "Authentication and investigation events recorded for review."],
                  ["Evidence transparency", "Artefacts are hash-verified; RCA cites what was collected."],
                  ["TLS in transit", "Public endpoints terminate with managed certificates."],
                  ["Scoped credentials", "Secrets stay in your store — never pasted into the UI."],
                ].map(([title, body]) => (
                  <li key={title} className="space-y-1.5">
                    <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
                    <p className="text-sm leading-relaxed text-[#5c5a56]">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="contact" className="border-b border-[#e8e6e0] bg-[#0e1116] text-[#f7f7f4]">
          <div className="wl-cta-rise mx-auto max-w-3xl space-y-6 px-4 py-20 text-center md:px-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Turn your agent estate into an operable system.
            </h2>
            <p className="text-white/65">
              Give every operator secure access to fleet health, passports, and evidence through one
              intelligent command plane.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-brand-coral text-white hover:bg-brand-coral/90">
                <Link to="/signup">Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <a href="mailto:support@wecrew.in?subject=Wecrew%20Ops%20enquiry">Talk to our team</a>
              </Button>
            </div>
            <div className="space-y-1 text-sm text-white/65">
              <p className="font-medium text-[#f7f7f4]">Rajkumar Madhu</p>
              <p>
                <a className="hover:text-white" href="mailto:support@wecrew.in">
                  support@wecrew.in
                </a>
                <span className="mx-2 text-white/30">·</span>
                <a className="hover:text-white" href="tel:+919176772077">
                  +91 91767 72077
                </a>
              </p>
            </div>
            <p className="text-xs text-white/45">
              Runs on your infrastructure · Read-only by design · Evidence cites its sources
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-[#f7f7f4]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_2fr] md:px-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-coral text-sm font-bold text-white">
                W
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Wecrew <em className="not-italic text-brand-coral">Ops</em>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#5c5a56]">
              A secure enterprise agent operations OS: command centre, passports, policy, and
              evidence-backed RCA — deployed on your own infrastructure.
            </p>
            <div className="space-y-1 text-sm text-[#5c5a56]">
              <p className="font-medium text-[#1c1c1c]">Rajkumar Madhu</p>
              <p>
                <a className="hover:text-[#1c1c1c]" href="mailto:support@wecrew.in">
                  support@wecrew.in
                </a>
              </p>
              <p>
                <a className="hover:text-[#1c1c1c]" href="tel:+919176772077">
                  +91 91767 72077
                </a>
                <span className="mx-2 text-[#d4cdc0]">·</span>
                <span className="font-mono text-xs">sovereign.ops.wecrew.in</span>
              </p>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-4" aria-label="Footer">
            {[
              ["Product", ["#product", "#features", "#how-it-works"]],
              ["Solutions", ["#solutions"]],
              ["Resources", ["#security", "/command", "/login"]],
              ["Company", ["#contact", "/signup"]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <h3 className="text-sm font-semibold text-[#1c1c1c]">{title as string}</h3>
                <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                  {(links as string[]).map((href) => (
                    <li key={href}>
                      {href.startsWith("/") ? (
                        <Link to={href} className="hover:text-[#1c1c1c]">
                          {href === "/command"
                            ? "Console"
                            : href === "/login"
                              ? "Sign in"
                              : href === "/signup"
                                ? "Get started"
                                : href}
                        </Link>
                      ) : (
                        <a href={href} className="hover:text-[#1c1c1c]">
                          {href.replace("#", "").replace(/-/g, " ")}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="border-t border-[#e8e6e0]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-[#5c5a56] md:px-6">
            <p>© 2026 Wecrew Ops · sovereign.ops</p>
            <a href="#security" className="hover:text-[#1c1c1c]">
              Security overview
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
