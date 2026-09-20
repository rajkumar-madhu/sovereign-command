#!/usr/bin/env bash
# Gate shell commands that target Sovereign deploy hosts or are clearly destructive.
# - deny: high-risk destructive remote/cluster operations
# - ask: deploy/sync/apply against 187.127.118.240 or sovereign.* hosts
# - allow: everything else
# failClosed is set in hooks.json — always emit valid JSON on exit 0.

set -euo pipefail

input=$(cat || true)

if ! command -v jq >/dev/null 2>&1; then
  # Without jq we cannot safely inspect the command; deny under failClosed policy.
  printf '%s\n' '{
  "permission": "deny",
  "user_message": "Deploy safety hook requires jq on PATH.",
  "agent_message": "sovereign-deploy-gate.sh could not run: jq missing."
}'
  exit 0
fi

command=$(printf '%s' "$input" | jq -r '.command // empty')

if [[ -z "$command" ]]; then
  printf '%s\n' '{ "permission": "allow" }'
  exit 0
fi

# Host / IP markers for the Sovereign A-record target.
targets_re='187\.127\.118\.240|sovereign\.api\.wecrew\.in|sovereign\.wecrew\.in'

is_target=0
if [[ "$command" =~ $targets_re ]]; then
  is_target=1
fi

# Destructive patterns — always deny when they also touch the target host,
# and deny a few global foot-guns regardless of host.
deny=0
deny_reason=""

if [[ "$command" =~ git[[:space:]]+push[[:space:]]+.*--force|--force-with-lease ]] && [[ "$command" =~ (main|master) ]]; then
  deny=1
  deny_reason="Refusing force-push to main/master (Lovable-linked history)."
elif [[ $is_target -eq 1 ]]; then
  if [[ "$command" =~ (^|[[:space:];|&])(rm[[:space:]]+-[a-zA-Z]*f|mkfs\.|dd[[:space:]]+if=|shutdown|reboot|wipefs) ]]; then
    deny=1
    deny_reason="Refusing destructive filesystem/power command against the Sovereign deploy host."
  elif [[ "$command" =~ kubectl([[:space:]]|$) ]] && [[ "$command" =~ delete[[:space:]]+(ns|namespace|pvc|pv|crd)([[:space:]]|$) ]]; then
    deny=1
    deny_reason="Refusing cluster-destructive kubectl delete against the Sovereign deploy host."
  elif [[ "$command" =~ docker[[:space:]]+system[[:space:]]+prune|kind[[:space:]]+delete[[:space:]]+cluster ]]; then
    deny=1
    deny_reason="Refusing cluster/image wipe against the Sovereign deploy host."
  fi
fi

if [[ $deny -eq 1 ]]; then
  jq -nc \
    --arg um "$deny_reason" \
    --arg am "Blocked by sovereign-deploy-gate: $deny_reason Command: $command" \
    '{permission:"deny", user_message:$um, agent_message:$am}'
  exit 0
fi

# Ask before deploy / remote change operations aimed at the Sovereign host.
ask=0
if [[ $is_target -eq 1 ]]; then
  if [[ "$command" =~ (^|[[:space:];|&])(ssh|scp|rsync|kubectl|helm|docker|kind)([[:space:]]|$) ]] \
    || [[ "$command" =~ (deploy|rollout|apply|load[[:space:]]+docker-image) ]]; then
    ask=1
  fi
fi

# Also ask for classic agents.ops sync path when it mentions the known prod IP alias set.
if [[ "$command" =~ wecrew-anypoint ]] && [[ "$command" =~ (rsync|ssh|kubectl|kind[[:space:]]+load|docker[[:space:]]+build) ]]; then
  ask=1
fi

if [[ $ask -eq 1 ]]; then
  jq -nc \
    --arg um "This command may deploy or change Sovereign production (187.127.118.240 / sovereign*.wecrew.in / wecrew-anypoint). Review before continuing." \
    --arg am "Deploy gate: ask user before running against Sovereign targets. Command: $command" \
    '{permission:"ask", user_message:$um, agent_message:$am}'
  exit 0
fi

printf '%s\n' '{ "permission": "allow" }'
exit 0
