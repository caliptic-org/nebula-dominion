#!/usr/bin/env bash
# Redis backup — copies AOF + RDB snapshot to the backup disk
# Schedule: Every 15 minutes (RDB trigger via BGSAVE + copy AOF)
# Redis is already configured with AOF appendonly=yes + RDB saves in redis.conf
set -euo pipefail

REDIS_CLI="${REDIS_CLI:-redis-cli}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_AUTH="${REDIS_AUTH:-}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
BACKUP_DIR="${REDIS_BACKUP_DIR:-/backup/redis}"
RETENTION_DAYS="${REDIS_BACKUP_RETENTION_DAYS:-7}"
LOG_FILE="/var/log/nebula-backup/redis-backup.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }
alert() {
  log "ERROR: $*"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":rotating_light: *Redis Backup FAILED* on $(hostname): $*\"}" || true
  fi
}

rcli() {
  if [[ -n "$REDIS_AUTH" ]]; then
    "$REDIS_CLI" -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_AUTH" "$@"
  else
    "$REDIS_CLI" -h "$REDIS_HOST" -p "$REDIS_PORT" "$@"
  fi
}

TIMESTAMP=$(date -u '+%Y%m%dT%H%M%SZ')
DEST="$BACKUP_DIR/$TIMESTAMP"
mkdir -p "$DEST"

log "Triggering BGSAVE on Redis $REDIS_HOST:$REDIS_PORT"
rcli BGSAVE > /dev/null

# Wait for BGSAVE to complete (max 120s)
for i in $(seq 1 120); do
  STATUS=$(rcli LASTSAVE)
  sleep 1
  NEW_STATUS=$(rcli LASTSAVE)
  if [[ "$NEW_STATUS" != "$STATUS" ]] || [[ "$i" -ge 5 ]]; then
    # BGSAVE finished or stable — proceed
    break
  fi
done

# Confirm no bgsave in progress
if rcli INFO persistence | grep -q "rdb_bgsave_in_progress:1"; then
  alert "BGSAVE still running after 120s — skipping RDB copy"
  exit 1
fi

# Copy RDB dump
RDB_FILE="$REDIS_DATA_DIR/dump.rdb"
if [[ -f "$RDB_FILE" ]]; then
  cp "$RDB_FILE" "$DEST/dump.rdb"
  log "RDB snapshot copied: $DEST/dump.rdb ($(du -sh "$DEST/dump.rdb" | cut -f1))"
else
  log "WARNING: RDB file not found at $RDB_FILE"
fi

# Copy AOF (appendonly.aof or appendonly.aof.* for multi-part AOF)
if ls "$REDIS_DATA_DIR"/appendonly.aof* 1>/dev/null 2>&1; then
  cp "$REDIS_DATA_DIR"/appendonly.aof* "$DEST/"
  log "AOF file(s) copied to $DEST"
else
  log "WARNING: AOF files not found in $REDIS_DATA_DIR"
fi

# Compress backup
tar -czf "$BACKUP_DIR/redis-$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$DEST"
log "Backup compressed: $BACKUP_DIR/redis-$TIMESTAMP.tar.gz"

# Prune old backups
find "$BACKUP_DIR" -name "redis-*.tar.gz" -mtime "+$RETENTION_DAYS" -delete
log "Old backups pruned (retention: ${RETENTION_DAYS}d)"

log "Redis backup completed successfully"
