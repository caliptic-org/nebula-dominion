#!/usr/bin/env bash
# Backup Health Check — runs every 30 minutes
# Checks freshness of all backup components and pushes metrics to Prometheus Pushgateway
# Alerts via Slack on any staleness or failure
set -euo pipefail

LOG_FILE="/var/log/nebula-backup/health-check.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
PUSHGW="${PROMETHEUS_PUSHGATEWAY:-}"
HOSTNAME=$(hostname)

# Thresholds (minutes)
PG_BACKUP_MAX_AGE_MIN=1500      # 25h — daily backup should be <25h old
PG_WAL_ARCHIVE_MAX_AGE_MIN=5    # WAL archiving: last archive <5min
REDIS_BACKUP_MAX_AGE_MIN=20     # Redis backup <20min (scheduled every 15min)
RESTIC_BACKUP_MAX_AGE_MIN=1500  # Config backup <25h
MINIO_REPLICATION_FAIL_MAX=100  # Max acceptable failed replications per bucket

mkdir -p "$(dirname "$LOG_FILE")"

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" >> "$LOG_FILE"; }
alert() {
  log "ALERT: $*"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":warning: *Backup Health Alert* ($HOSTNAME): $*\"}" || true
  fi
}

push_metric() {
  local NAME="$1"
  local VALUE="$2"
  local HELP="${3:-}"
  local TYPE="${4:-gauge}"
  if [[ -n "$PUSHGW" ]]; then
    printf "# HELP %s %s\n# TYPE %s %s\n%s %s\n" \
      "$NAME" "$HELP" "$NAME" "$TYPE" "$NAME" "$VALUE" \
      | curl -s --data-binary @- "$PUSHGW/metrics/job/nebula_backup/instance/$HOSTNAME" || true
  fi
}

NOW=$(date +%s)
ALERTS=0

