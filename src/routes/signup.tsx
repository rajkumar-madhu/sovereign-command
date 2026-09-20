import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Gauge, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  AuthBackLink,
  AuthFeatures,
  AuthField,
  AuthShell,
  AuthSpinner,
  AuthSubmit,
} from "@/components/auth/auth-shell";
import { isOperatorEmail, MIN_PASSWORD_LENGTH } from "@/data/operator-allowlist";
import { bindTenantAccess } from "@/lib/auth-client";
import { rememberOperator } from "@/lib/ops-identity";
import { createOperatorSession, setSession } from "@/lib/session";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account · Wecrew Ops" },
      {
        name: "description",
        content: "Create an operator identity. Live cluster data requires a tenant access token.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Enter a valid work email and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (!isOperatorEmail(email)) {
      setError(
        "This email is not on the operator allowlist. Contact your platform administrator.",
      );
      return;
    }
    rememberOperator(email);
    setBusy(true);
    setSession(createOperatorSession(email));
    if (token.trim()) {
      const fail = await bindTenantAccess(email, token.trim());
      setBusy(false);
      if (fail) {
        setError(fail);
        return;
      }
      toast.success("Account created and tenant token bound", {
        description: "Live fetch is scoped to that tenant only.",
      });
    } else {
      setBusy(false);
      toast.message("Account created — no tenant token", {
        description: "The console will stay empty until a platform token is bound.",
      });
    }
    void navigate({ to: "/command" });
  }

  return (
    <AuthShell
      title={
        <>
          Create an operator identity.{" "}
          <span className="bg-gradient-to-r from-brand-coral to-[#2b4cff] bg-clip-text text-transparent">
            Not cluster access.
          </span>
        </>
      }
      footer="Self-hosted · vendor neutral · multi-tenant"
      panel={
        <form onSubmit={(e) => void submit(e)} noValidate>
          <AuthBackLink />
          <h2 className="font-display mb-1.5 text-[2rem] font-semibold tracking-tight text-[#1c1c1c] sm:text-[2.25rem]">
            Create account
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-[#5c5a56]">
            Signup stores your operator identity. A tenant token is required before any live
            Kubernetes data is fetched.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <AuthField
            label="Work email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@wecrew.in"
            autoComplete="email"
            required
          />
          <AuthField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
            required
          />
          <AuthField
            label="Tenant access token"
            type="password"
            value={token}
            onChange={setToken}
            placeholder="Optional now — required for live data"
            autoComplete="off"
          />
          <AuthSubmit disabled={busy || !email || !password} variant="coral">
            {busy ? <AuthSpinner /> : "Create account"}
            {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
          </AuthSubmit>

          <p className="mt-5 text-center text-[13px] text-[#5c5a56]">
            Already provisioned?{" "}
            <Link to="/login" className="font-medium text-brand-coral hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      }
    >
      <p className="max-w-[400px] text-[15px] leading-relaxed text-[#8a8680]">
        Multi-tenant by default: one token, one tenant, no cross-estate inventory.
      </p>
      <AuthFeatures
        items={[
          {
            icon: Gauge,
            title: "Tenant-scoped fetch",
            body: "Stage-1 inventory is requested only after a token for that tenant is bound.",
          },
          {
            icon: FileSearch,
            title: "Evidence stays isolated",
            body: "Logs, RCA, and artefacts inherit the same tenant cookie — never another estate.",
          },
          {
            icon: Lock,
            title: "Read-only console",
            body: "Tokens do not grant shell, secret reads, or autonomous remediation.",
          },
        ]}
      />
    </AuthShell>
  );
}
