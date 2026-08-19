import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  bodTone,
  heatTone,
  linkedEyeBodKeys,
  linkedEyeDomainEdges,
  linkedEyeDomainNodes,
  linkedEyeHeatmap,
  linkedEyeIncidents,
  linkedEyeLayerCounts,
  linkedEyeMapPins,
  linkedEyeMonitors,
  linkedEyeOmsGraphs,
  linkedEyeOmsTrend,
  linkedEyeOnboardDevices,
  linkedEyeSites,
  linkedEyeUatUrl,
  monitorTone,
  siteStatusLabel,
  type BodMode,
  type DomainNode,
  type LinkedEyeSite,
  type MonitorStatus,
} from "@/data/linkedeye";

export const Route = createFileRoute("/_shell/linkedeye")({
  head: () => ({
    meta: [
      { title: "LinkedEye · Wecrew Ops" },
      {
        name: "description",
        content:
          "LinkedEye dashboard: India heatmap, site details, BOD/APM/EOD, domain connectivity, onboarding — remediator held.",
      },
    ],
  }),
  component: LinkedEyeDashboard,
});

type ShellTab = "overview" | "bod" | "apm" | "eod" | "oms" | "onboard" | "domain" | "incidents";

const iconBar: Array<{ id: ShellTab; label: string; led: "bod" | "apm" | "eod" | "neutral" }> = [
  { id: "overview", label: "Overview", led: "neutral" },
  { id: "bod", label: "BOD", led: "bod" },
  { id: "apm", label: "APM", led: "apm" },
  { id: "eod", label: "EOD", led: "eod" },
  { id: "oms", label: "Management Console", led: "neutral" },
  { id: "onboard", label: "On-Board Devices", led: "neutral" },
  { id: "domain", label: "Domain", led: "neutral" },
  { id: "incidents", label: "Incident", led: "neutral" },
];

