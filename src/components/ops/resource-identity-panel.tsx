import { Copy, Network, Server } from "lucide-react";
import { toast } from "sonner";
import type { ResourceIdentity } from "@/data/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FieldKey = keyof ResourceIdentity;

const FIELD_ORDER: { key: FieldKey; label: string }[] = [
  { key: "application", label: "Application" },
  { key: "hostname", label: "Hostname" },
  { key: "ipAddress", label: "IP address" },
  { key: "cluster", label: "Cluster" },
  { key: "namespace", label: "Namespace" },
  { key: "pod", label: "Pod" },
  { key: "nodeName", label: "Node" },
  { key: "fqdn", label: "FQDN / endpoint" },
  { key: "region", label: "Region" },
  { key: "role", label: "Role" },
];

function fieldsOf(r: ResourceIdentity) {
  return FIELD_ORDER.filter((f) => {
    const v = r[f.key];
    return typeof v === "string" && v.trim().length > 0;
  }).map((f) => ({ ...f, value: r[f.key]! }));
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`, { description: value });
  } catch {
    toast.error("Copy failed", { description: value });
  }
}

type ResourceIdentityPanelProps = {
  resources: ResourceIdentity[];
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
};

export function ResourceIdentityPanel({
  resources,
  title = "Affected resources",
  description = "Hostname, IP, application, and cluster identity for SRE / platform triage",
  className,
  compact,
}: ResourceIdentityPanelProps) {
  const list = resources.filter((r) => fieldsOf(r).length > 0);
  if (!list.length) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-surface/70",
        compact ? "p-3" : "p-4",
        className,
      )}
      aria-label={title}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Server className="mt-0.5 size-4 shrink-0 text-brand-coral" aria-hidden />
          <div>
            <h3 className={cn("font-semibold tracking-tight", compact ? "text-sm" : "font-display text-base")}>
              {title}
            </h3>
            {!compact && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {list.length} resource{list.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className={cn("grid gap-3", list.length > 1 && "lg:grid-cols-2")}>
        {list.map((r, idx) => {
          const fields = fieldsOf(r);
          const heading =
            r.hostname ?? r.application ?? r.fqdn ?? r.pod ?? `Resource ${idx + 1}`;
          return (
            <article
              key={`${heading}-${idx}`}
              className="overflow-hidden rounded-xl border border-border bg-background/70"
            >
              <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2">
                <Network className="size-3.5 text-muted-foreground" aria-hidden />
                <p className="min-w-0 flex-1 truncate font-mono text-xs font-medium">{heading}</p>
                {r.role ? (
                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {r.role}
                  </span>
                ) : null}
              </div>
              <dl className="divide-y divide-border/60">
                {fields.map((f) => (
                  <div
                    key={f.key}
                    className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="min-w-0 truncate font-mono text-[12px] text-foreground/90" title={f.value}>
                      {f.value}
                    </dd>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Copy ${f.label}`}
                      onClick={() => void copyText(f.label, f.value)}
                    >
                      <Copy className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Compact chip row for lists / command centre cards. */
export function ResourceIdentityChips({
  resource,
  className,
}: {
  resource?: ResourceIdentity | null;
  className?: string;
}) {
  if (!resource) return null;
  const chips = [
    resource.application && { label: "app", value: resource.application },
    resource.hostname && { label: "host", value: resource.hostname },
    resource.ipAddress && { label: "ip", value: resource.ipAddress },
    resource.cluster && { label: "cluster", value: resource.cluster },
    resource.nodeName && { label: "node", value: resource.nodeName },
  ].filter(Boolean) as { label: string; value: string }[];

  if (!chips.length) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((c) => (
        <li
          key={`${c.label}-${c.value}`}
          className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
          title={`${c.label}: ${c.value}`}
        >
          <span className="opacity-60">{c.label}</span> {c.value}
        </li>
      ))}
    </ul>
  );
}