# ────────────────────────────────────────────────
# CHECK 1: pgBackRest — last successful backup age
# ────────────────────────────────────────────────
PG_LAST_BACKUP_TIME=$(pgbackrest --stanza=nebula --repo=1 --output=json info 2>/dev/null \
  | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  backups = data[0].get('backup', [])
  if backups:
    ts = backups[-1]['timestamp']['stop']
    print(ts)
  else:
    print(0)
except Exception:
  print(0)
" 2>/dev/null || echo 0)

if [[ "$PG_LAST_BACKUP_TIME" -gt 0 ]]; then
  PG_AGE_MIN=$(( (NOW - PG_LAST_BACKUP_TIME) / 60 ))
  push_metric "nebula_backup_pg_last_success_age_minutes" "$PG_AGE_MIN" "Minutes since last successful pgBackRest backup"
  if [[ "$PG_AGE_MIN" -gt "$PG_BACKUP_MAX_AGE_MIN" ]]; then
    alert "PostgreSQL backup is ${PG_AGE_MIN}m old (threshold: ${PG_BACKUP_MAX_AGE_MIN}m)"
    ALERTS=$((ALERTS + 1))
  else
    log "OK: pgBackRest last backup ${PG_AGE_MIN}m ago"
  fi
else
  alert "Could not determine pgBackRest last backup time"
  ALERTS=$((ALERTS + 1))
fi

# ────────────────────────────────────────────────
# CHECK 2: pgBackRest WAL archive lag (RPO indicator)
# ────────────────────────────────────────────────
ARCHIVE_STATUS=$(pgbackrest --stanza=nebula --output=json archive-get \
  "$(sudo -u postgres psql -t -c "SELECT pg_walfile_name(pg_current_wal_lsn());" 2>/dev/null | tr -d ' \n')" \
  /tmp/wal-check-dummy 2>&1 || true)

# Check pg_stat_archiver for last archive time
PG_LAST_ARCHIVE=$(sudo -u postgres psql -t -c \
  "SELECT EXTRACT(EPOCH FROM last_archived_time)::bigint FROM pg_stat_archiver;" \
  2>/dev/null | tr -d ' \n' || echo 0)

if [[ "$PG_LAST_ARCHIVE" -gt 0 ]]; then
  WAL_AGE_MIN=$(( (NOW - PG_LAST_ARCHIVE) / 60 ))
  push_metric "nebula_backup_pg_wal_archive_age_minutes" "$WAL_AGE_MIN" "Minutes since last WAL segment archived"
  if [[ "$WAL_AGE_MIN" -gt "$PG_WAL_ARCHIVE_MAX_AGE_MIN" ]]; then
    alert "PostgreSQL WAL archive lag is ${WAL_AGE_MIN}m (RPO risk! threshold: ${PG_WAL_ARCHIVE_MAX_AGE_MIN}m)"
    ALERTS=$((ALERTS + 1))
  else
    log "OK: WAL archiving lag ${WAL_AGE_MIN}m"
  fi
fi

# ────────────────────────────────────────────────
# CHECK 3: Redis backup freshness
# ────────────────────────────────────────────────
LATEST_REDIS=$(ls -t /backup/redis/redis-*.tar.gz 2>/dev/null | head -1 || true)
if [[ -n "$LATEST_REDIS" ]]; then
  REDIS_AGE_MIN=$(( (NOW - $(stat -c %Y "$LATEST_REDIS")) / 60 ))
  push_metric "nebula_backup_redis_last_success_age_minutes" "$REDIS_AGE_MIN" "Minutes since last Redis backup"
  if [[ "$REDIS_AGE_MIN" -gt "$REDIS_BACKUP_MAX_AGE_MIN" ]]; then
    alert "Redis backup is ${REDIS_AGE_MIN}m old (threshold: ${REDIS_BACKUP_MAX_AGE_MIN}m)"
    ALERTS=$((ALERTS + 1))
  else
    log "OK: Redis backup ${REDIS_AGE_MIN}m ago"
  fi
else
  alert "No Redis backup files found"
  ALERTS=$((ALERTS + 1))
fi

# ────────────────────────────────────────────────
# CHECK 4: Restic config backup
# ────────────────────────────────────────────────
if [[ -n "${RESTIC_REPOSITORY:-}" ]]; then
  RESTIC_LAST=$(restic -r "$RESTIC_REPOSITORY" snapshots --last --tag config --json 2>/dev/null \
    | python3 -c "
import sys, json, datetime
try:
  snaps = json.load(sys.stdin)
  if snaps:
    t = datetime.datetime.fromisoformat(snaps[-1]['time'].replace('Z', '+00:00'))
    print(int(t.timestamp()))
  else:
    print(0)
except Exception:
  print(0)
" 2>/dev/null || echo 0)

  if [[ "$RESTIC_LAST" -gt 0 ]]; then
    RESTIC_AGE_MIN=$(( (NOW - RESTIC_LAST) / 60 ))
    push_metric "nebula_backup_restic_config_age_minutes" "$RESTIC_AGE_MIN" "Minutes since last Restic config backup"
    if [[ "$RESTIC_AGE_MIN" -gt "$RESTIC_BACKUP_MAX_AGE_MIN" ]]; then
      alert "Restic config backup is ${RESTIC_AGE_MIN}m old (threshold: ${RESTIC_BACKUP_MAX_AGE_MIN}m)"
      ALERTS=$((ALERTS + 1))
    else
      log "OK: Restic config backup ${RESTIC_AGE_MIN}m ago"
    fi
  fi
fi

# ────────────────────────────────────────────────
# CHECK 5: Disk space on backup disk
# ────────────────────────────────────────────────
BACKUP_DISK_USAGE=$(df /backup 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%' || echo 0)
push_metric "nebula_backup_disk_usage_percent" "$BACKUP_DISK_USAGE" "Backup disk usage percent"
if [[ "$BACKUP_DISK_USAGE" -gt 85 ]]; then
  alert "Backup disk usage is ${BACKUP_DISK_USAGE}% (threshold: 85%)"
  ALERTS=$((ALERTS + 1))
else
  log "OK: Backup disk usage ${BACKUP_DISK_USAGE}%"
fi

# ────────────────────────────────────────────────
# Summary metric
# ────────────────────────────────────────────────
push_metric "nebula_backup_health_check_alerts_total" "$ALERTS" "Total active backup health alerts"
push_metric "nebula_backup_health_check_last_run_timestamp" "$NOW" "Unix timestamp of last health check run"

log "Health check complete — $ALERTS alert(s)"
