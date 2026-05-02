#!/usr/bin/env bash
# Tier 2 — Daily PostgreSQL backup via pgBackRest (local disk, repo1)
# Schedule: Every night at 03:00
# Full backup: Sunday | Incremental: Mon-Sat
# RTO target: <1h | RPO target: <5min (WAL archiving fills the gap)
set -euo pipefail

STANZA="nebula"
REPO="--repo=1"
LOG_FILE="/var/log/pgbackrest/tier2-backup.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }
alert() {
  log "ERROR: $*"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":rotating_light: *pgBackRest Tier2 FAILED* on $(hostname): $*\"}" || true
  fi
}

DOW=$(date +%u)  # 1=Monday … 7=Sunday

if [[ "$DOW" -eq 7 ]]; then
  BACKUP_TYPE="full"
else
  BACKUP_TYPE="incr"
fi

log "Starting $BACKUP_TYPE backup (Tier 2 / repo1)"

# Take backup from the standby to avoid I/O impact on primary
if ! pgbackrest --stanza="$STANZA" $REPO \
    --backup-standby \
    --type="$BACKUP_TYPE" \
    backup >> "$LOG_FILE" 2>&1; then
  alert "pgBackRest $BACKUP_TYPE backup failed — check $LOG_FILE"
  exit 1
fi

log "pgBackRest $BACKUP_TYPE backup completed successfully"

# Verify the latest backup is consistent
log "Running backup verification"
if ! pgbackrest --stanza="$STANZA" $REPO verify >> "$LOG_FILE" 2>&1; then
  alert "pgBackRest backup verification failed after $BACKUP_TYPE backup"
  exit 1
fi

log "Backup verification passed"

# Prune archives according to retention policy in pgbackrest.conf
pgbackrest --stanza="$STANZA" $REPO expire >> "$LOG_FILE" 2>&1 || true

# Emit Prometheus metric via pushgateway (optional)
PUSHGW="${PROMETHEUS_PUSHGATEWAY:-}"
if [[ -n "$PUSHGW" ]]; then
  cat <<EOF | curl -s --data-binary @- "$PUSHGW/metrics/job/pgbackrest/instance/$(hostname)"
# HELP pgbackrest_last_backup_timestamp_seconds Unix timestamp of last successful backup
# TYPE pgbackrest_last_backup_timestamp_seconds gauge
pgbackrest_last_backup_timestamp_seconds{type="$BACKUP_TYPE",repo="1"} $(date +%s)
EOF
fi

log "Tier 2 backup job finished"
