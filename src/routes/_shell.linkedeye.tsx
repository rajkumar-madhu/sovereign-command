import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ops/page-header";
import { StatusPill } from "@/components/ops/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  heatTone,
  linkedEyeDomainEdges,
  linkedEyeDomainNodes,
  linkedEyeHeatmap,
  linkedEyeLayerCounts,
  linkedEyeMapPins,
  linkedEyeOnboardDevices,
  linkedEyeSites,
  monitorTone,
  siteStatusLabel,
  type DomainNode,
  type LinkedEyeSite,
  type MonitorStatus,
} from "@/data/linkedeye";

export const Route = createFileRoute("/_shell/linkedeye")({
  head: () => ({
    meta: [
      { title: "LinkedEye · Wecrew Ops" },
      { name: "description", content: "LinkedEye heatmap, details, domain connectivity, and onboarding." },
    ],
  }),
  component: LinkedEyeDashboard,
});

type ShellTab = "overview" | "onboard" | "domain";

function LinkedEyeDashboard() {
  const [sitename, setSitename] = useState(linkedEyeSites[0]!.sitename);
  const [tab, setTab] = useState<ShellTab>("overview");
  const [detail, setDetail] = useState<DomainNode | LinkedEyeSite | null>(linkedEyeSites[0]!);
  const site = linkedEyeSites.find((s) => s.sitename === sitename) ?? linkedEyeSites[0]!;

  function selectSite(name: string) {
    setSitename(name);
    setDetail(linkedEyeSites.find((s) => s.sitename === name) ?? null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedEye dashboard"
        description="Heat-map, site details, domain connectivity, onboarding."
        crumbs={[{ label: "Operate", to: "/command" }, { label: "LinkedEye" }]}
      />

      <nav className="ops-panel flex flex-wrap gap-2 rounded-2xl p-3" aria-label="LinkedEye">
        {(
          [
            ["overview", "Overview"],
            ["onboard", "On-Board Devices"],
            ["domain", "Domain"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-medium",
              tab === id ? "border-brand-coral bg-brand-coral/10" : "border-border bg-card",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {tab === "overview" && (
            <>
              <section className="ops-panel rounded-2xl p-5" aria-labelledby="heatmap-title">
                <h2 id="heatmap-title" className="font-display text-lg font-semibold">
                  Heat-map
                </h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-[#1a1410]">
                    <IndiaOutline />
                    {linkedEyeMapPins.map((pin) => (
                      <button
                        key={pin.sitename}
                        type="button"
                        title={pin.sitename}
                        onClick={() => selectSite(pin.sitename)}
                        className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
                        style={{
                          left: `${Math.min(88, Math.max(12, pin.x))}%`,
                          top: `${Math.min(88, Math.max(12, pin.y))}%`,
                          background:
                            pin.status === 0 ? "#ff3d57" : pin.status === 1 ? "#e99123" : "#16d39a",
                        }}
                      />
                    ))}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-2">State</th>
                        <th className="pb-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedEyeHeatmap.map((row) => (
                        <tr key={row.state} className="border-t border-border/80">
                          <td className="py-2 pr-3">
                            <button type="button" className="text-left" onClick={() => selectSite(row.sitename)}>
                              {row.label}{" "}
                              <span className="font-mono text-[10px] text-muted-foreground">{row.sitename}</span>
                            </button>
                          </td>
                          <td className="py-2">
                            <span
                              className={cn(
                                "inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                                heatTone(row.score),
                              )}
                            >
                              {row.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <LayerCard title="Hardwares" rows={linkedEyeLayerCounts.hardware} />
                <LayerCard title="Soft limits" rows={linkedEyeLayerCounts.software} />
                <LayerCard title="Applications" rows={linkedEyeLayerCounts.application} />
              </div>
            </>
          )}

          {tab === "onboard" && (
            <section className="ops-panel rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold">On-Board Devices · {site.sitename}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>OS / model</TableHead>
                    <TableHead>Monitoring</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedEyeOnboardDevices
                    .filter((d) => d.sitename === sitename)
                    .map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.ipaddress}</TableCell>
                        <TableCell>{d.ostype}</TableCell>
                        <TableCell className="font-mono text-xs">{d.monitoringType}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </section>
          )}

          {tab === "domain" && (
            <section className="ops-panel rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold">Domain</h2>
              <svg viewBox="0 0 100 100" className="mt-4 h-[22rem] w-full rounded-xl border border-border bg-card">
                {linkedEyeDomainEdges.map((e) => {
                  const a = linkedEyeDomainNodes.find((n) => n.id === e.from);
                  const b = linkedEyeDomainNodes.find((n) => n.id === e.to);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={`${e.from}-${e.to}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="currentColor"
                      className="text-muted-foreground/50"
                      strokeWidth={0.6}
                    />
                  );
                })}
                {linkedEyeDomainNodes.map((n) => (
                  <g key={n.id} className="cursor-pointer" onClick={() => setDetail(n)}>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={4.2}
                      fill={
                        n.monitor_status === "CRITICAL"
                          ? "#ff3d57"
                          : n.monitor_status === "WARNING"
                            ? "#e99123"
                            : "#16d39a"
                      }
                    />
                    <text x={n.x} y={n.y + 8} textAnchor="middle" fontSize={3.2} fill="currentColor">
                      {n.name}
                    </text>
                  </g>
                ))}
              </svg>
            </section>
          )}
        </div>

        <aside className="ops-panel h-fit space-y-3 rounded-2xl p-4 text-sm" aria-label="Details">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Details</p>
          {detail && "layer" in detail ? <NodeDetails node={detail} /> : detail ? <SiteDetails site={detail} /> : null}
        </aside>
      </div>
    </div>
  );
}

function IndiaOutline() {
  return (
    <svg viewBox="0 0 100 120" className="absolute inset-0 h-full w-full text-[#3a2a22]" aria-hidden>
      <path
        fill="currentColor"
        d="M48 8 L62 14 L70 28 L78 36 L74 52 L80 64 L72 78 L64 96 L52 110 L40 104 L32 88 L22 70 L18 52 L24 34 L36 18 Z"
        opacity={0.55}
      />
    </svg>
  );
}

function LayerCard({ title, rows }: { title: string; rows: Array<{ name: string; count: number; status: MonitorStatus }> }) {
  return (
    <div className="ops-panel rounded-2xl p-4">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between text-sm">
            <span>{r.name}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs">{r.count}</span>
              <StatusPill tone={monitorTone(r.status)}>{r.status}</StatusPill>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SiteDetails({ site }: { site: LinkedEyeSite }) {
  return (
    <dl className="space-y-2 font-mono text-xs">
      <div>
        <dt className="text-muted-foreground">sitename</dt>
        <dd>{site.sitename}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">location</dt>
        <dd>{site.location}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">environment</dt>
        <dd>{site.environment}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">status</dt>
        <dd>
          <StatusPill tone={monitorTone(siteStatusLabel(site.status))}>{siteStatusLabel(site.status)}</StatusPill>
        </dd>
      </div>
    </dl>
  );
}

function NodeDetails({ node }: { node: DomainNode }) {
  return (
    <dl className="space-y-2 font-mono text-xs">
      <div>
        <dt className="text-muted-foreground">name</dt>
        <dd>{node.name}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">layer</dt>
        <dd>{node.layer}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">ip</dt>
        <dd>{node.ip}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">product_model</dt>
        <dd>{node.product_model}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">monitor_status</dt>
        <dd>
          <StatusPill tone={monitorTone(node.monitor_status)}>{node.monitor_status}</StatusPill>
        </dd>
      </div>
    </dl>
  );
}