function LinkedEyeDashboard() {
  const [sitename, setSitename] = useState(linkedEyeSites[0]!.sitename);
  const [tab, setTab] = useState<ShellTab>("overview");
  const [detail, setDetail] = useState<DomainNode | LinkedEyeSite | null>(linkedEyeSites[0]!);

  const site = linkedEyeSites.find((s) => s.sitename === sitename) ?? linkedEyeSites[0]!;
  const monitor = linkedEyeMonitors.find((m) => m.sitename === sitename);
  const bodFor = (mode: BodMode) =>
    linkedEyeBodKeys.filter((k) => k.mode === mode && k.key.startsWith(`${sitename}:`));
  const ledOk = (mode: BodMode) =>
    bodFor(mode).length === 0 || bodFor(mode).every((k) => k.overall === "Success");

  const domainNodes = linkedEyeDomainNodes;
  const domainEdges = linkedEyeDomainEdges;

  const hostCritical = useMemo(
    () => linkedEyeMonitors.reduce((n, m) => n + (m.host.find((h) => h.status === "CRITICAL")?.count ?? 0), 0),
    [],
  );

  function selectSite(name: string) {
    const next = linkedEyeSites.find((s) => s.sitename === name);
    setSitename(name);
    setDetail(next ?? null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedEye dashboard"
        description="Same site shell as mirai-Linkedeye-webproject: heatmap, details, domain graph, onboarding. Demo payload — remediator held."
        crumbs={[{ label: "Operate", to: "/command" }, { label: "LinkedEye" }]}
        actions={
          <Button asChild variant="outline">
            <a href={linkedEyeUatUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              Finspot UAT
            </a>
          </Button>
        }
      />
      <SafetyBanner />

      <nav className="ops-panel flex flex-wrap gap-2 rounded-2xl p-3" aria-label="LinkedEye icon bar">
        {iconBar.map((item) => {
          const ok =
            item.led === "bod" ? ledOk("BOD") : item.led === "apm" ? ledOk("ADP") : item.led === "eod" ? ledOk("EOD") : true;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium",
                tab === item.id ? "border-brand-coral bg-brand-coral/10" : "border-border bg-card",
              )}
            >
              <span
                className={cn("size-2.5 rounded-full", ok ? "bg-emerald-500" : "bg-destructive")}
                aria-hidden
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap gap-2">
        {linkedEyeSites.map((s) => (
          <button key={s.sitename} type="button" onClick={() => selectSite(s.sitename)}>
            <StatusPill tone={s.sitename === sitename ? monitorTone(siteStatusLabel(s.status)) : "info"}>
              {s.sitename} · {s.location}
            </StatusPill>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {tab === "overview" && (
            <>
              <section className="ops-panel rounded-2xl p-5" aria-labelledby="heatmap-title">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 id="heatmap-title" className="font-display text-lg font-semibold">
                      Heat-map
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      /dashboard · India jvectormap markers + state scores · click a pin for details
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">maprefresh()</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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
                  <div className="overflow-x-auto">
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
                              <button
                                type="button"
                                className="text-left"
                                onClick={() => row.sitename && selectSite(row.sitename)}
                              >
                                {row.label}
                                {row.sitename ? (
                                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                    {row.sitename}
                                  </span>
                                ) : null}
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
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <LayerCard title="Hardwares" rows={linkedEyeLayerCounts.hardware} />
                <LayerCard title="Soft limits" rows={linkedEyeLayerCounts.software} />
                <LayerCard title="Applications" rows={linkedEyeLayerCounts.application} />
              </div>

              {monitor && (
                <section className="ops-panel rounded-2xl p-5">
                  <h2 className="font-display text-sm font-semibold">Monitoring · {site.sitename}</h2>
                  <p className="mb-3 text-xs text-muted-foreground">
                    gethostandservicecount · host CRITICAL {hostCritical} across estate
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <CountTable title="Hosts" rows={monitor.host} />
                    <CountTable title="Services" rows={monitor.service} />
                  </div>
                </section>
              )}
            </>
          )}

          {tab === "bod" && <BodPanel title="BOD" href="/bod-eodstatus" keys={bodFor("BOD")} />}
          {tab === "apm" && <BodPanel title="APM · adapter" href="/bod-eodstatus/le-adp-status" keys={bodFor("ADP")} />}
          {tab === "eod" && <BodPanel title="EOD" href="/bod-eodstatus/eod" keys={bodFor("EOD")} />}

          {tab === "oms" && (
            <section className="ops-panel rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold">Management console · Noren OMS</h2>
              <p className="text-xs text-muted-foreground">/analytics/dashboard?jsonname=noren-oms.json</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {linkedEyeOmsGraphs.map((g) => (
                  <li key={g} className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {g}
                  </li>
                ))}
              </ul>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={linkedEyeOmsTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="window" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="uniqueOrders" name="Unique Order Count" stroke="var(--primary)" dot={false} />
                    <Line type="monotone" dataKey="uniqueTrades" name="Unique Trade Count" stroke="var(--chart-2)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {tab === "onboard" && (
            <section className="ops-panel rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold">On-Board Devices</h2>
              <p className="text-xs text-muted-foreground">
                /allonboard · DIRECT / GATEWAY monitoring · REUSABLE_AUTOMATION held
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>OS / model</TableHead>
                    <TableHead>Monitoring type</TableHead>
                    <TableHead>Automation</TableHead>
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
                        <TableCell>
                          <StatusPill tone="warning">
                            {d.reusableAutomation ? "flag on" : "flag off"} · held
                          </StatusPill>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </section>
          )}

          {tab === "domain" && (
            <section className="ops-panel rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold">Domain · connectivity</h2>
              <p className="text-xs text-muted-foreground">
                /switch · getneo4jnodes layers fw → swi → s_sw → srv/app · click a node for details
              </p>
              <svg viewBox="0 0 100 100" className="mt-4 h-[22rem] w-full rounded-xl border border-border bg-card">
                {domainEdges.map((e) => {
                  const a = domainNodes.find((n) => n.id === e.from);
                  const b = domainNodes.find((n) => n.id === e.to);
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
                {domainNodes.map((n) => (
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
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                flow: Exchange WAN → fortigate → core/access switch → OMS / payments-auth
              </p>
            </section>
          )}

          {tab === "incidents" && (
            <section className="ops-panel rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold">Incident Status</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedEyeIncidents
                    .filter((i) => i.site_name === sitename)
                    .map((inc) => (
                      <TableRow key={inc.number}>
                        <TableCell className="font-mono text-xs">
                          {inc.number === "INC0000042" ? (
                            <Link className="underline" to="/incidents/$incidentId" params={{ incidentId: "inc-clb-01" }}>
                              {inc.number}
                            </Link>
                          ) : (
                            inc.number
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={inc.priority === "P1" ? "danger" : "warning"}>{inc.priority}</StatusPill>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inc.state}</TableCell>
                        <TableCell>{inc.short_description}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </section>
          )}
        </div>

        <aside className="ops-panel h-fit space-y-3 rounded-2xl p-4 text-sm" aria-label="Details">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Details</p>
          {detail && "layer" in detail ? (
            <NodeDetails node={detail} />
          ) : detail && "location" in detail ? (
            <SiteDetails site={detail} />
          ) : (
            <p className="text-muted-foreground">Select a site pin or domain node.</p>
          )}
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

function CountTable({ title, rows }: { title: string; rows: Array<{ status: MonitorStatus; count: number }> }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium">{title}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>monitor_status</TableHead>
            <TableHead>count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.status}>
              <TableCell>
                <StatusPill tone={monitorTone(r.status)}>{r.status}</StatusPill>
              </TableCell>
              <TableCell className="font-mono">{r.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BodPanel({ title, href, keys }: { title: string; href: string; keys: typeof linkedEyeBodKeys }) {
  return (
    <section className="ops-panel rounded-2xl p-5">
      <h2 className="font-display text-sm font-semibold">{title}</h2>
      <p className="font-mono text-xs text-muted-foreground">{href} · getbodeodkeys</p>
      {keys.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No Redis keys for this site and mode.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {keys.map((k) => (
            <li key={k.key} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{k.key}</span>
                <StatusPill tone={k.overall === "Success" ? "success" : "danger"}>{k.overall}</StatusPill>
              </div>
              <ul className="mt-2 space-y-1">
                {k.key_data.data.map((row) => (
                  <li key={row.segment} className="flex items-center justify-between gap-2 text-sm">
                    <span>{row.segment}</span>
                    <StatusPill tone={bodTone(row.status)}>
                      {row.status} · {row.isSuccess ? "ok" : "fail"}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
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
      <div>
        <dt className="text-muted-foreground">lat,lng</dt>
        <dd>
          {site.lat}, {site.lng}
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
