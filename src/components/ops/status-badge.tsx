import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-primary/10 text-primary border-primary/25",
  neutral: "bg-surface-strong text-muted-foreground border-border",
};

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function toneForStatus(status: string): Tone {
  switch (status) {
    case "active":
    case "healthy":
    case "passed":
    case "verified":
    case "allowed":
    case "approved":
    case "closed":
      return "success";
    case "degraded":
    case "warning":
    case "suspended":
    case "expiring":
    case "approval-required":
    case "pending":
    case "flagged":
    case "anomaly":
    case "investigating":
      return "warning";
    case "quarantined":
    case "terminated":
    case "failed":
    case "invalid":
    case "offline":
    case "denied":
    case "blocked":
    case "rejected":
    case "open":
      return "danger";
    case "rca-ready":
    case "info":
      return "info";
    default:
      return "neutral";
  }
}

export function toneForSeverity(sev: string): Tone {
  if (sev === "P1") return "danger";
  if (sev === "P2") return "warning";
  if (sev === "P3") return "info";
  return "neutral";
}

export function toneForScore(score: number): Tone {
  if (score >= 90) return "success";
  if (score >= 75) return "info";
  if (score >= 60) return "warning";
  return "danger";
}