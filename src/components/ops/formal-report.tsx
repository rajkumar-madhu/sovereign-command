import type { ReactNode } from "react";
import { StatusPill } from "@/components/ops/status-badge";
import type { LiveRcaCheck } from "@/lib/live-rca";

export function ReportSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ops-panel rounded-2xl p-5 md:p-6" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-display text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function ReportFields({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((f) => (
        <div key={f.label} className="rounded-xl border border-border/80 bg-surface/50 px-3 py-2.5">
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {f.label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ReportPre({ children }: { children: string }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#0e1116] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#e8e4dc]">
      {children}
    </pre>
  );
}

export function ReportChecks({ items }: { items: LiveRcaCheck[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-sm">
          <StatusPill tone={item.ok ? "success" : "warning"}>{item.ok ? "pass" : "gap"}</StatusPill>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-border/60">
              {row.map((cell, i) => (
                <td key={`${headers[i]}-${cell}`} className="py-2 pr-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
