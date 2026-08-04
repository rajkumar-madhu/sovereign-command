# Sovereign Command

Build a stakeholder-ready full-stack TypeScript SaaS MVP called Sovereign Agentic Operations OS. It is a vendor-neutral, multi-tenant, read-only Agent OS for regulated hybrid infrastructure. Use Tailwind and shadcn/ui with a professional light enterprise command-center design: white background, subtle gray surfaces, restrained blue accent, semantic green/yellow/red, collapsible sidebar, top tenant/customer/environment selectors, global search, notifications, user profile, breadcrumbs, responsive mobile layout.

Create these working pages with realistic seed data and local interactions: Login; Global Command Centre; Customer Management and Customer Detail; Agent Registry; Agent Detail with Overview, Passport, Capabilities, Tools, Models, Executions, Security Events, Cost, Audit tabs; Investigations; Incident Workspace; Evidence Viewer; RCA Report; Agent Security SOC; Token & Cost; Model Gateway; Tool & MCP Registry; Policy Management; Audit & Compliance; Settings.

Priority pages and features:
1. Command Centre metrics for tenants, customers, clusters, nodes, agents, high-risk agents, P1/P2 incidents, SLA risks, prompt injections, pending approvals, monthly tokens/cost, health heatmap, incident timeline, recurring incidents, provider health.
2. Agent Registry table with search/filter/sort/pagination and seed agents: Supervisor, Kubernetes, Linux, Network, Database, Application, Security, Planner, Execution, Verification. Show status, trust score, autonomy, model, tenant, environment, owner, last active.
3. Agent Passport showing signed identity, tenant, environment, owner, allowed tools, blocked actions, autonomy, max steps, token/cost budgets, expiry, signature status, plus suspend/quarantine/kill simulations.
4. Incident Workspace for “Why is fs-prod-cs-tool2 NotReady?” with timeline: tenant validation, node status, conditions, Kubernetes events, kubelet logs, containerd logs, Prometheus metrics, image-pull errors, network evidence, hypotheses, rejected hypotheses, final RCA. Final RCA: registry egress or SSL inspection resetting image-pull traffic; confidence 88%; evidence includes image pull resets, Calico ContainerCreating, registry connectivity failure, existing workloads healthy; recommendation validate outbound TCP 443 and SSL-inspection exclusions; risk low; no production write required.
5. Security SOC with prompt injection, secret access, cross-tenant attempts, malicious MCP tools, token anomalies, loops, failed actions, severity filters and event table.
6. Token & Cost charts: tokens and cost by tenant/model/agent/incident, retry waste, budget remaining, threshold controls.
7. Model Gateway providers OpenAI, Anthropic, Gemini, Azure OpenAI, Bedrock, Ollama, vLLM with status, latency, data residency, cost tier, fallback order, allowed tenants.
8. Tool & MCP registry with owner, version, permissions, security scan, calls, errors, external access, trust score, detail drawer.
9. Editable policy simulations: DB restart requires DBA approval; firewall requires network+security; Kubernetes delete blocked; metrics read allowed; writes blocked during trading hours.
10. Searchable audit logs with correlation ID, user, agent, tenant, tool, action, decision, time, outcome.

Interactions must work: navigation, filters, tabs, selectors, start investigation, suspend/quarantine/kill, approve/reject, policy toggles, tool drawer, budget changes, toasts, dialogs. Add loading, empty, error, and success states. Use strict TypeScript and modular components. Include read-only safety banners: no shell, cluster-admin, secret reads, DB writes, firewall changes, or autonomous remediation. Make it accessible and polished. Do not build a landing page and do not use lorem ipsum.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f1a3dee-638d-4da2-bc2b-1b9cd8783283).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
