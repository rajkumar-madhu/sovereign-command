import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2, KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/ops/metric-card";
import { PageHeader } from "@/components/ops/page-header";
import { SafetyBanner } from "@/components/ops/safety-banner";
import { StatusPill } from "@/components/ops/status-badge";
import { useOps } from "@/lib/ops-context";
import { tenants } from "@/data/seed";
import type { EnvName } from "@/data/types";

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

  function toggleRole(id: string, key: keyof Pick<RoleRow, "canApprove" | "canRunInvestigations" | "canExportEvidence" | "canEditPolicies">) {
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
      <PageHeader
        title="Settings"
        description="Workspace defaults for environments, budget guardrails and role-based access. All changes are simulated in-session."
        crumbs={[{ label: "Govern", to: "/" }, { label: "Settings" }]}
        actions={
          <Button
            onClick={() =>
              toast.success("Configuration snapshot saved", {
                description: `${tenant.name} preferences recorded with a correlation ID for audit.`,
              })
            }
          >
            Save configuration
          </Button>
        }
      />
      <SafetyBanner compact />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Tenant workspaces" value={tenants.length} hint="Isolated by residency boundary" icon={<Building2 className="size-4" aria-hidden="true" />} />
        <MetricCard label="Configured budget" value={`$${budget.toLocaleString()}`} tone="info" hint={`${tenant.name} monthly ceiling`} icon={<Wallet className="size-4" aria-hidden="true" />} />
        <MetricCard label="Roles defined" value={roles.length} hint={`${totalMembers} assigned members`} icon={<KeyRound className="size-4" aria-hidden="true" />} />
        <MetricCard label="Approver roles" value={approvers} tone="success" hint="Dual-control eligible" icon={<ShieldCheck className="size-4" aria-hidden="true" />} />
      </section>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Tenant scope</CardTitle>
            <CardDescription>Settings below apply to the selected tenant workspace only.</CardDescription>
          </div>
          <Select value={tenant.id} onValueChange={setTenantId}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Select tenant workspace">
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
        </CardHeader>
      </Card>

      <Tabs defaultValue="environments">
        <TabsList>
          <TabsTrigger value="environments">Environment preferences</TabsTrigger>
          <TabsTrigger value="budgets">Budget defaults</TabsTrigger>
          <TabsTrigger value="access">Access control</TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Environment preferences · {tenant.name}</CardTitle>
              <CardDescription>
                Controls which environment the console opens by default and how evidence is handled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-env">Default console environment</Label>
                  <Select value={current.defaultEnv} onValueChange={(v) => patchPrefs({ defaultEnv: v as EnvName })}>
                    <SelectTrigger id="default-env"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Applied to the top-bar environment selector on sign-in.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-env">Investigation default environment</Label>
                  <Select value={current.investigationEnv} onValueChange={(v) => patchPrefs({ investigationEnv: v as EnvName })}>
                    <SelectTrigger id="inv-env"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENVIRONMENTS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Agents collect evidence from this environment unless overridden.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention">Evidence retention (days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    min={90}
                    max={2555}
                    value={current.evidenceRetentionDays}
                    onChange={(e) => patchPrefs({ evidenceRetentionDays: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Residency: {tenant.residency} · {tenant.region}. Minimum 90 days for regulated tenants.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-steps">Default agent max steps</Label>
                  <Input id="max-steps" type="number" min={4} max={100} value={maxStepsDefault} onChange={(e) => setMaxStepsDefault(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Hard stop for reasoning loops across new agent passports.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
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
                  <div key={row.key} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.body}</p>
                    </div>
                    <Switch
                      checked={current[row.key]}
                      aria-label={row.title}
                      onCheckedChange={(checked) => {
                        patchPrefs({ [row.key]: checked } as Partial<EnvPrefs>);
                        toast.success(checked ? "Preference enabled" : "Preference disabled", { description: row.title });
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget defaults</CardTitle>
              <CardDescription>Monthly token and spend ceilings applied to every new agent passport in this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <SafetyBanner compact />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-budget">Monthly spend ceiling (USD)</Label>
                  <Input
                    id="tenant-budget"
                    type="number"
                    min={0}
                    step={500}
                    value={budget}
                    onChange={(e) => setBudget(tenant.id, Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Exceeding this ceiling pauses new agent dispatches for the tenant.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-ceiling">Monthly token ceiling</Label>
                  <Input id="token-ceiling" type="number" min={0} step={100000} value={tokenCeiling} onChange={(e) => setTokenCeiling(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Counted across all providers, including sovereign inference.</p>
                </div>
              </div>

              <div className="space-y-6 rounded-lg border border-border p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="warn-threshold">Warning threshold</Label>
                    <span className="text-sm font-medium tabular-nums">{warnPct}%</span>
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
                    Notifies the tenant owner and FinOps at ${Math.round((budget * warnPct) / 100).toLocaleString()}.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stop-threshold">Dispatch hard stop</Label>
                    <span className="text-sm font-medium tabular-nums">{hardStopPct}%</span>
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
                    New investigations require an approval above ${Math.round((budget * hardStopPct) / 100).toLocaleString()}.
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
                        <TableRow key={t.id} className={t.id === tenant.id ? "bg-muted/50" : undefined}>
                          <TableCell className="text-sm font-medium">{t.name}</TableCell>
                          <TableCell><StatusPill tone="info">{t.residency}</StatusPill></TableCell>
                          <TableCell className="text-right text-sm tabular-nums">${b.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">${Math.round((b * warnPct) / 100).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">${Math.round((b * hardStopPct) / 100).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-based access control</CardTitle>
              <CardDescription>
                Roles are read-only by design: no role can grant shell access, cluster-admin, secret reads or production writes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        <TableCell className="text-sm font-medium whitespace-nowrap">{r.role}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.scope}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.permissions.map((p) => (
                              <span key={p} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                                {p}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{r.members}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={r.canApprove} aria-label={`${r.role} can approve`} onCheckedChange={() => toggleRole(r.id, "canApprove")} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={r.canRunInvestigations} aria-label={`${r.role} can run investigations`} onCheckedChange={() => toggleRole(r.id, "canRunInvestigations")} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={r.canExportEvidence} aria-label={`${r.role} can export evidence`} onCheckedChange={() => toggleRole(r.id, "canExportEvidence")} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={r.canEditPolicies} aria-label={`${r.role} can edit policies`} onCheckedChange={() => toggleRole(r.id, "canEditPolicies")} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Identity is federated from the customer IdP. Changes here are simulated and written to the audit trail with a
                correlation ID; they never mutate the upstream directory.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
