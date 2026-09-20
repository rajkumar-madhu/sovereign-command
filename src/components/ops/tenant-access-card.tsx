import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOpsSession } from "@/lib/ops-session";
import { rememberOperator } from "@/lib/ops-identity";

export function TenantAccessCard({ compact = false }: { compact?: boolean }) {
  const { session, identityEmail, bindTenantToken } = useOpsSession();
  const [email, setEmail] = useState(identityEmail);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    if (compact) return null;
    return (
      <div
        role="status"
        className="rounded-xl border border-success/25 bg-success/5 px-3 py-2.5 text-sm"
      >
        <p className="font-medium text-success">Tenant token bound</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {session.email} · {session.tenantId} · live fetch allowed for this tenant only
        </p>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || token.trim().length < 16) {
      setError("Work email and a tenant access token are required.");
      return;
    }
    setBusy(true);
    rememberOperator(email);
    const fail = await bindTenantToken(email, token.trim());
    setBusy(false);
    if (fail) {
      setError(fail);
      return;
    }
    setToken("");
    toast.success("Tenant token bound", {
      description: "Live cluster fetch is now scoped to that tenant.",
    });
  }

  return (
    <section
      className="rounded-2xl border border-brand-coral/30 bg-brand-coral/5 p-4"
      aria-label="Tenant access token"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 text-brand-coral" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-semibold">No tenant token — cluster data is closed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creating a user does not grant Finspot-dev access. Bind a tenant-scoped token first.
            Tokens never unlock another tenant.
          </p>
          {!compact && (
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => void submit(e)}>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-email">Work email</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@wecrew.in"
                  className="bg-background"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-token">Tenant access token</Label>
                <Input
                  id="tenant-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste the token for one tenant"
                  className="bg-background"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy} className="w-full md:w-auto">
                  <KeyRound className="size-4" aria-hidden="true" />
                  {busy ? "Binding…" : "Bind tenant"}
                </Button>
              </div>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {compact && (
            <Button asChild size="sm" className="mt-3">
              <Link to="/settings">Bind token in Settings</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
