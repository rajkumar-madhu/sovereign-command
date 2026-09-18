#!/usr/bin/env bash
# Inject Sovereign deploy host context at session start.
# Fail open: empty/invalid output must not break the agent.

set -euo pipefail

# Consume stdin (session payload) so the pipe doesn't hang.
cat >/dev/null || true

cat <<'EOF'
{
  "env": {
    "SOVEREIGN_DEPLOY_IP": "187.127.118.240",
    "SOVEREIGN_DEPLOY_HOSTS": "sovereign.wecrew.in,sovereign.api.wecrew.in"
  },
  "additional_context": "Sovereign production deploy targets (Hostinger A records):\n- sovereign.wecrew.in → 187.127.118.240\n- sovereign.api.wecrew.in → 187.127.118.240\n\nPrefer documented agents.ops / sovereign.ops kind deploy on wecrew-anypoint when that path applies. Before any ssh/rsync/kubectl/docker deploy to 187.127.118.240 or the sovereign.* hosts, wait for explicit user approval (beforeShellExecution gate)."
}
EOF

exit 0
