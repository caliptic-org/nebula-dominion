#!/usr/bin/env bash
# Shared notification helper. Source this file from backup scripts.
# Requires SLACK_WEBHOOK_URL to be set in environment.

notify_slack() {
    local level="$1"
    local message="$2"
    local host
    host="$(hostname -s)"
    local color
    case "$level" in
        success) color="#36a64f" ;;
        warning) color="#ff9900" ;;
        error)   color="#ff0000" ;;
        *)       color="#cccccc" ;;
    esac

    [[ -z "${SLACK_WEBHOOK_URL:-}" ]] && return 0

    local payload
    payload=$(cat <<EOF
{
  "attachments": [{
    "color": "${color}",
    "title": "Nebula Backup — ${host}",
    "text": "${message}",
    "footer": "nebula-dominion backup",
    "ts": $(date +%s)
  }]
}
EOF
)
    curl -s -X POST -H 'Content-type: application/json' \
        --data "$payload" "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
}

notify_success() { notify_slack "success" "✅ $*"; }
notify_warning() { notify_slack "warning" "⚠️  $*"; }
notify_error()   { notify_slack "error"   "🔴 $*"; }
