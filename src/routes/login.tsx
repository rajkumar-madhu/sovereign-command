import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cpu, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Sign in to the Sovereign Agentic Operations OS — a read-only, multi-tenant Agent OS for regulated hybrid infrastructure.",
      },
      { property: "og:title", content: "Sign in · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Read-only agent operations console for regulated hybrid infrastructure.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ingrid.halvorsen@sovereign.os");
  const [password, setPassword] = useState("demo-read-only");
  const [sso, setSso] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid work email and a password of at least 6 characters.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Read-only session established", {
        description: "Scope: Nordic Federated Bank · production",
      });
      void navigate({ to: "/" });
    }, 700);
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.15fr_minmax(420px,0.85fr)]">
      {/* Brand panel — AgentOS ink + coral/blue atmosphere */}
      <div className="silicon-circuit animate-circuit-pulse relative hidden flex-col justify-between overflow-hidden p-10 text-sidebar-accent-foreground lg:flex xl:px-16 xl:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #c8c4bc 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative z-10 animate-rise-in flex items-center gap-3">
          <span className="silicon-die-glow flex size-11 items-center justify-center rounded-xl bg-brand-coral text-white shadow-md">
            <Cpu className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">
              Sovereign
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-brand-coral">
              Agentic Operations OS
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg animate-rise-in space-y-6 [animation-delay:120ms]">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-coral">
            Enterprise operations platform
          </p>
          <h1 className="font-display text-[2.25rem] leading-[1.1] font-semibold tracking-tight text-sidebar-accent-foreground xl:text-[2.75rem]">
            Vendor-neutral agent operations for regulated hybrid estates
          </h1>
          <p className="max-w-md text-[13px] leading-relaxed text-sidebar-foreground/65">
            Multi-tenant observability, agent passports, policy enforcement and evidence-backed root
            cause analysis — strictly read-only. No shell, no cluster-admin, no secret reads, no
            database writes, no firewall changes, no autonomous remediation.
          </p>
          <dl className="grid grid-cols-3 gap-3 pt-2 text-sm">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/80 px-3 py-2.5">
              <dt className="text-[11px] text-sidebar-foreground/70">Tenants</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                4
              </dd>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/80 px-3 py-2.5">
              <dt className="text-[11px] text-sidebar-foreground/70">Agents</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                30
              </dd>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/80 px-3 py-2.5">
              <dt className="text-[11px] text-sidebar-foreground/70">Nodes</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                940
              </dd>
            </div>
          </dl>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/55">
          ISO 27001 · SOC 2 Type II · EU data residency options
        </p>
      </div>

      <div className="relative flex items-center justify-center bg-background px-4 py-12">
        <form onSubmit={submit} className="mx-auto w-full max-w-[380px] space-y-6" noValidate>
          <div className="flex items-center gap-2 lg:hidden">
            <ShieldCheck className="size-5 text-brand-coral" aria-hidden="true" />
            <span className="text-sm font-semibold">Sovereign Agentic Ops</span>
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-[2rem] font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Use your corporate identity to open a read-only operations session.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sso" checked={sso} onCheckedChange={(v) => setSso(v === true)} />
            <Label htmlFor="sso" className="text-sm font-normal">
              Enforce SSO step-up for privileged views
            </Label>
          </div>

          <Button type="submit" className="w-full bg-brand-coral text-white hover:bg-brand-coral/90" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? "Establishing session…" : "Sign in"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Demonstration environment with synthetic tenant data. All actions are simulated and
            audited; no production system can be modified from this console.
          </p>
        </form>
      </div>
    </div>
  );
}
