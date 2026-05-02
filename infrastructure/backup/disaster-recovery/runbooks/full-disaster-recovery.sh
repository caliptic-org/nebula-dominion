#!/usr/bin/env bash
# Full Disaster Recovery Runbook
# Run this when a server is completely lost and needs to be rebuilt from scratch.
#
# Prerequisite: Fresh Ubuntu 24.04 server with Ansible applied (basic setup).
# This script orchestrates the data layer recovery in the correct order.
#
# RTO target: <1 hour
# RPO target: <5 minutes (WAL archiving + Redis 15min backup)
#
# Usage:
#   ./full-disaster-recovery.sh [--dry-run] [--target "2026-05-01 03:45:00+00"]
set -euo pipefail

RECOVERY_LOG="/var/log/nebula-backup/full-dr-$(date +%Y%m%dT%H%M%S).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
DRY_RUN=false
PITR_TARGET=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

START_TIME=$(date +%s)

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$RECOVERY_LOG"; }
fatal() { log "FATAL: $*"; notify "FAILED at step: $*"; exit 1; }
step()  { log ""; log "══════════════════════════════════════════"; log "STEP: $*"; log "══════════════════════════════════════════"; }

notify() {
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":fire: *FULL DR on $(hostname)*: $*\"}" || true
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --target)  PITR_TARGET="$2"; shift 2 ;;
    *) fatal "Unknown argument: $1" ;;
  esac
done

log "=== FULL DISASTER RECOVERY STARTED ==="
log "Host: $(hostname) | DryRun: $DRY_RUN | PITR: ${PITR_TARGET:-latest}"
notify "Full DR started on $(hostname) (pitr: ${PITR_TARGET:-latest})"

if [[ "$DRY_RUN" == true ]]; then
  log "DRY RUN MODE — no services will be stopped or data restored"
fi

# ────────────────────────────────────────────────
step "1/6: Pre-flight — verify backup accessibility"
# ────────────────────────────────────────────────
log "Checking pgBackRest backup availability"
if ! pgbackrest --stanza=nebula info &>>"$RECOVERY_LOG"; then
  fatal "pgBackRest backup info failed — check repo accessibility"
fi

log "Checking Restic config backup"
if ! restic -r "${RESTIC_REPOSITORY:?}" snapshots --last &>>"$RECOVERY_LOG"; then
  log "WARNING: Restic repository check failed (non-fatal — configs may need manual setup)"
fi

log "Checking Redis backup files"
LATEST_REDIS=$(ls -t /backup/redis/redis-*.tar.gz 2>/dev/null | head -1 || true)
if [[ -z "$LATEST_REDIS" ]]; then
  log "WARNING: No Redis backups found — Redis will start empty"
else
  log "Latest Redis backup: $LATEST_REDIS ($(date -r "$LATEST_REDIS" -u '+%Y-%m-%dT%H:%M:%SZ'))"
fi

if [[ "$DRY_RUN" == true ]]; then
  log "DRY RUN: Pre-flight checks passed. Exiting."
  exit 0
fi

# ────────────────────────────────────────────────
step "2/6: Stop all application services"
# ────────────────────────────────────────────────
log "Stopping Docker Swarm services"
docker stack rm nebula 2>>"$RECOVERY_LOG" || log "WARNING: docker stack rm failed (may not be running)"
sleep 10

log "Stopping HAProxy"
systemctl stop haproxy 2>>"$RECOVERY_LOG" || true

# ────────────────────────────────────────────────
step "3/6: Restore PostgreSQL"
# ────────────────────────────────────────────────
PSQL_ARGS=(
  "$SCRIPT_DIR/postgresql-recovery.sh"
)
if [[ -n "$PITR_TARGET" ]]; then
  PSQL_ARGS+=(--target "$PITR_TARGET")
else
  PSQL_ARGS+=(--latest)
fi

log "Running PostgreSQL recovery"
if ! bash "${PSQL_ARGS[@]}" 2>&1 | tee -a "$RECOVERY_LOG"; then
  fatal "PostgreSQL recovery failed"
fi
log "PostgreSQL recovery OK"

# ────────────────────────────────────────────────
step "4/6: Restore Redis"
# ────────────────────────────────────────────────
if [[ -n "$LATEST_REDIS" ]]; then
  log "Running Redis recovery from $LATEST_REDIS"
  if ! bash "$SCRIPT_DIR/redis-recovery.sh" 2>&1 | tee -a "$RECOVERY_LOG"; then
    log "WARNING: Redis recovery failed — starting with empty Redis"
    systemctl start redis-server || true
  else
    log "Redis recovery OK"
  fi
else
  log "No Redis backup available — starting fresh Redis"
  systemctl start redis-server || true
fi

# ────────────────────────────────────────────────
step "5/6: Restore configs via Restic and redeploy"
# ────────────────────────────────────────────────
log "Restoring configuration files from Restic"
restic -r "${RESTIC_REPOSITORY}" restore latest \
  --target /tmp/restic-restore \
  --tag config \
  2>>"$RECOVERY_LOG" || log "WARNING: Restic restore failed — manual config needed"

# Re-run Ansible to ensure all service configs are correct
if [[ -f "/opt/nebula/ansible/site.yml" ]]; then
  log "Running Ansible playbook"
  ansible-playbook /opt/nebula/ansible/site.yml \
    --limit "$(hostname)" \
    --tags backup,services \
    2>&1 | tee -a "$RECOVERY_LOG" || log "WARNING: Ansible run failed — manual review needed"
fi

# Redeploy Docker stack
log "Redeploying Docker Swarm stack"
docker stack deploy -c /opt/nebula/docker/docker-stack.yml nebula 2>&1 | tee -a "$RECOVERY_LOG"

# ────────────────────────────────────────────────
step "6/6: Health checks"
# ────────────────────────────────────────────────
sleep 15  # Allow services to start

HEALTH_FAILURES=0

log "Checking PostgreSQL"
if ! pg_isready -q; then
  log "FAIL: PostgreSQL not ready"
  HEALTH_FAILURES=$((HEALTH_FAILURES + 1))
else
  log "OK: PostgreSQL"
fi

log "Checking Redis"
if ! redis-cli ping | grep -q PONG; then
  log "FAIL: Redis not responding"
  HEALTH_FAILURES=$((HEALTH_FAILURES + 1))
else
  log "OK: Redis"
fi

log "Checking application health endpoint"
if ! curl -sf http://localhost:3000/health &>/dev/null; then
  log "FAIL: Application /health endpoint not responding"
  HEALTH_FAILURES=$((HEALTH_FAILURES + 1))
else
  log "OK: Application health"
fi

ELAPSED=$(( $(date +%s) - START_TIME ))
ELAPSED_MIN=$(( ELAPSED / 60 ))
ELAPSED_SEC=$(( ELAPSED % 60 ))

if [[ "$HEALTH_FAILURES" -gt 0 ]]; then
  log "=== DR COMPLETED WITH $HEALTH_FAILURES HEALTH CHECK FAILURES — ${ELAPSED_MIN}m${ELAPSED_SEC}s ==="
  notify "DR DONE with $HEALTH_FAILURES failures — ${ELAPSED_MIN}m${ELAPSED_SEC}s. Manual review required."
  exit 1
else
  log "=== DR COMPLETED SUCCESSFULLY in ${ELAPSED_MIN}m${ELAPSED_SEC}s ==="
  notify "DR SUCCESS on $(hostname) — all services healthy in ${ELAPSED_MIN}m${ELAPSED_SEC}s"
fi
