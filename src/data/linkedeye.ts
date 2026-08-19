/**
 * LinkedEye estate payload for Ops — shaped from mirai-Linkedeye-webproject-main.
 * Sources (read-only Stage-1; remediator held):
 *   lesites.SiteModel, dashboard getstatusAll / gethostandservicecount,
 *   bodeodstatus Redis key_data, incidents.IncidentModel,
 *   iframeGraphs/noren-oms.json, onboard REUSABLE_AUTOMATION flag.
 * Secrets / Vault / Redis hosts from the zip are not copied.
 */

export const linkedEyeUatUrl = "https://fs-le-uat.finspot.in/dashboard/";

/** Neo4j / Nagios monitor_status from dashboard.js */
export type MonitorStatus = "OK" | "WARNING" | "CRITICAL" | "UNKNOWN" | "PENDING";

/** bod-eod.js getPriorityColor: 0 red, 1 amber, 2 green, 3 white, 4|5 black */
export type BodStepStatus = 0 | 1 | 2 | 3 | 4 | 5;

export type BodMode = "BOD" | "EOD" | "ADP";

export type IncidentPriority = "P1" | "P2" | "P3" | "P4";
export type IncidentState =
  | "NEW"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type LinkedEyeSite = {
  id: number;
  sitename: string;
  location: string;
  environment: string;
  is_enable: boolean;
  /** SiteModel.status integer 0–4 */
  status: 0 | 1 | 2 | 3 | 4;
  lat: number;
  lng: number;
};

export type HostServiceCount = { status: MonitorStatus; count: number };

export type SiteMonitor = {
  sitename: string;
  host: HostServiceCount[];
  service: HostServiceCount[];
  /** getstatusAll: IP → status-code → count */
  nodeStatus: Record<string, Partial<Record<"0" | "1" | "2" | "3" | "4", number>>>;
};

export type BodStep = {
  segment: string;
  isSuccess: boolean;
  status: BodStepStatus;
};

export type BodKey = {
  key: string;
  mode: BodMode;
  overall: "Success" | "Failure";
  key_data: { type: "table"; status: BodStepStatus; data: BodStep[] };
};

export type OmsPoint = {
  window: string;
  uniqueOrders: number;
  uniqueTrades: number;
  buy: number;
  sell: number;
};

export type LinkedEyeIncident = {
  number: string;
  short_description: string;
  priority: IncidentPriority;
  state: IncidentState;
  site_name: string;
  assigned_to: string;
  sla_breached: boolean;
  source: string;
};

/** Onboard automation flag — StackStorm is external; Stage-1 never executes. */
export type OnboardAutomation = {
  id: string;
  sitename: string;
  device: string;
  reusableAutomation: boolean;
  remediator: "held";
  wouldExecute: false;
};

export const linkedEyeSites: LinkedEyeSite[] = [
  {
    id: 1,
    sitename: "FS-MUM",
    location: "Mumbai",
    environment: "production",
    is_enable: true,
    status: 2,
    lat: 19.076,
    lng: 72.8777,
  },
  {
    id: 2,
    sitename: "FS-BLR",
    location: "Bengaluru",
    environment: "production",
    is_enable: true,
    status: 1,
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    id: 3,
    sitename: "FS-HYD",
    location: "Hyderabad",
    environment: "dr",
    is_enable: true,
    status: 2,
    lat: 17.385,
    lng: 78.4867,
  },
  {
    id: 4,
    sitename: "FS-NSE",
    location: "NSE colo",
    environment: "production",
    is_enable: true,
    status: 0,
    lat: 19.076,
    lng: 72.8777,
  },
];

export const linkedEyeMonitors: SiteMonitor[] = [
  {
    sitename: "FS-MUM",
    host: [
      { status: "OK", count: 42 },
      { status: "CRITICAL", count: 2 },
      { status: "WARNING", count: 3 },
    ],
    service: [
      { status: "OK", count: 118 },
      { status: "WARNING", count: 7 },
      { status: "CRITICAL", count: 4 },
    ],
    nodeStatus: {
      "10.33.12.44": { "0": 1, "2": 6 },
      "10.33.12.51": { "2": 8 },
    },
  },
  {
    sitename: "FS-BLR",
    host: [
      { status: "OK", count: 28 },
      { status: "WARNING", count: 4 },
    ],
    service: [
      { status: "OK", count: 90 },
      { status: "WARNING", count: 11 },
      { status: "UNKNOWN", count: 2 },
    ],
    nodeStatus: { "10.44.8.12": { "1": 2, "2": 5 } },
  },
  {
    sitename: "FS-HYD",
    host: [{ status: "OK", count: 19 }],
    service: [
      { status: "OK", count: 54 },
      { status: "PENDING", count: 1 },
    ],
    nodeStatus: { "10.55.1.8": { "2": 4 } },
  },
  {
    sitename: "FS-NSE",
    host: [
      { status: "OK", count: 11 },
      { status: "CRITICAL", count: 3 },
    ],
    service: [
      { status: "CRITICAL", count: 6 },
      { status: "OK", count: 22 },
    ],
    nodeStatus: { "10.66.2.4": { "0": 3, "2": 2 } },
  },
];

