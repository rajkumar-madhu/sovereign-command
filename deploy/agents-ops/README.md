# agents.ops / sovereign.ops — Sovereign Command (distinct UI)

## Purpose

`https://agents.ops.wecrew.in` and `https://sovereign.ops.wecrew.in` serve the **Sovereign Agentic Operations OS** UI from this repo (same Deployment/Service).

`https://agentos.wecrew.in` remains the existing **WeCrew DevOps Agent OS** deployment (`namespace/agentos`).

They must not share the same frontend workload.

## Traffic path

1. DNS (Hostinger A records `agents.ops` / `sovereign.ops` → `213.210.36.154`) → Traefik on `wecrew-anypoint`
2. Traefik LE TLS → kind ingress-nginx `:8080`:
   - `/docker/traefik/dynamic/agents-ops-wecrew.yml` — Host `agents.ops.wecrew.in`
   - `/docker/traefik/dynamic/sovereign-ops-wecrew.yml` — Host `sovereign.ops.wecrew.in`
3. Ingress `sovereign-command/sovereign-command-agents-ops` (both hosts) → Service `sovereign-command` → Deployment image `sovereign-command:agents-ops`

`agentos.wecrew.in` stays on Ingress `agentos/agentos` → Deployment `agentos` (unchanged).

## Deploy / refresh (on wecrew-anypoint)

```bash
# 1) Sync source (from Mac)
rsync -az --delete \
  --exclude node_modules --exclude .output --exclude .git \
  --exclude .wrangler --exclude .tanstack --exclude .nitro \
  --exclude dist --exclude tmp-screenshots \
  ./ wecrew-anypoint:/opt/wecrew/sovereign-command/

# 2) Build amd64 image on the host
ssh wecrew-anypoint 'cd /opt/wecrew/sovereign-command && docker build -t sovereign-command:agents-ops .'

# 3) Load into kind + apply manifests
ssh wecrew-anypoint 'kind load docker-image sovereign-command:agents-ops --name wecrew \
  && kubectl apply -f /opt/wecrew/sovereign-command/deploy/agents-ops/k8s.yaml \
  && kubectl -n agentos delete ingress agentos-agents-ops --ignore-not-found \
  && kubectl -n sovereign-command rollout status deploy/sovereign-command --timeout=180s'
```

## Verify

```bash
curl -sI https://agents.ops.wecrew.in/login | head -5
curl -sI https://sovereign.ops.wecrew.in/login | head -5
curl -s https://agents.ops.wecrew.in/login | rg -o '<title>[^<]+</title>'
curl -s https://sovereign.ops.wecrew.in/login | rg -o '<title>[^<]+</title>'
# expect: Sign in · Sovereign Agentic Operations OS

curl -s https://agentos.wecrew.in/login | rg -o '<title>[^<]+</title>'
# expect: Mission Control / Sign in — Wecrew DevOps Agent OS (unchanged)
```

## Visual difference (expected)

| | agentos.wecrew.in | agents.ops / sovereign.ops |
|---|---|---|
| Product title | Mission Control — Wecrew DevOps Agent OS | Global Command Centre · Sovereign Agentic Operations OS |
| Author meta | Wecrew | Sovereign |
| Shell | Agent OS persona home | Dual-sidebar command centre + inspector |
| Assets | `/assets/styles-SHcJ_U70.css` (Agent OS build) | Sovereign Command hashed CSS (e.g. `styles-CLJuPi2e.css`) |

## Safety

- Do not point Traefik `agents.ops` / `sovereign.ops` at the `agentos` service.
- Do not modify `ops-wecrew.yml` / `ops.wecrew.in`.
- No secrets in this tree; this UI is seed-data / demo auth only unless wired later.

## Ops notes

- Kind node CPU **requests** are ~99% allocated; this Deployment uses `10m` CPU / `128Mi` memory requests so it can schedule. Raise only after freeing capacity.
- Local Mac Docker image is **arm64**; always build on the amd64 host (or `docker buildx --platform linux/amd64`).
