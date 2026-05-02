#!/usr/bin/env bash
# PostgreSQL Point-in-Time Recovery Runbook
# Restores PostgreSQL from pgBackRest to a target time or latest backup
#
# Usage:
#   postgresql-recovery.sh --target "2026-05-01 03:45:00+00"   # PITR to specific time
#   postgresql-recovery.sh --latest                              # Restore latest backup
#   postgresql-recovery.sh --validate-only                       # Dry-run: check backup integrity
#
# RTO target: <30 minutes for latest-backup restore
# RPO target: <5 minutes (WAL archiving fills the gap between last backup and failure)
set -euo pipefail

STANZA="nebula"
PG_DATA="/var/lib/postgresql/16/main"
PG_SERVICE="postgresql@16-main"
RECOVERY_LOG="/var/log/pgbackrest/recovery-$(date +%Y%m%dT%H%M%S).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$RECOVERY_LOG"; }
fatal() { log "FATAL: $*"; exit 1; }

notify() {
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":fire: *DR PostgreSQL Recovery* on $(hostname): $*\"}" || true
  fi
}

TARGET_TIME=""
MODE="latest"
VALIDATE_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)     MODE="pitr"; TARGET_TIME="$2"; shift 2 ;;
    --latest)     MODE="latest"; shift ;;
    --validate-only) VALIDATE_ONLY=true; shift ;;
    *) fatal "Unknown argument: $1" ;;
  esac
done

# ────────────────────────────────────────────────
# STEP 0: Pre-flight checks
# ────────────────────────────────────────────────
log "=== PostgreSQL Recovery Started ==="
log "Mode: $MODE | Target: ${TARGET_TIME:-latest}"
log "Recovery log: $RECOVERY_LOG"

# Show available backups
log "Available backups:"
pgbackrest --stanza="$STANZA" info 2>&1 | tee -a "$RECOVERY_LOG"

if [[ "$VALIDATE_ONLY" == true ]]; then
  log "Validate-only mode: verifying backup integrity"
  pgbackrest --stanza="$STANZA" --repo=1 verify 2>&1 | tee -a "$RECOVERY_LOG"
  pgbackrest --stanza="$STANZA" --repo=2 verify 2>&1 | tee -a "$RECOVERY_LOG" || log "WARNING: repo2 verify failed (offsite may be unavailable)"
  log "Validation complete — no data was changed"
  exit 0
fi

# ────────────────────────────────────────────────
# STEP 1: Stop PostgreSQL
# ────────────────────────────────────────────────
log "Stopping PostgreSQL service"
notify "Recovery started — stopping PostgreSQL on $(hostname)"

systemctl stop "$PG_SERVICE" 2>&1 | tee -a "$RECOVERY_LOG" || true
# Give it 30s to stop gracefully
sleep 5
if systemctl is-active --quiet "$PG_SERVICE"; then
  systemctl kill "$PG_SERVICE"
  sleep 3
fi
log "PostgreSQL stopped"

# ────────────────────────────────────────────────
# STEP 2: Restore from pgBackRest
# ────────────────────────────────────────────────
RESTORE_ARGS=(
  --stanza="$STANZA"
  --pg1-path="$PG_DATA"
  --delta                 # only restore changed blocks
  --log-level-console=info
  --log-level-file=detail
)

# Prefer repo1 (local), fall back to repo2 (offsite)
if pgbackrest "${RESTORE_ARGS[@]}" --repo=1 info &>/dev/null; then
  RESTORE_ARGS+=(--repo=1)
  log "Using repo1 (local backup disk)"
else
  RESTORE_ARGS+=(--repo=2)
  log "repo1 unavailable — falling back to repo2 (Hetzner Storage Box)"
  notify "WARNING: Using offsite repo2 for recovery — expect slower restore"
fi

if [[ "$MODE" == "pitr" ]]; then
  RESTORE_ARGS+=(--type=time "--target=$TARGET_TIME" --target-action=promote)
  log "PITR target: $TARGET_TIME"
else
  RESTORE_ARGS+=(--type=default)
fi

log "Running pgBackRest restore"
if ! pgbackrest restore "${RESTORE_ARGS[@]}" 2>&1 | tee -a "$RECOVERY_LOG"; then
  fatal "pgBackRest restore failed — check $RECOVERY_LOG"
fi

log "pgBackRest restore completed"

# ────────────────────────────────────────────────
# STEP 3: Start PostgreSQL and verify
# ────────────────────────────────────────────────
log "Starting PostgreSQL"
systemctl start "$PG_SERVICE" 2>&1 | tee -a "$RECOVERY_LOG"

# Wait up to 60s for PostgreSQL to become ready
for i in $(seq 1 60); do
  if pg_isready -q; then
    log "PostgreSQL is ready (${i}s)"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    fatal "PostgreSQL did not become ready within 60s"
  fi
  sleep 1
done

# Quick sanity check
ROWCOUNT=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_user_tables;" 2>/dev/null | tr -d ' ' || echo "ERROR")
log "Sanity check: pg_stat_user_tables row count = $ROWCOUNT"

if [[ "$ROWCOUNT" == "ERROR" ]]; then
  fatal "PostgreSQL is up but sanity query failed"
fi

# ────────────────────────────────────────────────
# STEP 4: Done
# ────────────────────────────────────────────────
ELAPSED=$(( $(date +%s) - $(stat -c %Y "$RECOVERY_LOG") ))
log "=== Recovery completed in ~${ELAPSED}s ==="
notify "Recovery COMPLETE on $(hostname) — elapsed ~${ELAPSED}s. Please verify application health."

echo ""
echo "Next steps:"
echo "  1. Verify application connectivity: curl http://localhost:3000/health"
echo "  2. Check HAProxy backend health"
echo "  3. Re-enable Patroni if this was a primary restore"
echo "  4. Update issue tracker with recovery timeline"
