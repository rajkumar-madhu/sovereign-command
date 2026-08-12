import type { ExecutionTrace, TimelineStep } from "./types";

/** Stage-1 CrashLoopBackOff investigation timeline (thin vertical slice). */
export const crashLoopTimeline: TimelineStep[] = [
  {
    id: "clb-s1",
    label: "Tenant and passport gate",
    phase: "Guardrails",
    status: "verified",
    time: "08:12:04",
    at: "2026-08-09T08:12:04Z",
    detail:
      "Single-tenant session: tn-nordic / cu-fsprod. Agent ag-kubernetes-01 passport verified; autonomy L2 investigate (read-only).",
    evidence: [
      "passport signature valid",
      "Sovereign Mode · no external LLM egress",
      "write verbs=0",
    ],
    logs: `[2026-08-09T08:12:04.011Z] slice: stage1 begin incident=inc-clb-01
[2026-08-09T08:12:04.040Z] passport: ag-kubernetes-01 OK · autonomy=L2
[2026-08-09T08:12:04.055Z] policy: POL-001 allow-read · POL-003 deny-delete · POL-009 deny-write`,
  },
  {
    id: "clb-s2",
    label: "Pod status query",
    phase: "Kubernetes",
    status: "anomaly",
    time: "08:12:18",
    at: "2026-08-09T08:12:18Z",
    detail:
      "payments-auth-7d9f8c6b4-xq2n1 reports CrashLoopBackOff; restartCount=14; lastExitCode=1.",
    evidence: ["kubectl get pod · CrashLoopBackOff", "restartCount=14"],
    logs: `NAME                              READY   STATUS             RESTARTS   AGE
payments-auth-7d9f8c6b4-xq2n1     0/1     CrashLoopBackOff   14         37m`,
  },
  {
    id: "clb-s3",
    label: "Container logs (previous)",
    phase: "Evidence",
    status: "anomaly",
    time: "08:12:41",
    at: "2026-08-09T08:12:41Z",
    detail:
      "Previous container log shows panic on missing CONFIG_MAP key AUTH_JWKS_URI after deploy v4.21.",
    evidence: ["ev-clb-1 · previous logs", "CONFIG_MAP AUTH_JWKS_URI missing"],
    logs: `panic: required env AUTH_JWKS_URI not set
goroutine 1 [running]:
main.mustEnv(...)
    /src/cmd/auth/main.go:48
main.main()
    /src/cmd/auth/main.go:91 +0x1a4`,
  },
  {
    id: "clb-s4",
    label: "Change correlation",
    phase: "ChangeGraph",
    status: "info",
    time: "08:13:02",
    at: "2026-08-09T08:13:02Z",
    detail:
      "ArgoCD sync of payments-auth image tag v4.21 completed 11 minutes before first CrashLoop; ConfigMap auth-runtime not updated in the same revision.",
    evidence: ["CHG-slice-01 · image v4.21", "ConfigMap auth-runtime unchanged"],
    logs: `revision=payments-auth@sha256:a91e…  syncedAt=2026-08-09T08:01:12Z
configMap=auth-runtime  resourceVersion unchanged since 2026-08-08T22:14:00Z`,
  },
  {
    id: "clb-s5",
    label: "Hypothesis validation",
    phase: "RCA",
    status: "verified",
    time: "08:13:28",
    at: "2026-08-09T08:13:28Z",
    detail:
      "Root cause: deploy v4.21 requires AUTH_JWKS_URI; ConfigMap lag caused boot panic → CrashLoopBackOff. Host/node healthy; not OOM.",
    evidence: ["rejected: OOMKilled", "rejected: node pressure", "verified: missing env"],
    logs: `[2026-08-09T08:13:28.004Z] validator: confidence=94
[2026-08-09T08:13:28.018Z] reject: OOMKilled (lastState.terminated.reason=Error exit=1)
[2026-08-09T08:13:28.030Z] accept: missing AUTH_JWKS_URI after image bump`,
  },
  {
    id: "clb-s6",
    label: "Remediation held for approval",
    phase: "Govern",
    status: "info",
    time: "08:13:44",
    at: "2026-08-09T08:13:44Z",
    detail:
      "Recommended action: patch ConfigMap auth-runtime with AUTH_JWKS_URI then rollout restart. Production write requires approval (apr-clb-01). Console remains read-only.",
    evidence: ["apr-clb-01 pending", "productionWriteRequired=true for remediator only"],
    logs: `[2026-08-09T08:13:44.002Z] policy: REQUIRE APPROVAL · env=production · action=configmap.patch
[2026-08-09T08:13:44.020Z] approval: apr-clb-01 queued · roles=Platform Engineering,Change Manager`,
  },
];

