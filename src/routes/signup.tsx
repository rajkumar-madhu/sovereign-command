import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AuthBackLink,
  AuthDemoButton,
  AuthField,
  AuthShell,
  AuthSpinner,
  AuthSubmit,
} from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account · Sovereign Ops" },
      {
        name: "description",
        content:
          "Create a Sovereign Ops account — vendor-neutral agent operations for regulated hybrid estates.",
      },
    ],
  }),
  component: SignUpPage,
});

const WORKSPACES = ["Platform / SRE", "SOC / Security", "ITSM / L2", "Compliance"] as const;

function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    workspace: "Platform / SRE" as string,
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

  function enterDemo() {
    toast.success("Demo session established", {
      description: "Scope: Nordic Federated Bank · production (read-only)",
    });
    void navigate({ to: "/command" });
  }

  function finish() {
    setBusy(true);
    setStep(3);
    window.setTimeout(() => {
      setBusy(false);
      toast.success("Account ready", {
        description: `${form.workspace} · read-only operations session`,
      });
      void navigate({ to: "/command" });
    }, 900);
  }

  return (
    <AuthShell
      title={
        <>
          Your agent estate
          <br />
          <em className="text-brand-coral italic">command plane,</em> ready.
        </>
      }
      panel={
        <div>
          <AuthBackLink />
          <h2 className="font-display mb-1.5 text-4xl font-normal tracking-tight text-[#1c1c1c]">
            Create your account
          </h2>
          <p className="mb-7 text-[14.5px] font-light text-[#5c5a56]">
            Already have one?{" "}
            <Link to="/login" className="font-medium text-brand-coral hover:underline">
              Sign in →
            </Link>
          </p>

          <div className="mb-7 flex items-center">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className={cn("flex items-center", i === 0 ? "flex-none" : "flex-1")}>
                {i > 0 && (
                  <div
                    className={cn(
                      "mx-2.5 h-px min-w-6 flex-1",
                      step > i ? "bg-brand-coral" : "bg-[#ddd6c8]",
                    )}
                  />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-semibold",
                      step > n
                        ? "bg-brand-coral text-white"
                        : step === n
                          ? "bg-[#0e1116] text-[#f7f7f4]"
                          : "border border-[#ddd6c8] bg-[#f0eee8] text-[#8a8680]",
                    )}
                  >
                    {step > n ? "✓" : n}
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[10.5px] tracking-[1px] uppercase",
                      step >= n ? "font-medium text-[#1c1c1c]" : "text-[#8a8680]",
                    )}
                  >
                    {n === 1 ? "Account" : n === 2 ? "Workspace" : "Done"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-300">
              <div className="mb-0 grid grid-cols-2 gap-3">
                <AuthField
                  label="First name"
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                  placeholder="Raj"
                  autoComplete="given-name"
                />
                <AuthField
                  label="Last name"
                  value={form.lastName}
                  onChange={(v) => set("lastName", v)}
                  placeholder="Madhu"
                  autoComplete="family-name"
                />
              </div>
              <AuthField
                label="Work email"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="you@wecrew.in"
                autoComplete="email"
              />
              <AuthField
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => set("password", v)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
              <div className="mt-2 mb-4 flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <i
                    key={i}
                    className={cn(
                      "h-[3px] flex-1 rounded-sm",
                      strength >= i ? "bg-brand-coral" : "bg-[#ddd6c8]",
                    )}
                  />
                ))}
              </div>
              <AuthSubmit
                type="button"
                disabled={!form.email.includes("@") || form.password.length < 6}
                onClick={() => setStep(2)}
              >
                Continue →
              </AuthSubmit>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-3 duration-300">
              <AuthField
                label="Workspace name"
                value={form.workspace}
                onChange={(v) => set("workspace", v)}
                placeholder="Wecrew Ops"
              />
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                {WORKSPACES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => set("workspace", ind)}
                    className={cn(
                      "rounded-[11px] border px-3.5 py-3 text-left text-sm transition-all",
                      form.workspace === ind
                        ? "border-brand-coral bg-[rgba(255,91,46,0.06)] font-medium text-brand-coral"
                        : "border-[#ddd6c8] bg-white text-[#5c5a56] hover:border-brand-coral hover:text-brand-coral",
                    )}
                  >
                    {ind}
                  </button>
                ))}
              </div>
              <AuthSubmit type="button" disabled={busy} onClick={finish}>
                {busy ? <AuthSpinner /> : "Create account →"}
              </AuthSubmit>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-2.5 w-full rounded-full border border-[#ddd6c8] px-4 py-3 text-[#5c5a56] transition-colors hover:border-[#0e1116] hover:text-[#0e1116]"
              >
                ← Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-6 flex size-[78px] items-center justify-center rounded-full border border-[rgba(255,91,46,0.3)] bg-[rgba(255,91,46,0.08)]">
                <svg viewBox="0 0 24 24" className="size-[34px] fill-none stroke-brand-coral stroke-2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display mb-3 text-3xl font-normal text-[#1c1c1c]">You&apos;re in</h3>
              <p className="text-[#5c5a56]">Opening Sovereign Command Centre…</p>
            </div>
          )}

          {step < 3 && <AuthDemoButton onClick={enterDemo} />}
          <p className="mt-4 text-center font-mono text-[10.5px] leading-relaxed tracking-wide text-[#8a8680]">
            By continuing you agree to Wecrew terms for this internal stack.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {[
          ["01", "See the whole agent estate", "Fleet health, budgets, and blocked actions"],
          ["02", "Open an agent passport", "Identity, tools, and policy citations"],
          ["03", "Follow evidence-backed RCA", "Incidents with packs you can take to audit"],
          ["04", "Stay strictly read-only", "No shell, no secret reads, no remediations"],
        ].map(([n, t, s]) => (
          <div key={n} className="flex items-start gap-3.5">
            <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-[rgba(255,91,46,0.28)] bg-[rgba(255,91,46,0.12)] font-mono text-[11px] font-semibold text-brand-coral">
              {n}
            </div>
            <div>
              <div className="text-[15px] font-medium text-[#faf7f0]">{t}</div>
              <div className="mt-0.5 text-[13px] text-[#6f6a62]">{s}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-[rgba(15,122,85,0.3)] bg-[rgba(15,122,85,0.12)] px-4 py-3.5">
        <i className="mt-1.5 size-2 shrink-0 rounded-full bg-[#0f7a55] shadow-[0_0_0_4px_rgba(15,122,85,0.18)]" />
        <div>
          <div className="text-[13.5px] font-medium text-[#9fe0c0]">
            Self-hosted on your cluster — no SaaS lock-in
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-[rgba(159,224,192,0.6)]">
            sovereign.ops.wecrew.in · enterprise agent ops
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
