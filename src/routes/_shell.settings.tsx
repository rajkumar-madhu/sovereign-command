import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, KeyRound, Settings2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { useOps } from "@/lib/ops-context";
import { tenants } from "@/data/seed";
import type { EnvName } from "@/data/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Sovereign Agentic Operations OS" },
      {
        name: "description",
        content:
          "Tenant environment preferences, token and cost budget defaults, and role-based access controls for the read-only Agent OS.",
      },
      { property: "og:title", content: "Settings · Sovereign Agentic Operations OS" },
      {
        property: "og:description",
        content: "Configure default environments, budget guardrails and RBAC for each tenant workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const ENVIRONMENTS: Array<{ value: EnvName; label: string }> = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "dev", label: "Development" },
  { value: "dr", label: "Disaster recovery" },
];

interface EnvPrefs {
  defaultEnv: EnvName;
  investigationEnv: EnvName;
  evidenceRetentionDays: number;
  requireStepUp: boolean;
  maskSecretsInEvidence: boolean;
  autoOpenIncidentWorkspace: boolean;
}

interface RoleRow {
  id: string;
  role: string;
  members: number;
  scope: string;
  permissions: string[];
  canApprove: boolean;
  canRunInvestigations: boolean;
  canExportEvidence: boolean;
  canEditPolicies: boolean;
}

const initialRoles: RoleRow[] = [
  {
    id: "role-platform-sre",
    role: "Platform SRE",
    members: 24,
    scope: "All tenants · read-only",
    permissions: ["agents:read", "incidents:read", "evidence:read"],
    canApprove: false,
    canRunInvestigations: true,
    canExportEvidence: true,
    canEditPolicies: false,
  },
  {
    id: "role-incident-lead",
    role: "Incident Lead",
    members: 9,
    scope: "Assigned tenants",
    permissions: ["incidents:read", "investigations:start", "rca:publish"],
    canApprove: true,
    canRunInvestigations: true,
    canExportEvidence: true,
    canEditPolicies: false,
  },
  {
    id: "role-security-eng",
    role: "Security Engineering",
    members: 11,
    scope: "All tenants · SOC + policy",
    permissions: ["soc:read", "tools:review", "policies:write"],
    canApprove: true,
    canRunInvestigations: true,
    canExportEvidence: true,
    canEditPolicies: true,
  },
  {
    id: "role-dba",
    role: "Database Authority (DBA)",
    members: 6,
    scope: "Data-tier approvals only",
    permissions: ["db:telemetry:read", "approvals:db"],
    canApprove: true,
    canRunInvestigations: false,
    canExportEvidence: false,
    canEditPolicies: false,
  },
  {
    id: "role-finops",
    role: "FinOps Analyst",
    members: 5,
    scope: "Token & cost domain",
    permissions: ["cost:read", "budgets:propose"],
    canApprove: false,
    canRunInvestigations: false,
    canExportEvidence: false,
    canEditPolicies: false,
  },
  {
    id: "role-auditor",
    role: "External Auditor",
    members: 3,
    scope: "Audit trail · time-boxed",
    permissions: ["audit:read", "evidence:read"],
    canApprove: false,
    canRunInvestigations: false,
    canExportEvidence: true,
    canEditPolicies: false,
  },
];

function useLiveSessionCount(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => Math.max(8, Math.min(96, Math.round(v + (Math.random() - 0.45) * 4))));
    }, 2100);
    return () => window.clearInterval(id);
  }, []);
  return n;
}

