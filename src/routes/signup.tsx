import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bot, FileSearch, Lock, ShieldCheck } from "lucide-react";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account · Wecrew Ops" },
      {
        name: "description",
        content:
          "Create a Wecrew Ops account — vendor-neutral agent operations for regulated hybrid estates.",
      },
    ],
  }),
  component: SignUpPage,
});

const ROLES = [
  { id: "sre", label: "Platform / SRE" },
  { id: "soc", label: "SOC / Security" },
  { id: "itsm", label: "ITSM / L2" },
  { id: "compliance", label: "Compliance" },
] as const;

function SignUpPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Platform / SRE",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const strength = (() => {
    const p = form.password || "";
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const canSubmit =
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    form.email.includes("@") &&
    form.password.length >= MIN_PASSWORD_LENGTH;

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
    if (!canSubmit) {
      setError(
        `Enter your name, a work email, and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (!isOperatorEmail(form.email)) {
      setError(
        "This email is not on the operator allowlist. Contact your platform administrator.",
      );
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setSession(createOperatorSession(form.email));
      setBusy(false);
      toast.success("Account ready", {
        description: `${form.role} · read-only operations session`,
      });
      void navigate({ to: "/command" });
    }, 800);
  }

  return (
    <AuthShell
      title={
        <>
          Passports before trust.{" "}
          <span className="bg-gradient-to-r from-brand-coral to-[#2b4cff] bg-clip-text text-transparent">
            Evidence before action.
          </span>
        </>
      }
      footer="Self-hosted · vendor neutral · multi-tenant"
      panel={
        <form onSubmit={submit} noValidate>
          <AuthBackLink />
          <h2 className="font-display mb-1.5 text-[2rem] font-semibold tracking-tight text-[#1c1c1c] sm:text-[2.25rem]">
            Create account
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-[#5c5a56]">
            Provision a read-only operator seat for your estate — or explore the live demo first.
          </p>

          <AuthSubmit type="button" variant="coral" onClick={enterDemo}>
            <ShieldCheck className="size-4" aria-hidden />
            Continue with product demo
            <ArrowRight className="size-4" aria-hidden />
          </AuthSubmit>

          <AuthDivider label="Or create with email" />

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <AuthField
              label="First name"
              value={form.firstName}
              onChange={(v) => set("firstName", v)}
              placeholder="Raj"
              autoComplete="given-name"
              required
            />
            <AuthField
              label="Last name"
              value={form.lastName}
              onChange={(v) => set("lastName", v)}
              placeholder="Madhu"
              autoComplete="family-name"
              required
            />
          </div>
          <AuthField
            label="Work email"
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="you@wecrew.in"
            autoComplete="email"
            required
          />
          <AuthField
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => set("password", v)}
            placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
            required
          />
          <div className="-mt-2 mb-4 flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <i
                key={i}
                className={cn(
                  "h-[3px] flex-1 rounded-sm transition-colors",
                  strength >= i ? "bg-brand-coral" : "bg-[#e8e6e0]",
                )}
              />
            ))}
          </div>

          <fieldset className="mb-5">
            <legend className="mb-2 text-[13px] font-medium text-[#1c1c1c]">Operator role</legend>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => set("role", role.label)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-[13px] transition-all",
                    form.role === role.label
                      ? "border-brand-coral bg-[rgba(255,91,46,0.06)] font-medium text-brand-coral"
                      : "border-[#ddd6c8] bg-white text-[#5c5a56] hover:border-[#c9c2b4]",
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </fieldset>

          <AuthSubmit disabled={busy || !canSubmit} variant="primary">
            {busy ? <AuthSpinner /> : "Create account"}
            {!busy && <ArrowRight className="size-4" aria-hidden />}
          </AuthSubmit>

          <p className="mt-5 text-center text-[13px] text-[#5c5a56]">
            Already provisioned?{" "}
            <Link to="/login" className="font-medium text-brand-coral hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#8a8680]">
            Access is limited to allowlisted operators. Contact your platform administrator for
            provisioning. Console remains read-only.
          </p>
        </form>
      }
    >
      <p className="max-w-[400px] text-[15px] leading-relaxed text-[#8a8680]">
        Mission control for multi-tenant agent estates — passports, correlated evidence, and
        governance for SRE and security teams.
      </p>
      <AuthFeatures
        items={[
          {
            icon: Bot,
            title: "Agent passports first",
            body: "Signed identity, budgets, and blocked actions before any investigation starts.",
          },
          {
            icon: FileSearch,
            title: "Evidence before action",
            body: "Hash-verified artefacts and RCA packages operators can take to audit.",
          },
          {
            icon: Lock,
            title: "Read-only by design",
            body: "No shell, cluster-admin, secret reads, or autonomous remediation from this UI.",
          },
        ]}
      />
    </AuthShell>
  );
}
