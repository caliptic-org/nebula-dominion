#!/usr/bin/env bash
# Tier 3 — Weekly offsite PostgreSQL backup to Hetzner Storage Box (repo2)
# Schedule: Every Sunday at 04:00 (after Tier 2 full completes)
# Full backup only — 4-week retention
set -euo pipefail

STANZA="nebula"
REPO="--repo=2"
LOG_FILE="/var/log/pgbackrest/tier3-offsite.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }
alert() {
  log "ERROR: $*"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":rotating_light: *pgBackRest Tier3 Offsite FAILED* on $(hostname): $*\"}" || true
  fi
}

log "Starting Tier 3 offsite full backup (repo2 / Hetzner Storage Box)"

# Full backup pushed directly to Hetzner Storage Box via SFTP
if ! pgbackrest --stanza="$STANZA" $REPO \
    --backup-standby \
    --type=full \
    backup >> "$LOG_FILE" 2>&1; then
  alert "Tier 3 offsite full backup failed — check $LOG_FILE"
  exit 1
fi

log "Offsite full backup completed"

# Verify
if ! pgbackrest --stanza="$STANZA" $REPO verify >> "$LOG_FILE" 2>&1; then
  alert "Tier 3 offsite backup verification failed"
  exit 1
fi

log "Offsite backup verified"

pgbackrest --stanza="$STANZA" $REPO expire >> "$LOG_FILE" 2>&1 || true

# Slack success notification
if [[ -n "$SLACK_WEBHOOK" ]]; then
  SIZE=$(pgbackrest --stanza="$STANZA" $REPO --output=json info 2>/dev/null \
    | python3 -c "import sys,json; b=json.load(sys.stdin)[0]['backup']; print(b[-1]['info']['size'] if b else 'N/A')" 2>/dev/null || echo "N/A")
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\":white_check_mark: *pgBackRest Tier3 Offsite OK* — weekly full backup done (size: $SIZE bytes)\"}" || true
fi

log "Tier 3 offsite backup job finished"
