import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
}) {
  const accent = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    info: "text-primary",
  }[tone];

  return (
    <div className="ops-panel rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {icon && <span className="text-primary/80">{icon}</span>}
      </div>
      <p className={cn("font-display mt-2 text-2xl font-semibold tabular-nums", accent)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}