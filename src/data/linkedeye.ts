/**
 * LinkedEye dashboard payload — heatmap, details, domain, onboarding.
 * From mirai-Linkedeye-webproject-main. No secrets.
 */

export type MonitorStatus = "OK" | "WARNING" | "CRITICAL" | "UNKNOWN" | "PENDING";

export type LinkedEyeSite = {
  id: number;
  sitename: string;
  location: string;
  environment: string;
  is_enable: boolean;
  status: 0 | 1 | 2 | 3 | 4;
  lat: number;
  lng: number;
};

export const linkedEyeSites: LinkedEyeSite[] = [
  { id: 1, sitename: "FS-MUM", location: "Mumbai", environment: "production", is_enable: true, status: 2, lat: 19.076, lng: 72.8777 },
  { id: 2, sitename: "FS-BLR", location: "Bengaluru", environment: "production", is_enable: true, status: 1, lat: 12.9716, lng: 77.5946 },
  { id: 3, sitename: "FS-HYD", location: "Hyderabad", environment: "dr", is_enable: true, status: 2, lat: 17.385, lng: 78.4867 },
  { id: 4, sitename: "FS-NSE", location: "NSE colo", environment: "production", is_enable: true, status: 0, lat: 19.076, lng: 72.8777 },
];

export type HeatCell = { state: string; label: string; score: number; sitename: string };

export const linkedEyeHeatmap: HeatCell[] = [
  { state: "MH", label: "Maharashtra", score: 72, sitename: "FS-MUM" },
  { state: "KA", label: "Karnataka", score: 81, sitename: "FS-BLR" },
  { state: "TS", label: "Telangana", score: 88, sitename: "FS-HYD" },
];

export const linkedEyeMapPins = linkedEyeSites.map((s) => ({
  sitename: s.sitename,
  x: ((s.lng - 68) / (97 - 68)) * 100,
  y: (1 - (s.lat - 8) / (35 - 8)) * 100,
  status: s.status,
}));

export const linkedEyeLayerCounts = {
  hardware: [
    { name: "Switch", count: 14, status: "OK" as MonitorStatus },
    { name: "Firewall", count: 6, status: "WARNING" as MonitorStatus },
    { name: "Server", count: 22, status: "CRITICAL" as MonitorStatus },
  ],
  software: [
    { name: "CPU", count: 8, status: "WARNING" as MonitorStatus },
    { name: "Memory", count: 3, status: "OK" as MonitorStatus },
    { name: "Fan / temp", count: 2, status: "CRITICAL" as MonitorStatus },
  ],
  application: [
    { name: "OMS", count: 4, status: "OK" as MonitorStatus },
    { name: "payments-auth", count: 1, status: "CRITICAL" as MonitorStatus },
    { name: "Investor MOB/WEB", count: 2, status: "OK" as MonitorStatus },
  ],
};

export type DomainLayer = "fw" | "swi" | "s_sw" | "srv" | "app";

export type DomainNode = {
  id: string;
  name: string;
  layer: DomainLayer;
  ip: string;
  product_model: string;
  monitor_status: MonitorStatus;
  sitename: string;
  x: number;
  y: number;
};

export type DomainEdge = { from: string; to: string };

export const linkedEyeDomainNodes: DomainNode[] = [
  { id: "inet", name: "Exchange WAN", layer: "fw", ip: "edge", product_model: "circuit", monitor_status: "OK", sitename: "FS-MUM", x: 8, y: 50 },
  { id: "fw1", name: "fw-core-01", layer: "fw", ip: "10.33.1.1", product_model: "fortigate", monitor_status: "OK", sitename: "FS-MUM", x: 28, y: 50 },
  { id: "sw1", name: "sw-core-01", layer: "swi", ip: "10.33.1.10", product_model: "cisco-nexus", monitor_status: "WARNING", sitename: "FS-MUM", x: 50, y: 32 },
  { id: "sw2", name: "sw-access-02", layer: "s_sw", ip: "10.33.1.12", product_model: "cisco-cat", monitor_status: "OK", sitename: "FS-MUM", x: 50, y: 68 },
  { id: "srv-oms", name: "oms-noren-01", layer: "srv", ip: "10.33.12.20", product_model: "dell-r750", monitor_status: "OK", sitename: "FS-MUM", x: 74, y: 28 },
  { id: "srv-auth", name: "payments-auth", layer: "app", ip: "10.33.12.44", product_model: "k8s-pod", monitor_status: "CRITICAL", sitename: "FS-MUM", x: 74, y: 72 },
];

export const linkedEyeDomainEdges: DomainEdge[] = [
  { from: "inet", to: "fw1" },
  { from: "fw1", to: "sw1" },
  { from: "fw1", to: "sw2" },
  { from: "sw1", to: "srv-oms" },
  { from: "sw2", to: "srv-auth" },
];

export type OnboardDevice = {
  id: string;
  sitename: string;
  ipaddress: string;
  ostype: string;
  monitoringType: "DIRECT" | "GATEWAY";
};

export const linkedEyeOnboardDevices: OnboardDevice[] = [
  { id: "onb-1", sitename: "FS-MUM", ipaddress: "10.33.12.44", ostype: "linux", monitoringType: "DIRECT" },
  { id: "onb-2", sitename: "FS-MUM", ipaddress: "10.33.1.1", ostype: "fortigate", monitoringType: "GATEWAY" },
  { id: "onb-3", sitename: "FS-NSE", ipaddress: "10.66.2.4", ostype: "linux", monitoringType: "DIRECT" },
];

export function monitorTone(status: MonitorStatus): "success" | "warning" | "danger" | "info" {
  if (status === "OK") return "success";
  if (status === "WARNING") return "warning";
  if (status === "CRITICAL") return "danger";
  return "info";
}

export function siteStatusLabel(status: 0 | 1 | 2 | 3 | 4): string {
  return ({ 0: "CRITICAL", 1: "WARNING", 2: "OK", 3: "UNKNOWN", 4: "PENDING" } as const)[status];
}

export function heatTone(score: number): string {
  if (score >= 85) return "bg-emerald-500/25 text-emerald-400";
  if (score >= 72) return "bg-primary/20 text-primary";
  if (score >= 60) return "bg-amber-500/25 text-amber-400";
  return "bg-destructive/20 text-destructive";
}
