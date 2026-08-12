import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FileSearch, Gauge, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AuthBackLink,
  AuthDivider,
  AuthFeatures,
  AuthField,
  AuthShell,
  AuthSpinner,
  AuthSubmit,
} from "@/components/auth/auth-shell";
import { isOperatorEmail, MIN_PASSWORD_LENGTH } from "@/data/operator-allowlist";
import {
  createDemoSession,
  createOperatorSession,
  setSession,
} from "@/lib/session";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function enterDemo() {
    setSession(createDemoSession());
    toast.success("Demo session established", {
      description: "Scope: Nordic Federated Bank · production (read-only)",
    });
    void navigate({ to: "/command" });
  }

  function submit(e: React.FormEvent) {
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
    setBusy(true);
    window.setTimeout(() => {
      setSession(createOperatorSession(email));
      setBusy(false);
      toast.success("Read-only session established", {
        description: "Scope: Nordic Federated Bank · production",
      });
      void navigate({ to: "/command" });
    }, 700);
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
        <form onSubmit={submit} noValidate>
          <AuthBackLink />
          <h2 className="font-display mb-1.5 text-[2rem] font-semibold tracking-tight text-[#1c1c1c] sm:text-[2.25rem]">
            Sign in
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-[#5c5a56]">
            Use your operator credentials or continue with the product demo.
          </p>

          <AuthSubmit type="button" variant="coral" onClick={enterDemo}>
            <ShieldCheck className="size-4" aria-hidden />
            Continue with product demo
            <ArrowRight className="size-4" aria-hidden />
          </AuthSubmit>

          <AuthDivider label="Or email" />

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
            autoComplete="current-password"
            required
          />
          <AuthSubmit disabled={busy || !email || !password} variant="secondary">
            {busy ? <AuthSpinner /> : "Sign in with credentials"}
            {!busy && <ArrowRight className="size-4" aria-hidden />}
          </AuthSubmit>

          <p className="mt-5 text-center text-[13px] text-[#5c5a56]">
            New here?{" "}
            <Link to="/signup" className="font-medium text-brand-coral hover:underline">
              Create account
            </Link>
          </p>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#8a8680]">
            Access is limited to allowlisted operators. Contact your platform administrator for
            provisioning.
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