export const linkedEyeBodKeys: BodKey[] = [
  {
    key: "FS-MUM:BOD:live_enable",
    mode: "BOD",
    overall: "Success",
    key_data: {
      type: "table",
      status: 2,
      data: [
        { segment: "Bod enable with live updates", isSuccess: true, status: 2 },
        { segment: "Market data feed", isSuccess: true, status: 2 },
        { segment: "OMS login", isSuccess: true, status: 2 },
      ],
    },
  },
  {
    key: "FS-NSE:BOD:exchange_line",
    mode: "BOD",
    overall: "Failure",
    key_data: {
      type: "table",
      status: 0,
      data: [
        { segment: "Exchange line check", isSuccess: false, status: 0 },
        { segment: "OMS login", isSuccess: true, status: 2 },
      ],
    },
  },
  {
    key: "FS-MUM:EOD:reconciliation",
    mode: "EOD",
    overall: "Success",
    key_data: {
      type: "table",
      status: 2,
      data: [{ segment: "Trade file reconciliation", isSuccess: true, status: 2 }],
    },
  },
  {
    key: "FS-BLR:EOD:archive",
    mode: "EOD",
    overall: "Failure",
    key_data: {
      type: "table",
      status: 1,
      data: [{ segment: "EOD archive to object store", isSuccess: false, status: 1 }],
    },
  },
  {
    key: "FS-HYD:ADP:adapter",
    mode: "ADP",
    overall: "Success",
    key_data: {
      type: "table",
      status: 2,
      data: [{ segment: "Adapter heartbeat", isSuccess: true, status: 2 }],
    },
  },
];

/** iframeGraphs/noren-oms.json graph names — demo series, not live Superset. */
export const linkedEyeOmsTrend: OmsPoint[] = [
  { window: "09:15", uniqueOrders: 18420, uniqueTrades: 11200, buy: 9800, sell: 8620 },
  { window: "10:00", uniqueOrders: 22110, uniqueTrades: 14110, buy: 11840, sell: 10270 },
  { window: "11:00", uniqueOrders: 19840, uniqueTrades: 12880, buy: 10420, sell: 9420 },
  { window: "12:00", uniqueOrders: 17330, uniqueTrades: 10990, buy: 9100, sell: 8230 },
  { window: "13:00", uniqueOrders: 20990, uniqueTrades: 13340, buy: 11120, sell: 9870 },
  { window: "14:00", uniqueOrders: 24150, uniqueTrades: 15620, buy: 12880, sell: 11270 },
];

export const linkedEyeOmsGraphs = [
  "Unique Order Count",
  "Broker wise Order Statistics",
  "Unique Trade Count",
  "Broker wise Trade Statistics",
  "ExchangeWise",
  "Order Trend",
  "Status Overview",
  "Buy Sell Ratio",
] as const;

export const linkedEyeIncidents: LinkedEyeIncident[] = [
  {
    number: "INC0000042",
    short_description: "CrashLoopBackOff on payments-auth after v4.21",
    priority: "P1",
    state: "IN_PROGRESS",
    site_name: "FS-MUM",
    assigned_to: "Ingrid Halvorsen",
    sla_breached: false,
    source: "Prometheus",
  },
  {
    number: "INC0000038",
    short_description: "EOD archive delay at Bengaluru",
    priority: "P2",
    state: "ON_HOLD",
    site_name: "FS-BLR",
    assigned_to: "Petter Aas",
    sla_breached: true,
    source: "LinkedEye BOD/EOD",
  },
  {
    number: "INC0000031",
    short_description: "Exchange line check failed at NSE colo",
    priority: "P1",
    state: "ESCALATED",
    site_name: "FS-NSE",
    assigned_to: "Lena Wik",
    sla_breached: true,
    source: "SNMP",
  },
];

export const linkedEyeOnboardAutomation: OnboardAutomation[] = [
  {
    id: "onb-fs-mum-auth",
    sitename: "FS-MUM",
    device: "payments-auth",
    reusableAutomation: true,
    remediator: "held",
    wouldExecute: false,
  },
  {
    id: "onb-fs-nse-gw",
    sitename: "FS-NSE",
    device: "exchange-gateway",
    reusableAutomation: true,
    remediator: "held",
    wouldExecute: false,
  },
];

export function monitorTone(status: MonitorStatus): "success" | "warning" | "danger" | "info" {
  if (status === "OK") return "success";
  if (status === "WARNING") return "warning";
  if (status === "CRITICAL") return "danger";
  return "info";
}

export function bodTone(status: BodStepStatus): "success" | "warning" | "danger" | "info" {
  if (status === 2) return "success";
  if (status === 1) return "warning";
  if (status === 0) return "danger";
  return "info";
}

export function siteStatusLabel(status: 0 | 1 | 2 | 3 | 4): string {
  return ({ 0: "CRITICAL", 1: "WARNING", 2: "OK", 3: "UNKNOWN", 4: "PENDING" } as const)[status];
}

