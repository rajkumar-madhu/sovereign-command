import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      toast.success("Signed in", {
        description: "Session established",
      });
      void navigate({ to: "/" });
    }, 700);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5" aria-hidden="true" />
          <span className="font-semibold">Sovereign Agentic Operations OS</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">
            Vendor-neutral agent operations for regulated hybrid estates
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/80">
            Multi-tenant observability, agent passports, policy enforcement and evidence-backed root
            cause analysis — strictly read-only. No shell, no cluster-admin, no secret reads, no
            database writes, no firewall changes, no autonomous remediation.
          </p>
          <dl className="grid grid-cols-3 gap-4 pt-4 text-sm">
            <div>
              <dt className="text-primary-foreground/70">Tenants</dt>
              <dd className="text-xl font-semibold">—</dd>
            </div>
            <div>
              <dt className="text-primary-foreground/70">Agents</dt>
              <dd className="text-xl font-semibold">—</dd>
            </div>
            <div>
              <dt className="text-primary-foreground/70">Nodes</dt>
              <dd className="text-xl font-semibold">—</dd>
            </div>
          </dl>
        </div>
        <p className="text-xs text-primary-foreground/70">
          ISO 27001 · SOC 2 Type II · EU data residency options
        </p>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" noValidate>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
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
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sso" checked={sso} onCheckedChange={(v) => setSso(v === true)} />
            <Label htmlFor="sso" className="text-sm font-normal">
              Enforce SSO step-up for privileged views
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Access is logged and subject to dual-control policy. Privileged views may require SSO
            step-up.
          </p>
        </form>
      </div>
    </div>
  );
}