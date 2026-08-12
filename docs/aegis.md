# WeCrew AEGIS™ Product Freeze

Version 4.0 · 9 August 2026 · Confidential product strategy

**North-star:** WeCrew is a Sovereign Autonomous Operations OS that understands the estate, investigates with governed AI agents, proves RCA with evidence, remediates within policy, and learns — entirely inside the customer trust boundary.

Live docs: [/docs/aegis](https://sovereign.ops.wecrew.in/docs/aegis) · Stage-1 demo: [/demo/vertical-slice](https://sovereign.ops.wecrew.in/demo/vertical-slice)

---

## Product-family rule

Keep distinct applications; sell and operate them as **one platform family**. Do not sell 18 unrelated products.

Core modules: Command Center, WeCrew ITSM, AlertMind, Agent OS, AI Control Tower, AgentSecOps, OpsGraph / ChangeGraph, Evidence & RCA, Knowledge Copilot, Incident Memory, Predictive Ops, Sovereign Control, Workflow Studio, AutoRemediate, AI Evaluation, AI FinOps, MCP / Integration Hub.

## Sovereign Mode

- No external inference / embedding / reranking
- No external telemetry of prompts or traces
- Ollama initially behind WeCrew Model Gateway (portable)
- No tool credentials inside model context

## Stage-1 exit (thin vertical slice)

One tenant · one read-only agent · one local model · one tool · one approval · one immutable execution ID.

Demo path in this console:

1. [CrashLoopBackOff incident](/incidents/inc-clb-01)
2. [Execution `exec-clb-01`](/control-tower/exec-clb-01)
3. [Approval `apr-clb-01`](/approvals)

## What Wecrew Ops (`sovereign.ops`) is

Command Center / Agent OS **experience layer** with seed demo for investigations, evidence-backed RCA, SOC, model/tool registries, approvals, and AI Control Tower. ITSM remains the system of record outside this app.

## Moat (build these, don’t rebundle OSS)

ACL-safe knowledge · OpsGraph/ChangeGraph · evidence-backed RCA · agent/tool security · AI Control Tower correlation · signed approvals · deterministic remediation · verified recovery.
