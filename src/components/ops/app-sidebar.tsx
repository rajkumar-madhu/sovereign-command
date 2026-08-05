import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  BellRing,
  Bot,
  Building2,
  Coins,
  Cpu,
  FileSearch,
  Gauge,
  Radar,
  ScrollText,
  Settings,
  ShieldAlert,
  Siren,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups: Array<{ label: string; items: Array<{ title: string; url: string; icon: typeof Gauge }> }> = [
  {
    label: "Operate",
    items: [
      { title: "Command Centre", url: "/", icon: Gauge },
      { title: "Customers", url: "/customers", icon: Building2 },
      { title: "Agent Registry", url: "/agents", icon: Bot },
    ],
  },
  {
    label: "Investigate",
    items: [
      { title: "Investigations", url: "/investigations", icon: Radar },
      { title: "Evidence Viewer", url: "/evidence", icon: FileSearch },
      { title: "RCA Report", url: "/rca", icon: ScrollText },
    ],
  },
  {
    label: "Govern",
    items: [
      { title: "Agent Security SOC", url: "/soc", icon: ShieldAlert },
      { title: "Token & Cost", url: "/cost", icon: Coins },
      { title: "Model Gateway", url: "/models", icon: Cpu },
      { title: "Tool & MCP Registry", url: "/tools", icon: Wrench },
      { title: "Policy Management", url: "/policies", icon: BadgeCheck },
      { title: "Approval Queue", url: "/approvals", icon: BellRing },
      { title: "Audit & Compliance", url: "/audit", icon: Activity },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldAlert className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold">Sovereign Agentic</span>
            <span className="block truncate text-xs text-muted-foreground">Operations OS</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 py-1 text-[11px] leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Read-only mode · vendor neutral · multi-tenant
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}