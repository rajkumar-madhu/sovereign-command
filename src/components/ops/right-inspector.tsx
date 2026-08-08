import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  ExternalLink,
  FileSearch,
  PanelRightClose,
  PanelRightOpen,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusPill, toneForScore, toneForSeverity, toneForStatus } from "@/components/ops/status-badge";
import { useInspector } from "@/lib/inspector-context";
import { useOps } from "@/lib/ops-context";
import { useShellChrome } from "@/lib/shell-chrome";
import { cn } from "@/lib/utils";
import {
  agents,
  customerName,
  evidenceArtifacts,
  incidents,
  passports,
} from "@/data/seed";

function useWideDesktop() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1100px)");
    const onChange = () => setWide(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function inspectorTitle(pathname: string) {
  if (pathname === "/command") return "Quick actions";
  if (pathname === "/agents" || pathname.startsWith("/agents/")) return "Agent details";
  if (pathname === "/evidence") return "Evidence";
  if (pathname.startsWith("/incidents")) return "Incident";
  if (pathname === "/approvals") return "Approvals";
  if (pathname === "/rca") return "RCA";
  return "Details";
}

function InspectorHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3">
      <p className="font-display truncate text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
        {title}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={onClose}
        aria-label="Close inspector"
      >
        <PanelRightClose className="size-4" />
      </Button>
    </div>
  );
}

