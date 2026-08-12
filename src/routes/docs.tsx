import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  FileSearch,
  Gauge,
  Lock,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Intro to Wecrew Ops · Docs" },
      {
        name: "description",
        content:
          "Intro to Wecrew Ops — the read-only agent operations plane at sovereign.ops. Command centre, passports, evidence-backed RCA, and governance.",
      },
      { property: "og:title", content: "Intro to Wecrew Ops · Docs" },
      {
        property: "og:description",
        content: "Start here: operate agent estates with passports, investigations, and audit-ready evidence.",
      },
      { property: "og:url", content: "https://sovereign.ops.wecrew.in/docs" },
      { property: "og:image", content: "https://sovereign.ops.wecrew.in/og-wecrew-ops.jpg" },
    ],
  }),
  component: DocsIntroPage,
});

const toc = [
  { id: "ways", label: "Two ways" },
  { id: "path", label: "Recommended path" },
  { id: "operate", label: "Operate" },
  { id: "capabilities", label: "Capabilities" },
  { id: "support", label: "Support" },
] as const;

const surfaces = [
  ["Command Centre", "Estate pulse, incidents, and scoped platform filters."],
  ["Agent passports", "Identity, budgets, and orchestration context in Agent details."],
  ["Investigate", "Evidence, host/IP identity, time windows, and RCA packages."],
  ["Govern", "SOC, approvals, policy, model gateway, and audit."],
] as const;

const pathSteps = [
  {
    n: "01",
    title: "Open the console",
    body: "Sign in or start a demo session. Scope tenant, customer, and environment from the top bar.",
    cta: "Sign in",
    to: "/login" as const,
  },
  {
    n: "02",
    title: "Read Command Centre",
    body: "Fleet health, open incidents, SLA risk, and spend — before any single investigation.",
    cta: "Command Centre",
    to: "/command" as const,
  },
  {
    n: "03",
    title: "Trust every passport",
    body: "Signed identity, autonomy, step and token budgets, blocked actions, orchestration routing.",
    cta: "Agent Registry",
    to: "/agents" as const,
  },
  {
    n: "04",
    title: "Investigate with evidence",
    body: "Incident workspace, hash-verified artefacts, and RCA packages stay linked.",
    cta: "Sample incident",
    to: "/incidents/$incidentId" as const,
    params: { incidentId: "inc-4821" },
  },
  {
    n: "05",
    title: "Govern with an audit trail",
    body: "Approvals, policy, SOC signals, and immutable audit — still read-only.",
    cta: "Approvals",
    to: "/approvals" as const,
  },
] as const;

const capabilities = [
  {
    title: "Language of operations",
    body: "Summarize fleet state, answer operator questions, and surface passport, budget, and incident context in one plane.",
    icon: Gauge,
  },
  {
    title: "Evidence & visuals",
    body: "Host/IP/application identity, timelines, graphs, and hash-verified artefacts that stand up in audit.",
    icon: FileSearch,
  },
  {
    title: "Agent governance",
    body: "Passports, orchestration routing, SOC, approvals, and policy — without production write from the UI.",
    icon: ShieldCheck,
  },
] as const;

function DocsIntroPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f4] text-[#1c1c1c]">
      <a
        href="#docs-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

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
            <Link to="/" className="hover:text-[#1c1c1c]">
              Product
            </Link>
            <a href="/#solutions" className="hover:text-[#1c1c1c]">
              Solutions
            </a>
            <span className="font-medium text-[#1c1c1c]">Docs</span>
            <a href="/#security" className="hover:text-[#1c1c1c]">
              Security
            </a>
            <a href="/#contact" className="hover:text-[#1c1c1c]">
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

      <main id="docs-main">
        {/* Hero — matches landing composition */}
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
            <div className="wl-hero-copy space-y-6">
              <p className="text-sm font-medium text-brand-coral">Documentation</p>
              <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.35rem)] font-semibold leading-[1.08] tracking-tight text-[#1c1c1c]">
                Intro to{" "}
                <span className="text-[#5c5a56]">
                  Wecrew <em className="not-italic text-brand-coral">Ops</em>
                </span>
              </h1>
              <p className="max-w-xl text-[15px] leading-relaxed text-[#5c5a56] md:text-base">
                A vendor-neutral, multi-tenant,{" "}
                <strong className="font-medium text-[#1c1c1c]">read-only</strong> agent operations plane
                for regulated hybrid infrastructure — what agents are doing, what they may do, and why
                something broke, with evidence you can take to audit.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-coral text-white hover:bg-brand-coral/90">
                  <Link to="/command">
                    Open the console
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-[#d4cdc0] bg-white">
                  <Link to="/docs/aegis">AEGIS freeze</Link>
                </Button>
              </div>
              <ul className="space-y-2.5 pt-1 text-sm text-[#5c5a56]">
                {[
                  "Passports cite identity, budget, and blocked actions",
                  "Self-hosted on your cluster — data stays inside your network",
                  "Console stays strictly read-only",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="wl-hero-preview wl-preview-float relative overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#0e1116] text-[#f7f7f4] shadow-[0_24px_80px_-24px_rgba(14,17,22,0.55)]"
              aria-label="Docs map for Wecrew Ops"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-[11px]">
                <span className="font-mono text-white/55">sovereign.ops › docs</span>
                <span className="inline-flex items-center gap-1.5 text-brand-coral">
                  <span className="size-1.5 animate-pulse rounded-full bg-brand-coral" />
                  Intro
                </span>
              </div>
              <div className="space-y-3 p-4 text-[13px]">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-coral">
                  On this page
                </p>
                <nav className="space-y-1" aria-label="Table of contents">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white/85 transition-colors hover:border-brand-coral/40 hover:bg-white/[0.07]"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="size-3.5 text-white/35" aria-hidden />
                    </a>
                  ))}
                </nav>
                <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Live surfaces</p>
                  <ul className="mt-2 space-y-1.5 text-[12px] text-white/65">
                    {surfaces.map(([title]) => (
                      <li key={title} className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-brand-coral" aria-hidden />
                        {title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tip strip */}
        <section className="border-b border-[#e8e6e0] bg-white/50">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-[#5c5a56] md:flex-row md:items-center md:justify-between md:px-6">
            <p>
              Looking to chat with the console? Visit{" "}
              <Link to="/login" className="font-medium text-brand-coral hover:underline">
                sovereign.ops sign-in
              </Link>{" "}
              or continue without an account for the product demo.
            </p>
            <p className="font-mono text-xs text-[#8a8680]">sovereign.ops.wecrew.in</p>
          </div>
        </section>

        {/* Two ways */}
        <section id="ways" className="scroll-mt-24 border-b border-[#e8e6e0]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Choose your path</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Two ways to use Wecrew Ops
              </h2>
              <p className="text-[#5c5a56]">
                Same product language — hosted evaluation or self-hosted residency.
              </p>
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <article className="space-y-4 border-t border-[#e8e6e0] pt-6">
                <p className="font-mono text-sm text-brand-coral">01</p>
                <h3 className="font-display text-xl font-semibold tracking-tight">Product console</h3>
                <p className="text-sm leading-relaxed text-[#5c5a56]">
                  Hosted UI at sovereign.ops / agents.ops with demo seed and read-only sessions.
                  Best for evaluation, training, and stakeholder walkthroughs.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-coral hover:underline"
                >
                  Sign in / demo
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </article>
              <article className="space-y-4 border-t border-[#e8e6e0] pt-6">
                <p className="font-mono text-sm text-brand-coral">02</p>
                <h3 className="font-display text-xl font-semibold tracking-tight">Self-hosted estate</h3>
                <p className="text-sm leading-relaxed text-[#5c5a56]">
                  Same application image on your Kind / K3s cluster behind Traefik or ingress. Best for
                  regulated estates that must keep agent ops data on-prem.
                </p>
                <a
                  href="https://github.com/rajkumar-madhu/sovereign-command"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-coral hover:underline"
                >
                  Deploy guide
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* Recommended path */}
        <section id="path" className="scroll-mt-24 border-b border-[#e8e6e0] bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Getting started</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Recommended path for new operators
              </h2>
              <p className="text-[#5c5a56]">
                Follow these steps to go from zero to a working Wecrew Ops session.
              </p>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {pathSteps.map((step) => (
                <li key={step.n} className="flex flex-col space-y-2">
                  <p className="font-mono text-sm text-brand-coral">{step.n}</p>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-[#5c5a56]">{step.body}</p>
                  {"params" in step ? (
                    <Link
                      to={step.to}
                      params={step.params}
                      className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand-coral hover:underline"
                    >
                      {step.cta}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : (
                    <Link
                      to={step.to}
                      className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand-coral hover:underline"
                    >
                      {step.cta}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Operate */}
        <section id="operate" className="scroll-mt-24 border-b border-[#e8e6e0]">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Operate</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Build an operations practice around agents
              </h2>
              <p className="text-[#5c5a56]">
                Entry points your team will use after the intro — demo, deploy, or talk to us.
              </p>
            </div>
            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
              <li className="space-y-3 border-t border-[#e8e6e0] pt-6">
                <h3 className="font-display text-lg font-semibold tracking-tight">Product demo</h3>
                <p className="text-sm leading-relaxed text-[#5c5a56]">
                  Walk the live console with seeded Nordic Federated Bank production scope — no cluster
                  required.
                </p>
                <Link
                  to="/command"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-coral hover:underline"
                >
                  Launch demo
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </li>
              <li className="space-y-3 border-t border-[#e8e6e0] pt-6">
                <h3 className="font-display text-lg font-semibold tracking-tight">Self-hosted deploy</h3>
                <p className="text-sm leading-relaxed text-[#5c5a56]">
                  Run the same UI on your Kind / K3s estate. Data stays inside your network.
                </p>
                <a
                  href="https://github.com/rajkumar-madhu/sovereign-command"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-coral hover:underline"
                >
                  Deploy guide
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              </li>
              <li className="space-y-3 border-t border-[#e8e6e0] pt-6">
                <h3 className="font-display text-lg font-semibold tracking-tight">Contact</h3>
                <p className="text-sm leading-relaxed text-[#5c5a56]">
                  Talk about regulated estates, residency, and rollout with the Wecrew Ops team.
                </p>
                <a
                  href="mailto:support@wecrew.in?subject=Wecrew%20Ops%20docs"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-coral hover:underline"
                >
                  support@wecrew.in
                  <ArrowRight className="size-3.5" aria-hidden />
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="scroll-mt-24 border-b border-[#e8e6e0] bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-brand-coral">Capabilities</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                What operators use Wecrew Ops for
              </h2>
              <p className="text-[#5c5a56]">
                Observability, passports, governance, and investigation — not a dashboard bolted onto a
                chat window.
              </p>
            </div>
            <ul className="mt-10 grid gap-8 sm:grid-cols-3">
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
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Bot, label: "Agent Registry", to: "/agents" as const },
                { icon: Siren, label: "Incident workspace", to: "/incidents/$incidentId" as const },
                { icon: FileSearch, label: "Evidence & RCA", to: "/evidence" as const },
                { icon: Lock, label: "Policies", to: "/policies" as const },
              ].map((item) =>
                item.to.includes("$incidentId") ? (
                  <Link
                    key={item.label}
                    to="/incidents/$incidentId"
                    params={{ incidentId: "inc-4821" }}
                    className="flex items-center gap-3 rounded-xl border border-[#ddd6c8] bg-[#f7f7f4] px-3 py-3 text-sm font-medium text-[#1c1c1c] transition-colors hover:border-brand-coral/40 hover:bg-white"
                  >
                    <item.icon className="size-4 shrink-0 text-brand-coral" aria-hidden />
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-3 rounded-xl border border-[#ddd6c8] bg-[#f7f7f4] px-3 py-3 text-sm font-medium text-[#1c1c1c] transition-colors hover:border-brand-coral/40 hover:bg-white"
                  >
                    <item.icon className="size-4 shrink-0 text-brand-coral" aria-hidden />
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>

        {/* Support / CTA — matches landing dark band */}
        <section id="support" className="scroll-mt-24 border-b border-[#e8e6e0] bg-[#0e1116] text-[#f7f7f4]">
          <div className="wl-cta-rise mx-auto max-w-3xl space-y-6 px-4 py-20 text-center md:px-6">
            <p className="text-sm font-medium text-brand-coral">Support</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Questions about residency, rollout, or the console?
            </h2>
            <p className="text-white/65">
              Talk to the Wecrew Ops team, or return to the product overview for solutions and security
              posture.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-brand-coral text-white hover:bg-brand-coral/90">
                <a href="mailto:support@wecrew.in?subject=Wecrew%20Ops%20docs">Talk to our team</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link to="/">Product overview</Link>
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
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1c]">Docs</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="hover:text-[#1c1c1c]">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/docs/aegis" className="hover:text-[#1c1c1c]">
                    AEGIS product freeze
                  </Link>
                </li>
                <li>
                  <Link to="/demo/vertical-slice" className="hover:text-[#1c1c1c]">
                    Stage-1 vertical slice
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1c]">Product</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                <li>
                  <Link to="/" className="hover:text-[#1c1c1c]">
                    Overview
                  </Link>
                </li>
                <li>
                  <Link to="/command" className="hover:text-[#1c1c1c]">
                    Console
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-[#1c1c1c]">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1c]">Company</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5c5a56]">
                <li>
                  <a href="mailto:support@wecrew.in" className="hover:text-[#1c1c1c]">
                    support@wecrew.in
                  </a>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-[#1c1c1c]">
                    Get started
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="border-t border-[#e8e6e0]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-[#5c5a56] md:px-6">
            <p>© 2026 Wecrew Ops · sovereign.ops</p>
            <span className="font-mono">Read-only · vendor neutral · multi-tenant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