function SettingsPage() {
  const { tenantId, setTenantId, budgets, setBudget } = useOps();
  const [prefs, setPrefs] = useState<Record<string, EnvPrefs>>({});
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [warnPct, setWarnPct] = useState(75);
  const [hardStopPct, setHardStopPct] = useState(95);
  const [maxStepsDefault, setMaxStepsDefault] = useState("24");
  const [tokenCeiling, setTokenCeiling] = useState("2500000");

  const tenant = tenants.find((t) => t.id === tenantId) ?? tenants[0]!;
  const current: EnvPrefs = prefs[tenant.id] ?? {
    defaultEnv: "production",
    investigationEnv: "production",
    evidenceRetentionDays: 400,
    requireStepUp: true,
    maskSecretsInEvidence: true,
    autoOpenIncidentWorkspace: true,
  };

  function patchPrefs(patch: Partial<EnvPrefs>) {
    setPrefs((prev) => ({ ...prev, [tenant.id]: { ...current, ...patch } }));
  }

  const budget = budgets[tenant.id] ?? 0;
  const approvers = useMemo(() => roles.filter((r) => r.canApprove).length, [roles]);
  const totalMembers = useMemo(() => roles.reduce((sum, r) => sum + r.members, 0), [roles]);
  const liveSessions = useLiveSessionCount(22);

  function toggleRole(
    id: string,
    key: keyof Pick<
      RoleRow,
      "canApprove" | "canRunInvestigations" | "canExportEvidence" | "canEditPolicies"
    >,
  ) {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [key]: !r[key] };
        toast.success(`${r.role} updated`, {
          description: `${key} is now ${next[key] ? "granted" : "revoked"} (simulated — no identity provider is mutated).`,
        });
        return next;
      }),
    );
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Settings pulse"
        className="command-pulse relative overflow-hidden rounded-2xl border border-border/70"
      >
        <div className="pointer-events-none absolute inset-0 silicon-circuit opacity-[0.5]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-primary/28 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-6 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-xl space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-coral">
              Govern · workspace
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-sidebar-accent-foreground md:text-3xl">
              Settings
            </h1>
            <p className="text-sm leading-relaxed text-sidebar-foreground/70">
              Environment defaults, budget guardrails and RBAC for each tenant workspace. All changes
              are simulated in-session and written to the audit trail.
            </p>
            <Button
              className="bg-sidebar-accent-foreground text-brand-ink hover:bg-white"
              onClick={() =>
                toast.success("Configuration snapshot saved", {
                  description: `${tenant.name} preferences recorded with a correlation ID for audit.`,
                })
              }
            >
              <Settings2 className="size-4" aria-hidden="true" />
              Save configuration
            </Button>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Tenants", value: tenants.length, hint: "workspaces" },
              {
                label: "Budget",
                value: `$${(budget / 1000).toFixed(0)}k`,
                hint: tenant.name.split(" ")[0],
              },
              { label: "Roles", value: roles.length, hint: `${totalMembers} members` },
              { label: "Approvers", value: approvers, hint: "dual-ctrl" },
              {
                label: "Sessions",
                value: liveSessions,
                hint: "live",
                live: true,
              },
              {
                label: "Retention",
                value: current.evidenceRetentionDays,
                unit: "d",
                hint: "evidence",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent/70 px-3 py-2.5 backdrop-blur"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">
                  {s.label}
                </p>
                <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-sidebar-accent-foreground">
                  {s.live && (
                    <span className="mr-1.5 inline-flex size-1.5 animate-pulse rounded-full bg-brand-coral align-middle" />
                  )}
                  {s.value}
                  {s.unit ? (
                    <span className="ml-0.5 text-sm font-medium text-sidebar-foreground/55">{s.unit}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-sidebar-foreground/50">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        title="Workspace configuration"
        description="Preferences below apply to the selected tenant only — never mutate the upstream IdP."
        crumbs={[{ label: "Govern", to: "/command" }, { label: "Settings" }]}
      />
      <SafetyBanner compact />

      <section className="ops-panel rounded-2xl p-5" aria-label="Tenant scope">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-brand-coral" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-semibold">Tenant scope</h2>
              <p className="text-xs text-muted-foreground">
                Settings below apply to the selected tenant workspace only
              </p>
            </div>
          </div>
          <Select value={tenant.id} onValueChange={setTenantId}>
            <SelectTrigger className="w-full bg-surface sm:w-72" aria-label="Select tenant workspace">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.residency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <Tabs defaultValue="environments" className="space-y-4">
        <TabsList className="bg-surface">
          <TabsTrigger value="environments">Environment preferences</TabsTrigger>
          <TabsTrigger value="budgets">Budget defaults</TabsTrigger>
          <TabsTrigger value="access">Access control</TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="mt-0">
          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Environment preferences">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <Settings2 className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">
                  Environment preferences · {tenant.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Default console environment and evidence handling
                </p>
              </div>
            </div>
            <div className="space-y-6 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-env">Default console environment</Label>
                  <Select
                    value={current.defaultEnv}
                    onValueChange={(v) => patchPrefs({ defaultEnv: v as EnvName })}
                  >
                    <SelectTrigger id="default-env" className="bg-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Applied to the top-bar environment selector on sign-in.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-env">Investigation default environment</Label>
                  <Select
                    value={current.investigationEnv}
                    onValueChange={(v) => patchPrefs({ investigationEnv: v as EnvName })}
                  >
                    <SelectTrigger id="inv-env" className="bg-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Agents collect evidence from this environment unless overridden.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention">Evidence retention (days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    min={90}
                    max={2555}
                    className="bg-surface"
                    value={current.evidenceRetentionDays}
                    onChange={(e) =>
                      patchPrefs({ evidenceRetentionDays: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Residency: {tenant.residency} · {tenant.region}. Minimum 90 days for regulated
                    tenants.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-steps">Default agent max steps</Label>
                  <Input
                    id="max-steps"
                    type="number"
                    min={4}
                    max={100}
                    className="bg-surface"
                    value={maxStepsDefault}
                    onChange={(e) => setMaxStepsDefault(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hard stop for reasoning loops across new agent passports.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {[
                  {
                    key: "requireStepUp" as const,
                    title: "Require step-up authentication for production scope",
                    body: "Operators re-authenticate before viewing production evidence for this tenant.",
                  },
                  {
                    key: "maskSecretsInEvidence" as const,
                    title: "Mask secret-shaped strings in captured evidence",
                    body: "Tokens, keys and connection strings are redacted before evidence is stored.",
                  },
                  {
                    key: "autoOpenIncidentWorkspace" as const,
                    title: "Open incident workspace when an investigation starts",
                    body: "Navigates straight to the live timeline after a Supervisor dispatch.",
                  },
                ].map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface/40 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.body}</p>
                    </div>
                    <Switch
                      checked={current[row.key]}
                      aria-label={row.title}
                      onCheckedChange={(checked) => {
                        patchPrefs({ [row.key]: checked } as Partial<EnvPrefs>);
                        toast.success(checked ? "Preference enabled" : "Preference disabled", {
                          description: row.title,
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="budgets" className="mt-0 space-y-4">
          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Budget defaults">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <Wallet className="size-4 text-brand-coral" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold">Budget defaults</h2>
                <p className="text-xs text-muted-foreground">
                  Monthly token and spend ceilings for new agent passports
                </p>
              </div>
            </div>
            <div className="space-y-6 p-4">
              <SafetyBanner compact />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-budget">Monthly spend ceiling (USD)</Label>
                  <Input
                    id="tenant-budget"
                    type="number"
                    min={0}
                    step={500}
                    className="bg-surface"
                    value={budget}
                    onChange={(e) => setBudget(tenant.id, Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exceeding this ceiling pauses new agent dispatches for the tenant.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-ceiling">Monthly token ceiling</Label>
                  <Input
                    id="token-ceiling"
                    type="number"
                    min={0}
                    step={100000}
                    className="bg-surface"
                    value={tokenCeiling}
                    onChange={(e) => setTokenCeiling(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Counted across all providers, including sovereign inference.
                  </p>
                </div>
              </div>

              <div className="space-y-6 rounded-xl border border-border bg-surface/40 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="warn-threshold">Warning threshold</Label>
                    <span className="font-display text-lg font-semibold tabular-nums">{warnPct}%</span>
                  </div>
                  <Slider
                    id="warn-threshold"
                    value={[warnPct]}
                    min={40}
                    max={hardStopPct - 5}
                    step={5}
                    onValueChange={(v) => setWarnPct(v[0] ?? warnPct)}
                    aria-label="Warning threshold percentage"
                  />
                  <p className="text-xs text-muted-foreground">
                    Notifies the tenant owner and FinOps at $
                    {Math.round((budget * warnPct) / 100).toLocaleString()}.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stop-threshold">Dispatch hard stop</Label>
                    <span className="font-display text-lg font-semibold tabular-nums">
                      {hardStopPct}%
                    </span>
                  </div>
                  <Slider
                    id="stop-threshold"
                    value={[hardStopPct]}
                    min={warnPct + 5}
                    max={100}
                    step={5}
                    onValueChange={(v) => setHardStopPct(v[0] ?? hardStopPct)}
                    aria-label="Hard stop threshold percentage"
                  />
                  <p className="text-xs text-muted-foreground">
                    New investigations require an approval above $
                    {Math.round((budget * hardStopPct) / 100).toLocaleString()}.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Residency</TableHead>
                      <TableHead className="text-right">Monthly ceiling</TableHead>
                      <TableHead className="text-right">Warning at</TableHead>
                      <TableHead className="text-right">Hard stop at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => {
                      const b = budgets[t.id] ?? 0;
                      return (
                        <TableRow
                          key={t.id}
                          className={cn(t.id === tenant.id ? "bg-muted/50" : undefined)}
                        >
                          <TableCell className="text-sm font-medium">{t.name}</TableCell>
                          <TableCell>
                            <StatusPill tone="info">{t.residency}</StatusPill>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            ${b.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            ${Math.round((b * warnPct) / 100).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            ${Math.round((b * hardStopPct) / 100).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="access" className="mt-0">
          <section className="ops-panel overflow-hidden rounded-2xl" aria-label="Role-based access control">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
              <KeyRound className="size-4 text-brand-coral" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-sm font-semibold">Role-based access control</h2>
                <p className="text-xs text-muted-foreground">
                  No role can grant shell, cluster-admin, secret reads or production writes
                </p>
              </div>
              <StatusPill tone="success">
                <ShieldCheck className="mr-1 size-3" aria-hidden="true" />
                read-only by design
              </StatusPill>
            </div>
            <div className="space-y-4 p-4">
              <SafetyBanner compact />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-center">Approve</TableHead>
                      <TableHead className="text-center">Investigate</TableHead>
                      <TableHead className="text-center">Export evidence</TableHead>
                      <TableHead className="text-center">Edit policies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {r.role}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.scope}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.permissions.map((p) => (
                              <span
                                key={p}
                                className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{r.members}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={r.canApprove}
                            aria-label={`${r.role} can approve`}
                            onCheckedChange={() => toggleRole(r.id, "canApprove")}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={r.canRunInvestigations}
                            aria-label={`${r.role} can run investigations`}
                            onCheckedChange={() => toggleRole(r.id, "canRunInvestigations")}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={r.canExportEvidence}
                            aria-label={`${r.role} can export evidence`}
                            onCheckedChange={() => toggleRole(r.id, "canExportEvidence")}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={r.canEditPolicies}
                            aria-label={`${r.role} can edit policies`}
                            onCheckedChange={() => toggleRole(r.id, "canEditPolicies")}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Identity is federated from the customer IdP. Changes here are simulated and written
                to the audit trail with a correlation ID; they never mutate the upstream directory.
              </p>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