export const crashLoopRca = {
  incidentId: "inc-clb-01",
  title: "CrashLoopBackOff on payments-auth — sealed Stage-1 RCA",
  confidence: 94,
  risk: "medium" as const,
  productionWriteRequired: true,
  rootCause:
    "Deployment payments-auth v4.21 introduced a hard dependency on AUTH_JWKS_URI. The companion ConfigMap auth-runtime was not updated in the same ArgoCD revision, so the container panics on boot and Kubernetes restarts it into CrashLoopBackOff.",
  evidence: [
    {
      id: "clb-evc-1",
      claim: "Pod payments-auth-7d9f8c6b4-xq2n1 is CrashLoopBackOff with restartCount=14.",
      status: "verified" as const,
      artifacts: ["ev-clb-2"],
      check: "k8s-read · get pod",
      capturedAt: "2026-08-09T08:12:18Z",
      hostname: "pay-auth-a3.payments.corp",
      ipAddress: "10.33.12.44",
      logs: "STATUS=CrashLoopBackOff RESTARTS=14",
      output: `{ "phase": "Running", "containerStatuses": [{ "ready": false, "restartCount": 14, "state": { "waiting": { "reason": "CrashLoopBackOff" } } }] }`,
    },
    {
      id: "clb-evc-2",
      claim: "Previous container logs show panic: required env AUTH_JWKS_URI not set.",
      status: "verified" as const,
      artifacts: ["ev-clb-1"],
      check: "log-reader · previous",
      capturedAt: "2026-08-09T08:12:41Z",
      hostname: "pay-auth-a3.payments.corp",
      ipAddress: "10.33.12.44",
      logs: "panic: required env AUTH_JWKS_URI not set",
      output: "exitCode=1 reason=Error",
    },
    {
      id: "clb-evc-3",
      claim: "Image tag v4.21 synced 11 minutes before onset; ConfigMap auth-runtime unchanged.",
      status: "verified" as const,
      artifacts: ["ev-clb-3"],
      check: "change-calendar · ArgoCD",
      capturedAt: "2026-08-09T08:13:02Z",
      hostname: "argocd.fsprod.corp",
      ipAddress: "10.33.1.20",
      logs: "syncedAt=2026-08-09T08:01:12Z configMap unchanged",
      output: "CHG-slice-01",
    },
  ],
  rejected: [
    {
      id: "clb-rej-1",
      claim: "Node OOM or memory pressure caused the crash loop.",
      artifacts: ["ev-clb-2"],
      reason: "lastState.terminated.reason=Error exit=1; node MemoryPressure=False; OOMKilled not present.",
      output: "OOMKilled=false",
    },
    {
      id: "clb-rej-2",
      claim: "Autonomous pod delete / restart without human approval.",
      artifacts: [],
      reason: "Stage-1 autonomy is L2 investigate; production writes require approval (apr-clb-01).",
      output: "productionWriteRequired=true · console write=false",
    },
  ],
  recommendation:
    "Approve apr-clb-01 to patch ConfigMap auth-runtime with AUTH_JWKS_URI (from vault metadata path only), then trigger a controlled rollout restart via Workflow Studio / StackStorm. Verify ready=1/1 and no CrashLoop before closing ITSM.",
  owner: "Platform Engineering — Nordic Federated Bank",
};

