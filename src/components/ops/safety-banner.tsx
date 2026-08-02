import { ShieldCheck } from "lucide-react";

const GUARDS = [
  "No shell execution",
  "No cluster-admin",
  "No secret reads",
  "No database writes",
  "No firewall changes",
  "No autonomous remediation",
];

export function SafetyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      aria-label="Read-only safety guarantees"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-success">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Read-only Agent OS
      </span>
      {!compact && (
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {GUARDS.map((g) => (
            <li
              key={g}
              className="rounded-full border border-border bg-card px-2 py-0.5 whitespace-nowrap"
            >
              {g}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}