/** dashboard.html Heat-map — India jvectormap markers (lat/lng as % on schematic). */
export type HeatCell = {
  state: string;
  label: string;
  score: number;
  sitename?: string;
};

export const linkedEyeHeatmap: HeatCell[] = [
  { state: "MH", label: "Maharashtra", score: 72, sitename: "FS-MUM" },
  { state: "KA", label: "Karnataka", score: 81, sitename: "FS-BLR" },
  { state: "TS", label: "Telangana", score: 88, sitename: "FS-HYD" },
  { state: "GJ", label: "Gujarat", score: 64 },
  { state: "DL", label: "Delhi", score: 90 },
  { state: "TN", label: "Tamil Nadu", score: 77 },
  { state: "WB", label: "West Bengal", score: 69 },
  { state: "RJ", label: "Rajasthan", score: 85 },
];

export const linkedEyeMapPins = linkedEyeSites.map((s) => ({
  sitename: s.sitename,
  x: ((s.lng - 68) / (97 - 68)) * 100,
  y: (1 - (s.lat - 8) / (35 - 8)) * 100,
  status: s.status,
}));

/** dashboard.html Hardware / Soft limits / Applications pies */
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

export type DomainLayer = "fw" | "swi" | "s_sw" | "srv" | "app" | "nic";

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

export type DomainEdge = { from: string; to: string; kind: "uplink" | "nic" };

/** /dashboard/getneo4jnodes · /switch Domain graph */
export const linkedEyeDomainNodes: DomainNode[] = [
  {
    id: "inet",
    name: "Exchange WAN",
    layer: "fw",
    ip: "edge",
    product_model: "circuit",
    monitor_status: "OK",
    sitename: "FS-MUM",
    x: 8,
    y: 50,
  },
  {
    id: "fw1",
    name: "fw-core-01",
    layer: "fw",
    ip: "10.33.1.1",
    product_model: "fortigate",
    monitor_status: "OK",
    sitename: "FS-MUM",
    x: 28,
    y: 50,
  },
  {
    id: "sw1",
    name: "sw-core-01",
    layer: "swi",
    ip: "10.33.1.10",
    product_model: "cisco-nexus",
    monitor_status: "WARNING",
    sitename: "FS-MUM",
    x: 50,
    y: 32,
  },
  {
    id: "sw2",
    name: "sw-access-02",
    layer: "s_sw",
    ip: "10.33.1.12",
    product_model: "cisco-cat",
    monitor_status: "OK",
    sitename: "FS-MUM",
    x: 50,
    y: 68,
  },
  {
    id: "srv-oms",
    name: "oms-noren-01",
    layer: "srv",
    ip: "10.33.12.20",
    product_model: "dell-r750",
    monitor_status: "OK",
    sitename: "FS-MUM",
    x: 74,
    y: 28,
  },
  {
    id: "srv-auth",
    name: "payments-auth",
    layer: "app",
    ip: "10.33.12.44",
    product_model: "k8s-pod",
    monitor_status: "CRITICAL",
    sitename: "FS-MUM",
    x: 74,
    y: 72,
  },
];

export const linkedEyeDomainEdges: DomainEdge[] = [
  { from: "inet", to: "fw1", kind: "uplink" },
  { from: "fw1", to: "sw1", kind: "uplink" },
  { from: "fw1", to: "sw2", kind: "uplink" },
  { from: "sw1", to: "srv-oms", kind: "nic" },
  { from: "sw2", to: "srv-auth", kind: "nic" },
];

export type OnboardDevice = {
  id: string;
  sitename: string;
  ipaddress: string;
  ostype: string;
  monitoringType: "DIRECT" | "GATEWAY";
  reusableAutomation: boolean;
  remediator: "held";
  wouldExecute: false;
};

export const linkedEyeOnboardDevices: OnboardDevice[] = [
  {
    id: "onb-1",
    sitename: "FS-MUM",
    ipaddress: "10.33.12.44",
    ostype: "linux",
    monitoringType: "DIRECT",
    reusableAutomation: true,
    remediator: "held",
    wouldExecute: false,
  },
  {
    id: "onb-2",
    sitename: "FS-MUM",
    ipaddress: "10.33.1.1",
    ostype: "fortigate",
    monitoringType: "GATEWAY",
    reusableAutomation: false,
    remediator: "held",
    wouldExecute: false,
  },
  {
    id: "onb-3",
    sitename: "FS-NSE",
    ipaddress: "10.66.2.4",
    ostype: "linux",
    monitoringType: "DIRECT",
    reusableAutomation: true,
    remediator: "held",
    wouldExecute: false,
  },
];

export function heatTone(score: number): string {
  if (score >= 85) return "bg-emerald-500/25 text-emerald-400";
  if (score >= 72) return "bg-primary/20 text-primary";
  if (score >= 60) return "bg-amber-500/25 text-amber-400";
  return "bg-destructive/20 text-destructive";
}
