# Sovereign Command

**Sovereign Agentic Operations OS** — multi-tenant, vendor-neutral agent operations console for regulated hybrid infrastructure.

## Features

- Command Centre (tenants, agents, incidents, SLA, cost)
- Customer management
- Agent registry & passport
- Investigations, incident workspace, evidence, RCA
- Security SOC, token/cost, model gateway, MCP tools
- Policy management, approvals, audit & compliance
- Settings

## Development

```bash
git clone https://gitlab.com/rajkumar.madhu2021/sovereign-command.git
cd sovereign-command
bun install   # or npm install
bun run dev   # http://127.0.0.1:5173
```

## Production build (Node)

```bash
bun install --frozen-lockfile
bun run build:prod          # NITRO_PRESET=node-server
bun run start               # node .output/server/index.mjs  → :3000
```

Output:

| Path | Purpose |
|------|---------|
| `.output/public/` | Static assets (CSS/JS) |
| `.output/server/index.mjs` | Node production server |

### Docker

```bash
docker build -t sovereign-command:prod .
docker run --rm -p 3000:3000 sovereign-command:prod
# or
docker compose -f docker-compose.prod.yml up --build
```

### Cloudflare Workers (optional)

```bash
bun run build:cloudflare
npx wrangler deploy
```

### CI

GitLab CI (`.gitlab-ci.yml`) runs `build:prod` on default branch and MRs.

## Remotes

| Host | URL |
|------|-----|
| GitLab | https://gitlab.com/rajkumar.madhu2021/sovereign-command |
| GitHub | https://github.com/rajkumar-madhu/sovereign-command |
