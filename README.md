# Sovereign Command

Build a stakeholder-ready full-stack TypeScript SaaS MVP called Sovereign Agentic Operations OS. It is a vendor-neutral, multi-tenant, read-only Agent OS for regulated hybrid infrastructure. Use Tailwind and shadcn/ui with a professional light enterprise command-center design: white background, subtle gray surfaces, restrained blue accent, semantic green/yellow/red, collapsible sidebar, top tenant/customer/environment selectors, global search, notifications, user profile, breadcrumbs, responsive mobile layout.

Create these working pages with realistic seed data and local interactions: Login; Global Command Centre; Customer Management and Customer Detail; Agent Registry; Agent Detail with Overview, Passport, Capabilities, Tools, Models, Executions, Security Events, Cost, Audit tabs; Investigations; Incident Workspace; Evidence Viewer; RCA Report; Agent Security SOC; Token & Cost; Model Gateway; Tool & MCP Registry; Policy Management; Audit & Compliance; Settings.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f1a3dee-638d-4da2-bc2b-1b9cd8783283).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js / [Bun](https://bun.sh) — or npm via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
bun install   # or: npm i
bun run dev   # http://127.0.0.1:5173
```

## Live Stage-1 Control Tower (optional)

When AEGIS compose is running, `/control-tower/exec-clb-01` can show the live runner output instead of the seed fixture. Production stays on seed unless `VITE_STAGE1_API_URL` is set at build time.

```sh
# in wecrew-aegis
make compose-stage1

# in this repo
VITE_STAGE1_API_URL=http://127.0.0.1:8091 bun run dev
```

Stage-1 still holds the remediator (investigate + prove + decide only).

## Self-hosted deploy

Production SSR build uses Nitro `node-server` (not Cloudflare). On this Mac use Colima for Docker.

```sh
# Docker (recommended)
colima status || colima start
docker context use colima
docker compose up --build
# → http://127.0.0.1:3080/login

# Without Docker
bun install
bun run build:selfhost
PORT=3080 bun run start   # node .output/server/index.mjs
# → http://127.0.0.1:3080
```

`bun run build` (no preset) still targets Cloudflare/Lovable. `preview` / `start` serve the self-host `.output` Node server (default Nitro port **3000**; compose maps host **3080** to avoid local conflicts).

## Production aliases: agents.ops / sovereign.ops

This polished Sovereign Command UI is deployed separately from WeCrew Agent OS:

- **agents.ops.wecrew.in** / **sovereign.ops.wecrew.in** → Sovereign Command (`deploy/agents-ops/`)
- **agentos.wecrew.in** → existing Agent OS (unchanged)

See [deploy/agents-ops/README.md](deploy/agents-ops/README.md) for Traefik + kind steps.

## Local self-hosted workflow (not Lovable)

Work from this Desktop tree (or any clone). **Source of truth for production** is this code + `/opt/wecrew/sovereign-command` on `wecrew-anypoint` (kept in sync via rsync). GitHub `rajkumar-madhu/sovereign-command` is the Lovable-linked remote — do **not** force-push over it.

### Pull production tree from the server

```sh
cd ~/Desktop/sovereign-command-main
rsync -az --delete \
  --exclude node_modules --exclude .output --exclude .git \
  --exclude .wrangler --exclude .tanstack --exclude .nitro \
  --exclude dist --exclude tmp-screenshots \
  wecrew-anypoint:/opt/wecrew/sovereign-command/ ./
bun install
bun run dev
```

### Push local → server and redeploy agents.ops / sovereign.ops

```sh
cd ~/Desktop/sovereign-command-main
rsync -az --delete \
  --exclude node_modules --exclude .output --exclude .git \
  --exclude .wrangler --exclude .tanstack --exclude .nitro \
  --exclude dist --exclude tmp-screenshots \
  ./ wecrew-anypoint:/opt/wecrew/sovereign-command/

ssh wecrew-anypoint 'cd /opt/wecrew/sovereign-command && docker build -t sovereign-command:agents-ops .'
ssh wecrew-anypoint 'kind load docker-image sovereign-command:agents-ops --name wecrew \
  && kubectl apply -f /opt/wecrew/sovereign-command/deploy/agents-ops/k8s.yaml \
  && kubectl -n sovereign-command rollout status deploy/sovereign-command --timeout=180s'
```

### Git notes

- Local may be a plain `git init` with `origin` → `https://github.com/rajkumar-madhu/sovereign-command.git` for fetch/PR workflows.
- Commit/push only when you intend to sync Lovable; prefer a feature branch, never `git push --force` to `main`.
