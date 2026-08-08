import type { LucideIcon } from "lucide-react";
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
  Timer,
  Wrench,
} from "lucide-react";

export type NavDomainId = "operate" | "investigate" | "govern";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type NavDomain = {
  id: NavDomainId;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

export const navDomains: NavDomain[] = [
  {
    id: "operate",
    label: "Operate",
    icon: Gauge,
    items: [
      { title: "Command Centre", url: "/command", icon: Gauge },
      { title: "Customers", url: "/customers", icon: Building2 },
      { title: "Agent Registry", url: "/agents", icon: Bot },
    ],
  },
  {
    id: "investigate",
    label: "Investigate",
    icon: Radar,
    items: [
      { title: "Investigations", url: "/investigations", icon: Radar },
      { title: "Incident Workspace", url: "/incidents/inc-4821", icon: Siren },
      { title: "Evidence Viewer", url: "/evidence", icon: FileSearch },
      { title: "RCA Report", url: "/rca", icon: ScrollText },
    ],
  },
  {
    id: "govern",
    label: "Govern",
    icon: ShieldAlert,
    items: [
      { title: "Agent Security SOC", url: "/soc", icon: ShieldAlert },
      { title: "Token & Cost", url: "/cost", icon: Coins },
      { title: "Model Gateway", url: "/models", icon: Cpu },
      { title: "Tool & MCP Registry", url: "/tools", icon: Wrench },
      { title: "Policy Management", url: "/policies", icon: BadgeCheck },
      { title: "Approval Queue", url: "/approvals", icon: BellRing },
      { title: "SLA Administration", url: "/sla-admin", icon: Timer },
      { title: "Audit & Compliance", url: "/audit", icon: Activity },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function domainForPath(pathname: string): NavDomainId {
  for (const domain of navDomains) {
    for (const item of domain.items) {
      if (item.url === "/command") {
        if (pathname === "/command" || pathname === "/") return domain.id;
        continue;
      }
      if (pathname === item.url || pathname.startsWith(`${item.url}/`)) {
        return domain.id;
      }
    }
  }
  return "operate";
}

export function isNavActive(pathname: string, url: string) {
  return url === "/command"
    ? pathname === "/command"
    : pathname === url || pathname.startsWith(`${url}/`);
}