/** Immutable AI Control Tower executions (Stage-1 + primary demo). */
export const executionTraces: ExecutionTrace[] = [
  {
    id: "exec-clb-01",
    incidentId: "inc-clb-01",
    tenantId: "tn-nordic",
    customerId: "cu-fsprod",
    agentId: "ag-kubernetes-01",
    model: "llama-3.3-70b (Ollama)",
    tool: "k8s-read",
    autonomyLevel: "L2",
    status: "awaiting-approval",
    startedAt: "2026-08-09T08:12:04Z",
    endedAt: "2026-08-09T08:13:44Z",
    summary:
      "Stage-1 thin slice: one tenant, one read-only agent, one local model, one tool, one approval gate, one immutable execution ID.",
    tokens: 18420,
    costUsd: 0.12,
    confidence: 94,
    approvalId: "apr-clb-01",
    auditCorrelationId: "corr-clb-01",
    hops: [
      {
        id: "h1",
        at: "2026-08-09T08:12:04Z",
        domain: "prompt",
        label: "Operator prompt",
        detail: "Investigate CrashLoopBackOff on payments-auth in cu-fsprod production.",
        status: "ok",
        meta: { injectionScore: 0.02, template: "sre-investigate-v3" },
      },
      {
        id: "h2",
        at: "2026-08-09T08:12:04Z",
        domain: "security",
        label: "Prompt firewall",
        detail: "No jailbreak / injection; ticket body sanitised. Context bounded to tn-nordic.",
        status: "ok",
        meta: { verdict: "allow" },
      },
      {
        id: "h3",
        at: "2026-08-09T08:12:05Z",
        domain: "agent",
        label: "Planner → Kubernetes Agent",
        detail: "ag-kubernetes-01 selected; maxSteps=12; skill=pod-crashloop-diagnose.",
        status: "ok",
        meta: { agent: "ag-kubernetes-01", skill: "pod-crashloop-diagnose" },
      },
      {
        id: "h4",
        at: "2026-08-09T08:12:06Z",
        domain: "model",
        label: "Model Gateway · Sovereign Mode",
        detail: "Routed to local Ollama llama-3.3-70b. External provider APIs denied by network policy.",
        status: "ok",
        meta: { provider: "ollama", latencyMs: 286, tokens: 4200 },
      },
      {
        id: "h5",
        at: "2026-08-09T08:12:18Z",
        domain: "mcp",
        label: "MCP · k8s-read",
        detail: "get pod payments-auth-7d9f8c6b4-xq2n1 — verbs limited to get/list/watch.",
        status: "ok",
        meta: { tool: "k8s-read", permission: "allow" },
      },
      {
        id: "h6",
        at: "2026-08-09T08:12:18Z",
        domain: "api",
        label: "API path · kube-apiserver",
        detail: "Read-only API call to fs-prod-k8s; latency 41ms; no secret material returned.",
        status: "ok",
        meta: { cluster: "fs-prod-k8s", latencyMs: 41 },
      },
      {
        id: "h7",
        at: "2026-08-09T08:12:41Z",
        domain: "evidence",
        label: "Evidence sealed",
        detail: "Previous logs + change correlation hashed into evidence channel.",
        status: "ok",
        meta: { artifacts: "ev-clb-1,ev-clb-2,ev-clb-3" },
      },
      {
        id: "h8",
        at: "2026-08-09T08:13:28Z",
        domain: "verification",
        label: "Validator Agent",
        detail: "Independent validation: missing AUTH_JWKS_URI accepted; OOM rejected. Confidence 94%.",
        status: "ok",
        meta: { confidence: 94 },
      },
      {
        id: "h9",
        at: "2026-08-09T08:13:40Z",
        domain: "policy",
        label: "OPA · ConfigMap patch",
        detail: "REQUIRE APPROVAL for production configmap.patch. Kill switch idle.",
        status: "warn",
        meta: { decision: "REQUIRE_APPROVAL" },
      },
      {
        id: "h10",
        at: "2026-08-09T08:13:44Z",
        domain: "approval",
        label: "Approval queued",
        detail: "apr-clb-01 pending Platform Engineering + Change Manager. No remediator write yet.",
        status: "pending",
        meta: { approvalId: "apr-clb-01" },
      },
      {
        id: "h11",
        at: "2026-08-09T08:13:44Z",
        domain: "action",
        label: "Remediation held",
        detail: "Deterministic workflow not started. Stage-1 exit: investigate + prove + decide only.",
        status: "blocked",
        meta: { engine: "StackStorm", started: "false" },
      },
    ],
  },
  {
    id: "exec-4821-01",
    incidentId: "inc-4821",
    tenantId: "tn-nordic",
    customerId: "cu-fsprod",
    agentId: "ag-kubernetes-01",
    model: "claude-sonnet-4.5",
    tool: "k8s-read",
    autonomyLevel: "L2",
    status: "complete",
    startedAt: "2026-08-02T06:41:12Z",
    endedAt: "2026-08-02T06:48:02Z",
    summary:
      "NotReady / ErrImagePull investigation with full evidence seal and SSL-exclusion recommendation.",
    tokens: 48210,
    costUsd: 1.84,
    confidence: 88,
    approvalId: "apr-302",
    auditCorrelationId: "corr-4821-a1",
    hops: [
      {
        id: "e1",
        at: "2026-08-02T06:41:12Z",
        domain: "prompt",
        label: "Operator prompt",
        detail: "Why is fs-prod-cs-tool2 NotReady?",
        status: "ok",
      },
      {
        id: "e2",
        at: "2026-08-02T06:41:12Z",
        domain: "security",
        label: "Prompt firewall",
        detail: "Injection score 0.01 · tenant boundary enforced.",
        status: "ok",
      },
      {
        id: "e3",
        at: "2026-08-02T06:41:13Z",
        domain: "agent",
        label: "Kubernetes Agent",
        detail: "ag-kubernetes-01 · skill=node-notready.",
        status: "ok",
      },
      {
        id: "e4",
        at: "2026-08-02T06:41:14Z",
        domain: "model",
        label: "Model Gateway",
        detail: "Anthropic claude-sonnet-4.5 · EU residency.",
        status: "ok",
        meta: { latencyMs: 384, tokens: 18240 },
      },
      {
        id: "e5",
        at: "2026-08-02T06:41:38Z",
        domain: "mcp",
        label: "MCP · k8s-read",
        detail: "get node fs-prod-cs-tool2 → NotReady.",
        status: "ok",
      },
      {
        id: "e6",
        at: "2026-08-02T06:43:04Z",
        domain: "mcp",
        label: "MCP · log-reader",
        detail: "kubelet journal redacted · 412 lines.",
        status: "ok",
      },
      {
        id: "e7",
        at: "2026-08-02T06:45:33Z",
        domain: "approval",
        label: "Egress probe approval",
        detail: "net-diag probe approved by Network Operations.",
        status: "ok",
        meta: { approvalId: "apr-302" },
      },
      {
        id: "e8",
        at: "2026-08-02T06:48:02Z",
        domain: "verification",
        label: "RCA sealed",
        detail: "Confidence 88% · SSL-inspection exclusion recommended; no console write.",
        status: "ok",
        meta: { confidence: 88 },
      },
    ],
  },
];

export function getExecutionTrace(id: string) {
  return executionTraces.find((t) => t.id === id);
}

export function getExecutionByIncident(incidentId: string) {
  return executionTraces.find((t) => t.incidentId === incidentId);
}
