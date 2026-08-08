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
    toast.success("Demo session established", {
      description: "Scope: Nordic Federated Bank · production (read-only)",
    });
    void navigate({ to: "/command" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid work email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
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
          Welcome back
          <br />
          to the <em className="text-brand-coral italic">console.</em>
        </>
      }
      panel={
        <form onSubmit={submit} noValidate>
          <AuthBackLink />
          <h2 className="font-display mb-1.5 text-4xl font-normal tracking-tight text-[#1c1c1c]">
            Sign in
          </h2>
          <p className="mb-7 text-[14.5px] font-light text-[#5c5a56]">
            New here?{" "}
            <Link to="/signup" className="font-medium text-brand-coral hover:underline">
              Create account →
            </Link>
          </p>

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
          {error && <p className="my-2.5 text-xs text-red-600">{error}</p>}
          <AuthSubmit disabled={busy || !email || !password}>
            {busy ? <AuthSpinner /> : "Sign in →"}
          </AuthSubmit>
          <AuthDemoButton onClick={enterDemo} />
          <p className="mt-4 text-center font-mono text-[10.5px] tracking-wide text-[#8a8680]">
            Protected internal console · Wecrew Ops
          </p>
        </form>
      }
    >
      <p className="max-w-[360px] text-sm leading-relaxed font-light text-[#6f6a62]">
        Sign in to open the command centre, inspect agent passports, and follow
        evidence-backed RCA — strictly read-only.
      </p>
      <div className="mt-2 overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.03]">
        <div className="flex gap-1.5 border-b border-white/10 bg-black/25 px-3.5 py-2.5">
          <i className="block size-2 rounded-full bg-brand-coral" />
          <i className="block size-2 rounded-full bg-[#2b4cff]" />
          <i className="block size-2 rounded-full bg-[#0f7a55]" />
        </div>
        <div className="flex gap-2 p-4">
          {[
            ["Open incidents", "7", "−12%"],
            ["Active agents", "30", "fleet"],
            ["Evidence packs", "94%", "cited"],
          ].map(([l, v, t]) => (
            <div
              key={l}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5"
            >
              <div className="mb-0.5 font-mono text-[9px] tracking-wide text-[#6f6a62] uppercase">
                {l}
              </div>
              <div className="text-lg tracking-tight text-[#faf7f0]">{v}</div>
              <div className="mt-0.5 font-mono text-[9px] text-[#0f7a55]">{t}</div>
            </div>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
