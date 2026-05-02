#!/usr/bin/env bash
# Redis Recovery Runbook
# Restores Redis from the most recent AOF+RDB backup
#
# Usage:
#   redis-recovery.sh                        # Restore latest backup
#   redis-recovery.sh --timestamp 20260501T030000Z  # Restore specific snapshot
#
# RTO: ~5 minutes | RPO: ~15 minutes (backup interval)
set -euo pipefail

REDIS_SERVICE="redis-server"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
BACKUP_DIR="${REDIS_BACKUP_DIR:-/backup/redis}"
RECOVERY_LOG="/var/log/nebula-backup/redis-recovery-$(date +%Y%m%dT%H%M%S).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$RECOVERY_LOG"; }
fatal() { log "FATAL: $*"; exit 1; }

notify() {
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":fire: *DR Redis Recovery* on $(hostname): $*\"}" || true
  fi
}

TARGET_TIMESTAMP="${1:-}"

# Find backup file
if [[ -n "$TARGET_TIMESTAMP" ]]; then
  BACKUP_FILE="$BACKUP_DIR/redis-${TARGET_TIMESTAMP}.tar.gz"
  if [[ ! -f "$BACKUP_FILE" ]]; then
    fatal "Backup file not found: $BACKUP_FILE"
  fi
else
  # Use the most recent backup
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/redis-*.tar.gz 2>/dev/null | head -1)
  if [[ -z "$BACKUP_FILE" ]]; then
    fatal "No Redis backup files found in $BACKUP_DIR"
  fi
fi

log "=== Redis Recovery Started ==="
log "Backup file: $BACKUP_FILE"
notify "Redis recovery started on $(hostname) from $BACKUP_FILE"

# Stop Redis
log "Stopping Redis service"
systemctl stop "$REDIS_SERVICE" || true
sleep 2

# Backup current data (just in case)
CURRENT_BACKUP="/tmp/redis-data-before-recovery-$(date +%Y%m%dT%H%M%S)"
if [[ -d "$REDIS_DATA_DIR" ]]; then
  cp -a "$REDIS_DATA_DIR" "$CURRENT_BACKUP"
  log "Current data backed up to $CURRENT_BACKUP"
fi

# Extract backup
TMPDIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TMPDIR"
EXTRACTED_DIR=$(ls "$TMPDIR")

# Restore files
log "Restoring Redis data files"
rm -f "$REDIS_DATA_DIR/dump.rdb"
rm -f "$REDIS_DATA_DIR/appendonly.aof"*

if [[ -f "$TMPDIR/$EXTRACTED_DIR/dump.rdb" ]]; then
  cp "$TMPDIR/$EXTRACTED_DIR/dump.rdb" "$REDIS_DATA_DIR/"
  chown redis:redis "$REDIS_DATA_DIR/dump.rdb"
  log "RDB restored"
fi

if ls "$TMPDIR/$EXTRACTED_DIR"/appendonly.aof* 1>/dev/null 2>&1; then
  cp "$TMPDIR/$EXTRACTED_DIR"/appendonly.aof* "$REDIS_DATA_DIR/"
  chown redis:redis "$REDIS_DATA_DIR"/appendonly.aof*
  log "AOF restored"
fi

rm -rf "$TMPDIR"

# Start Redis
log "Starting Redis"
systemctl start "$REDIS_SERVICE"
sleep 3

# Verify
if ! redis-cli ping | grep -q PONG; then
  fatal "Redis did not start successfully"
fi

DBSIZE=$(redis-cli DBSIZE)
log "Redis is up — DBSIZE: $DBSIZE"

ELAPSED=$(( $(date +%s) - $(stat -c %Y "$RECOVERY_LOG") ))
log "=== Redis Recovery completed in ~${ELAPSED}s ==="
notify "Redis recovery COMPLETE on $(hostname) — ${DBSIZE} keys restored"
