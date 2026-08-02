import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Search, UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusPill, toneForSeverity } from "@/components/ops/status-badge";
import { useOps, tenantCustomers } from "@/lib/ops-context";
import { agents, incidents, securityEvents, tenants } from "@/data/seed";
import type { EnvName } from "@/data/types";
import { toast } from "sonner";

const ENVS: EnvName[] = ["production", "staging", "dev", "dr"];

export function TopBar() {
  const navigate = useNavigate();
  const ops = useOps();
  const [searchOpen, setSearchOpen] = useState(false);
  const custs = useMemo(() => tenantCustomers(ops.tenantId), [ops.tenantId]);
  const notifications = securityEvents.slice(0, 5);
  const pending = ops.approvals.filter((a) => a.status === "pending").length;

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:flex-row md:items-center md:gap-3 md:px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger aria-label="Toggle navigation" />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={ops.tenantId} onValueChange={ops.setTenantId}>
            <SelectTrigger className="h-9 w-[190px]" aria-label="Select tenant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ops.customerId} onValueChange={ops.setCustomerId}>
            <SelectTrigger className="h-9 w-[190px]" aria-label="Select customer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {custs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ops.environment}
            onValueChange={(v) => ops.setEnvironment(v as EnvName)}
          >
            <SelectTrigger className="h-9 w-[130px]" aria-label="Select environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENVS.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          variant="outline"
          className="h-9 w-full justify-start gap-2 text-muted-foreground md:w-64"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="truncate">Search agents, incidents…</span>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative h-9 w-9" aria-label="Notifications">
              <Bell className="size-4" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                {notifications.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">{pending} approvals pending</p>
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{n.category}</span>
                    <StatusPill tone={toneForSeverity(n.severity)}>{n.severity}</StatusPill>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.detail}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-2">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/soc">Open Security SOC</Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-2 px-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="size-3.5" aria-hidden="true" />
              </span>
              <span className="hidden text-sm sm:inline">I. Halvorsen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-sm">Ingrid Halvorsen</span>
              <span className="block text-xs text-muted-foreground">Platform SRE · read-only</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/audit">My audit trail</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                toast.success("Signed out of the read-only session");
                void navigate({ to: "/login" });
              }}
            >
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search agents, incidents, pages…" />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup heading="Incidents">
            {incidents.map((i) => (
              <CommandItem
                key={i.id}
                value={`${i.id} ${i.title}`}
                onSelect={() => {
                  setSearchOpen(false);
                  void navigate({ to: "/incidents/$incidentId", params: { incidentId: i.id } });
                }}
              >
                {i.id} · {i.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Agents">
            {agents.slice(0, 12).map((a) => (
              <CommandItem
                key={a.id}
                value={`${a.id} ${a.name}`}
                onSelect={() => {
                  setSearchOpen(false);
                  void navigate({ to: "/agents/$agentId", params: { agentId: a.id } });
                }}
              >
                {a.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}