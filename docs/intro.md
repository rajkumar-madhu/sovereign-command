# Intro to Wecrew Ops

Wecrew Ops is a vendor-neutral, multi-tenant, **read-only** agent operations plane for regulated hybrid infrastructure. It shows what agents are doing, what they are allowed to do, and why something broke — with evidence you can take to audit.

Live product: [sovereign.ops.wecrew.in](https://sovereign.ops.wecrew.in) · Docs UI: [/docs](https://sovereign.ops.wecrew.in/docs) · AEGIS freeze: [/docs/aegis](https://sovereign.ops.wecrew.in/docs/aegis) · Stage-1 slice: [/demo/vertical-slice](https://sovereign.ops.wecrew.in/demo/vertical-slice)

---

## Live at sovereign.ops

- **Command Centre** — estate pulse, incidents, and scoped platform filters.
- **Agent passports** — identity, budgets, and orchestration context in Agent details.
- **Investigate** — evidence, host/IP identity, time windows, and RCA packages.
- **Govern** — SOC, approvals, policy, model gateway, and audit.

Looking to open the console? Visit [sign-in](https://sovereign.ops.wecrew.in/login) or continue without an account for the product demo.

---

## Two ways to use Wecrew Ops

| | Product console | Self-hosted estate |
| --- | --- | --- |
| **What it is** | Hosted UI at sovereign.ops / agents.ops with demo seed and read-only sessions | Same application image on your Kind / K3s cluster behind your Traefik / ingress |
| **Best for** | Evaluation, training, and stakeholder walkthroughs | Regulated estates that must keep agent ops data on-prem |
| **Learn more** | [Sign in / demo](https://sovereign.ops.wecrew.in/login) | [Deploy guide](https://github.com/rajkumar-madhu/sovereign-command) |

---

## Recommended path for new operators

1. **Open the console** — Sign in or start a demo session. Scope tenant, customer, and environment from the top bar. → [/login](https://sovereign.ops.wecrew.in/login)
2. **Read the Command Centre** — Fleet health, open incidents, SLA risk, and spend. → [/command](https://sovereign.ops.wecrew.in/command)
3. **Trust every agent passport** — Signed identity, autonomy, budgets, blocked actions, orchestration context. → [/agents](https://sovereign.ops.wecrew.in/agents)
4. **Investigate with evidence** — Incident workspace, artefacts, and RCA. → [/incidents/inc-4821](https://sovereign.ops.wecrew.in/incidents/inc-4821)
5. **Govern with an audit trail** — Approvals, policy, SOC, audit. → [/approvals](https://sovereign.ops.wecrew.in/approvals)

---

## Operate with Wecrew Ops

- **Product demo** — Live console with seeded Nordic Federated Bank production scope.
- **Self-hosted deploy** — Same UI on your cluster; data stays inside your network.
- **Contact** — [support@wecrew.in](mailto:support@wecrew.in)

---

## Key capabilities

- **Language of operations** — Summarize fleet state and surface passport, budget, and incident context.
- **Evidence & visuals** — Host/IP/application identity, timelines, graphs, hash-verified artefacts.
- **Agent governance** — Passports, orchestration routing, SOC, approvals, and policy without production write from the UI.

---

## Support

- Email: [support@wecrew.in](mailto:support@wecrew.in)
- Product overview: [sovereign.ops.wecrew.in](https://sovereign.ops.wecrew.in/)

© 2026 Wecrew Ops · Read-only · vendor neutral · multi-tenant
