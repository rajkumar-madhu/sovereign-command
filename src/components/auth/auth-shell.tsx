import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthBrand() {
  return (
    <div className="relative z-10 flex items-center gap-2.5">
      <span
        className="relative grid size-[38px] place-items-center rounded-[11px] shadow-[0_6px_18px_rgba(255,91,46,0.3)]"
        style={{
          background:
            "conic-gradient(from 210deg,#ff5b2e,#2b4cff,#0f7a55,#c9a227,#ff5b2e)",
        }}
      >
        <span className="absolute inset-[2px] rounded-[9px] bg-[#0e1116]" />
        <span className="font-display relative z-[1] text-xl italic text-[#f7f7f4]">W</span>
      </span>
      <span className="font-display text-[22px] tracking-wide text-[#f7f7f4]">
        Wecrew <em className="not-italic text-brand-coral">Ops</em>
      </span>
    </div>
  );
}

export function AuthShell({
  title,
  children,
  footer = "Self-hosted · Kind / K3s · Read-only ops",
  panel,
}: {
  title: ReactNode;
  children: ReactNode;
  footer?: string;
  panel: ReactNode;
}) {
  return (
    <div className="flex h-svh overflow-hidden bg-[#f7f7f4]">
      <aside className="relative hidden w-[min(480px,42vw)] shrink-0 flex-col justify-between overflow-hidden bg-[#0e1116] px-11 py-11 text-[#f7f7f4] lg:flex">
        <div
          className="pointer-events-none absolute -top-[140px] -right-[90px] size-[520px] rounded-full"
          style={{
            background: "radial-gradient(circle,rgba(255,91,46,0.16) 0%,transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-[90px] -left-[70px] size-[360px] rounded-full"
          style={{
            background: "radial-gradient(circle,rgba(43,76,255,0.10) 0%,transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 40%,black 30%,transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 40%,black 30%,transparent 85%)",
          }}
        />
        <AuthBrand />
        <div className="relative z-10 my-9 flex flex-1 flex-col gap-7">
          <h1 className="font-display text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.05] font-normal tracking-tight">
            {title}
          </h1>
          {children}
        </div>
        <p className="relative z-10 font-mono text-[11px] tracking-[0.5px] text-[#6f6a62] uppercase">
          {footer}
        </p>
      </aside>

      <section
        className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-10 sm:px-7 sm:py-14"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,91,46,.06), transparent 60%)",
        }}
      >
        <div className="w-full max-w-[444px] animate-in fade-in slide-in-from-bottom-3 duration-400 pb-10">
          {panel}
        </div>
      </section>
    </div>
  );
}

export function AuthBackLink() {
  return (
    <Link
      to="/"
      className="mb-[18px] inline-flex font-mono text-[11px] tracking-[0.8px] text-[#5c5a56] uppercase hover:text-brand-coral"
    >
      ← Back to home
    </Link>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block font-mono text-[10.5px] font-medium tracking-[1px] text-[#5c5a56] uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-[11px] border border-[#ddd6c8] bg-white px-3.5 py-3 text-[14.5px] text-[#1c1c1c] outline-none transition-[border-color,box-shadow] focus:border-brand-coral focus:shadow-[0_0_0_3px_rgba(255,91,46,0.12)]"
      />
    </label>
  );
}

export function AuthSubmit({
  children,
  disabled,
  type = "submit",
  onClick,
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#0e1116] bg-[#0e1116] px-4 py-3.5 text-[14.5px] font-medium text-[#f7f7f4] transition-all hover:border-brand-coral hover:bg-brand-coral hover:text-white disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AuthDemoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3.5 w-full rounded-full border border-dashed border-[#ddd6c8] px-4 py-2.5 text-[13px] text-[#5c5a56] transition-colors hover:border-brand-coral hover:bg-[rgba(255,91,46,0.06)] hover:text-brand-coral"
    >
      Continue without account (demo)
    </button>
  );
}

export function AuthSpinner() {
  return (
    <span
      className="size-[17px] animate-spin rounded-full border-2 border-[#f7f7f4]/35 border-t-[#f7f7f4]"
      aria-hidden
    />
  );
}