/** Command Centre — shortcuts only; metrics live on the main canvas. */
function CommandCentreInspector() {
  const ops = useOps();
  const openIncidents = incidents.filter((i) => i.status !== "closed");
  const p1 = openIncidents.filter((i) => i.severity === "P1");
  const pending = ops.approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-5 p-4">
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Siren className="size-4 text-destructive" aria-hidden="true" />
          <h3 className="font-display text-sm font-semibold text-sidebar-accent-foreground">
            Jump to work
          </h3>
        </div>
        <div className="grid gap-2">
          <Button asChild size="sm" className="justify-start">
            <Link to="/incidents/$incidentId" params={{ incidentId: p1[0]?.id ?? "inc-4821" }}>
              <Siren className="size-4" aria-hidden="true" />
              Open active P1
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
            <Link to="/evidence">
              <FileSearch className="size-4" aria-hidden="true" />
              Evidence viewer
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
            <Link to="/approvals">Review approvals ({pending})</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
            <Link to="/soc">
              <ShieldAlert className="size-4" aria-hidden="true" />
              Security SOC
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold text-sidebar-accent-foreground">
          Open incidents
        </h3>
        <ul className="space-y-2">
          {openIncidents.slice(0, 4).map((i) => (
            <li key={i.id}>
              <Link
                to="/incidents/$incidentId"
                params={{ incidentId: i.id }}
                className="block rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2.5 transition-colors hover:border-brand-coral/40 hover:bg-sidebar-accent/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-xs font-medium leading-snug text-sidebar-accent-foreground">
                    {i.title}
                  </p>
                  <StatusPill tone={toneForSeverity(i.severity)}>{i.severity}</StatusPill>
                </div>
                <p className="mt-1 text-[11px] text-sidebar-foreground/60">
                  {customerName(i.customerId)}
                  {i.slaRisk ? " · SLA at risk" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AgentInspector() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { selectedAgentId, setSelectedAgentId, focusAgent } = useInspector();
  const ops = useOps();

  useEffect(() => {
    const match = pathname.match(/^\/agents\/([^/]+)/);
    if (match?.[1] && match[1] !== selectedAgentId) {
      setSelectedAgentId(match[1]);
    }
  }, [pathname, selectedAgentId, setSelectedAgentId]);

  const agent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const passport = agent ? passports[agent.id] : undefined;
  const status = agent ? (ops.agentStates[agent.id] ?? agent.status) : null;

  if (!agent) {
    const watchlist = [...agents].sort((a, b) => a.trustScore - b.trustScore).slice(0, 5);

    return (
      <div className="space-y-5 p-4">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Bot className="size-4" aria-hidden="true" />
            <h3 className="font-display text-sm font-semibold">Select an agent</h3>
          </div>
          <p className="text-xs leading-relaxed text-sidebar-foreground/65">
            Click a registry row to inspect passport, budgets, and controls here.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
            Lowest trust
          </h3>
          <ul className="space-y-1.5">
            {watchlist.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => focusAgent(a.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-2 text-left transition-colors hover:border-brand-coral/40 hover:bg-sidebar-accent/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-sidebar-accent-foreground">
                      {a.name}
                    </span>
                    <span className="text-[11px] text-sidebar-foreground/60">{a.kind}</span>
                  </span>
                  <StatusPill tone={toneForScore(a.trustScore)}>{a.trustScore}</StatusPill>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  const budgetPct = passport
    ? Math.min(100, Math.round((passport.tokensUsed / passport.tokenBudget) * 100))
    : 0;

  return (
    <div className="space-y-5 p-4">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/55">
              {agent.kind}
            </p>
            <h3 className="font-display truncate text-base font-semibold tracking-tight text-sidebar-accent-foreground">
              {agent.name}
            </h3>
          </div>
          <StatusPill tone={toneForStatus(status!)}>{status}</StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">Trust</p>
            <p className="font-display mt-1 text-xl font-semibold tabular-nums text-sidebar-accent-foreground">
              {agent.trustScore}
            </p>
          </div>
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">Autonomy</p>
            <p className="mt-1 text-sm font-medium capitalize text-sidebar-accent-foreground">
              {agent.autonomy}
            </p>
          </div>
        </div>
      </section>

      {passport && (
        <section className="space-y-2">
          <h3 className="font-display text-sm font-semibold text-sidebar-accent-foreground">Passport</h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-sidebar-foreground/60">Signature</dt>
              <dd>
                <StatusPill tone={passport.signature === "valid" ? "success" : "warning"}>
                  {passport.signature}
                </StatusPill>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-sidebar-foreground/60">Max steps</dt>
              <dd className="font-medium tabular-nums text-sidebar-accent-foreground">
                {passport.maxSteps}
              </dd>
            </div>
            <div>
              <div className="mb-1 flex justify-between gap-2">
                <dt className="text-sidebar-foreground/60">Token budget</dt>
                <dd className="tabular-nums text-sidebar-accent-foreground">
                  {passport.tokensUsed.toLocaleString()} / {passport.tokenBudget.toLocaleString()}
                </dd>
              </div>
              <Progress value={budgetPct} aria-label={`Token budget ${budgetPct}% used`} />
            </div>
          </dl>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
              Blocked actions
            </p>
            <ul className="flex flex-wrap gap-1">
              {passport.blockedActions.slice(0, 4).map((action) => (
                <li
                  key={action}
                  className="rounded-md border border-sidebar-border bg-sidebar-accent/50 px-1.5 py-0.5 text-[10px] text-sidebar-accent-foreground"
                >
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {pathname.startsWith(`/agents/${agent.id}`) ? (
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
          Full passport is open on the canvas. This console is read-only — lifecycle actions are
          managed outside Sovereign.
        </p>
      ) : (
        <section className="space-y-2">
          <Button
            asChild
            size="sm"
            className="w-full justify-start bg-brand-coral text-white hover:bg-brand-coral/90"
          >
            <Link to="/agents/$agentId" params={{ agentId: agent.id }}>
              <ExternalLink className="size-4" aria-hidden="true" />
              View full passport
            </Link>
          </Button>
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
            This console is read-only. Lifecycle actions are managed outside Sovereign.
          </p>
        </section>
      )}
    </div>
  );
}

function EvidenceInspector() {
  const first = evidenceArtifacts[0];
  return (
    <div className="space-y-4 p-4">
      <p className="text-xs leading-relaxed text-sidebar-foreground/70">
        Artefacts are hash-verified and read-only. Use the canvas list to pick a file; export when
        you need an audit bundle.
      </p>
      {first && (
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
            Latest artefact
          </p>
          <p className="mt-1 font-mono text-xs font-medium text-sidebar-accent-foreground">
            {first.name}
          </p>
          <p className="mt-1 text-[11px] text-sidebar-foreground/60">
            {first.kind} · {first.collected}
          </p>
        </div>
      )}
      <div className="grid gap-2">
        <Button asChild size="sm" className="justify-start">
          <Link to="/incidents/$incidentId" params={{ incidentId: "inc-4821" }}>
            Related incident
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
          <Link to="/rca">Open RCA report</Link>
        </Button>
      </div>
    </div>
  );
}

function IncidentInspector() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const id = pathname.match(/^\/incidents\/([^/]+)/)?.[1];
  const incident = incidents.find((i) => i.id === id) ?? incidents.find((i) => i.status !== "closed");

  if (!incident) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-xs text-sidebar-foreground/70">No open incident in scope.</p>
        <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
          <Link to="/command">Back to Command Centre</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-sidebar-accent-foreground">
            {incident.title}
          </h3>
          <StatusPill tone={toneForSeverity(incident.severity)}>{incident.severity}</StatusPill>
        </div>
        <p className="mt-1 font-mono text-[11px] text-sidebar-foreground/60">{incident.id}</p>
        {incident.slaRisk && (
          <p className="mt-2 text-xs font-medium text-warning">SLA at risk</p>
        )}
      </div>
      <div className="grid gap-2">
        <Button asChild size="sm" className="justify-start">
          <Link to="/evidence">Open evidence</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
          <Link to="/rca">RCA report</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
          <Link to="/investigations">Investigations</Link>
        </Button>
      </div>
    </div>
  );
}

function ApprovalsInspector() {
  const ops = useOps();
  const pending = ops.approvals.filter((a) => a.status === "pending");

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs text-sidebar-foreground/70">
        {pending.length} pending approval{pending.length === 1 ? "" : "s"} in the current tenant
        scope. Review on the main queue — this panel lists the hottest items.
      </p>
      <ul className="space-y-2">
        {pending.slice(0, 5).map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 px-3 py-2"
          >
            <p className="line-clamp-2 text-xs font-medium text-sidebar-accent-foreground">
              {a.request}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/55">{a.id}</p>
          </li>
        ))}
      </ul>
      {pending.length === 0 && (
        <p className="text-xs text-sidebar-foreground/55">Queue is clear.</p>
      )}
    </div>
  );
}

function RcaInspector() {
  return (
    <div className="space-y-4 p-4">
      <p className="text-xs leading-relaxed text-sidebar-foreground/70">
        RCA for the active P1 — cross-check evidence hashes before sharing externally.
      </p>
      <div className="grid gap-2">
        <Button asChild size="sm" className="justify-start">
          <Link to="/evidence">Verify evidence artefacts</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
          <Link to="/incidents/$incidentId" params={{ incidentId: "inc-4821" }}>
            Incident workspace
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Quiet empty — no tenant / session boilerplate. */
function EmptyInspector() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-sidebar-foreground/70">
        Nothing to inspect on this page. Open the Agent Registry and select a row for passport
        details, or use Focus to hide chrome entirely.
      </p>
      <Button asChild size="sm" variant="outline" className="justify-start border-sidebar-border">
        <Link to="/agents">
          <Bot className="size-4" aria-hidden="true" />
          Agent Registry
        </Link>
      </Button>
    </div>
  );
}

function InspectorBody() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/command") return <CommandCentreInspector />;
  if (pathname === "/agents" || pathname.startsWith("/agents/")) return <AgentInspector />;
  if (pathname === "/evidence") return <EvidenceInspector />;
  if (pathname.startsWith("/incidents")) return <IncidentInspector />;
  if (pathname === "/approvals") return <ApprovalsInspector />;
  if (pathname === "/rca") return <RcaInspector />;
  return <EmptyInspector />;
}

export function RightInspector() {
  const { open, setOpen } = useInspector();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const wide = useWideDesktop();
  const title = inspectorTitle(pathname);

  const panel = (
    <div className="inspector-panel flex h-full flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur-md">
      <InspectorHeader title={title} onClose={() => setOpen(false)} />
      <div className="flex-1 overflow-y-auto">
        <InspectorBody />
      </div>
    </div>
  );

  if (!wide) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(100%,22rem)] border-sidebar-border p-0 sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 h-screen shrink-0 overflow-hidden border-l border-sidebar-border transition-[width,opacity] duration-300 ease-out",
        open ? "w-80 opacity-100" : "w-0 border-l-0 opacity-0",
      )}
      aria-hidden={!open}
    >
      <div className="h-full w-80">{panel}</div>
    </aside>
  );
}

export function InspectorToggle() {
  const { open, setOpen } = useInspector();
  const { focusMode, setFocusMode } = useShellChrome();
  const wide = useWideDesktop();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9"
      onClick={() => {
        if (open) {
          setOpen(false);
          return;
        }
        if (focusMode) setFocusMode(false);
        setOpen(true);
      }}
      aria-label={open ? "Hide details panel" : "Show details panel"}
      aria-pressed={open}
      title={open ? "Hide details panel" : "Show details panel (opt-in)"}
    >
      {open && wide ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
    </Button>
  );
}
