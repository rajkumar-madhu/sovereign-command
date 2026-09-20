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
import { bindTenantAccess } from "@/lib/auth-client";
import { rememberOperator } from "@/lib/ops-identity";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Wecrew Ops" },
      {
        name: "description",
        content:
          "Sign in to Wecrew Ops — read-only multi-tenant agent operations for regulated hybrid infrastructure.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Invalid email or password.");
      return;
    }
    rememberOperator(email);
    setBusy(true);
    if (token.trim()) {
      const fail = await bindTenantAccess(email, token.trim());
      setBusy(false);
      if (fail) {
        setError(fail);
        return;
      }
      toast.success("Tenant token bound", {
        description: "Live fetch is scoped to that tenant only.",
      });
    } else {
      setBusy(false);
      toast.message("Account opened without a tenant token", {
        description: "Cluster data stays closed until you bind a token in Settings.",
      });
    }
    void navigate({ to: "/command" });
  }

  return (
    <AuthShell
      title={
        <>
          Evidence before action.{" "}
          <span className="bg-gradient-to-r from-brand-coral to-[#2b4cff] bg-clip-text text-transparent">
            Passports before trust.
          </span>
        </>
      }
      footer="Self-hosted · vendor neutral · multi-tenant"
      panel={
        <form onSubmit={(e) => void submit(e)} noValidate>
          <AuthBackLink />
          <h2 className="font-display mb-1.5 text-[2rem] font-semibold tracking-tight text-[#1c1c1c] sm:text-[2.25rem]">
            Sign in
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-[#5c5a56]">
            A user account is not cluster access. Bind a tenant token to fetch that tenant only.
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
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
          <AuthField
            label="Tenant access token"
            type="password"
            value={token}
            onChange={setToken}
            placeholder="Required for live cluster data"
            autoComplete="off"
          />
          <AuthSubmit disabled={busy || !email || !password} variant="coral">
            {busy ? <AuthSpinner /> : "Sign in"}
            {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
          </AuthSubmit>

          <p className="mt-5 text-center text-[13px] text-[#5c5a56]">
            New here?{" "}
            <Link to="/signup" className="font-medium text-brand-coral hover:underline">
              Create account
            </Link>
          </p>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#8a8680]">
            Tokens are issued per tenant by the platform operator. They do not grant shell,
            secrets, or remediation.
          </p>
        </form>
      }
    >
      <p className="max-w-[400px] text-[15px] leading-relaxed text-[#8a8680]">
        Command centre for multi-tenant agent estates — live posture, passports, and evidence-backed
        RCA for SRE teams.
      </p>
      <AuthFeatures
        items={[
          {
            icon: Gauge,
            title: "Estate command centre",
            body: "Fleet health, incidents, and scoped platform filters in one plane.",
          },
          {
            icon: FileSearch,
            title: "Evidence-backed RCA",
            body: "Hash-verified artefacts and timelines operators can defend in audit.",
          },
          {
            icon: Lock,
            title: "Read-only console",
            body: "No shell, cluster-admin, secret reads, or autonomous remediation.",
          },
        ]}
      />
    </AuthShell>
  );
}
