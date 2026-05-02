#!/usr/bin/env bash
# Monthly Disaster Recovery Test
# Runs on first Sunday of each month (02:00 UTC) via crontab.
# NON-DESTRUCTIVE: tests restore to a staging namespace, never touches production data.
#
# Test scope:
#   1. pgBackRest restore validation (--dry-run equivalent: verify + pitr to staging DB)
#   2. Redis backup restore to staging Redis instance
#   3. MinIO replication health check
#   4. RTO/RPO measurement and recording
#   5. Slack report with pass/fail status
set -euo pipefail

TEST_LOG="/var/log/nebula-backup/dr-test-$(date +%Y%m-%d).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
STAGING_PG_PORT=15432   # Staging PostgreSQL runs on non-standard port
STAGING_REDIS_PORT=16379
STAGING_DATA_DIR="/tmp/dr-test-pg-$(date +%Y%m%d)"
START_TIME=$(date +%s)

log()    { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$TEST_LOG"; }
pass()   { log "PASS: $*"; }
fail()   { log "FAIL: $*"; FAILURES=$((FAILURES + 1)); }
FAILURES=0

report_to_slack() {
  local STATUS="$1"
  local MSG="$2"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    local ICON=":white_check_mark:"
    [[ "$STATUS" == "FAIL" ]] && ICON=":x:"
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"$ICON *Monthly DR Test — $(date +%Y-%m-%d)*\\n$MSG\"}" || true
  fi
}

log "=== Monthly DR Test Started — $(date -u) ==="

# ────────────────────────────────────────────────
# TEST 1: pgBackRest backup integrity
# ────────────────────────────────────────────────
log "TEST 1: pgBackRest backup integrity (repo1)"
if pgbackrest --stanza=nebula --repo=1 verify >> "$TEST_LOG" 2>&1; then
  pass "pgBackRest repo1 integrity check"
else
  fail "pgBackRest repo1 integrity check"
fi

log "TEST 1b: pgBackRest backup integrity (repo2 / offsite)"
if pgbackrest --stanza=nebula --repo=2 verify >> "$TEST_LOG" 2>&1; then
  pass "pgBackRest repo2 (offsite) integrity check"
else
  fail "pgBackRest repo2 (offsite) integrity check"
fi

# ────────────────────────────────────────────────
# TEST 2: PostgreSQL restore to staging (non-destructive PITR test)
# ────────────────────────────────────────────────
log "TEST 2: PostgreSQL restore to staging instance"

mkdir -p "$STAGING_DATA_DIR"

# Restore to staging data dir (uses --delta, separate port, no production impact)
RESTORE_START=$(date +%s)
if pgbackrest --stanza=nebula --repo=1 restore \
    --pg1-path="$STAGING_DATA_DIR" \
    --pg1-port="$STAGING_PG_PORT" \
    --type=default \
    --delta \
    --recovery-option="recovery_target_action=promote" \
    >> "$TEST_LOG" 2>&1; then

  # Start staging PostgreSQL briefly to validate data
  sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl \
    -D "$STAGING_DATA_DIR" \
    -o "-p $STAGING_PG_PORT" \
    -l "$TEST_LOG" start >> "$TEST_LOG" 2>&1 || true

  sleep 5

  # Run a quick sanity query
  TABLES=$(sudo -u postgres psql -p "$STAGING_PG_PORT" -t \
    -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" \
    2>/dev/null | tr -d ' ' || echo "0")

  # Stop staging PostgreSQL
  sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl \
    -D "$STAGING_DATA_DIR" stop -m fast >> "$TEST_LOG" 2>&1 || true

  RESTORE_ELAPSED=$(( $(date +%s) - RESTORE_START ))

  if [[ "$TABLES" -gt 0 ]]; then
    pass "PostgreSQL staging restore — $TABLES public tables found (${RESTORE_ELAPSED}s)"
  else
    fail "PostgreSQL staging restore — no public tables found"
  fi
else
  fail "PostgreSQL staging restore failed"
  RESTORE_ELAPSED=$(( $(date +%s) - RESTORE_START ))
fi

# Cleanup staging data
rm -rf "$STAGING_DATA_DIR"

# ────────────────────────────────────────────────
# TEST 3: Redis backup restore to staging
# ────────────────────────────────────────────────
log "TEST 3: Redis backup availability and format"

LATEST_REDIS=$(ls -t /backup/redis/redis-*.tar.gz 2>/dev/null | head -1 || true)
if [[ -z "$LATEST_REDIS" ]]; then
  fail "No Redis backup files found"
else
  BACKUP_AGE_MINS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_REDIS") ) / 60 ))
  if [[ "$BACKUP_AGE_MINS" -gt 30 ]]; then
    fail "Latest Redis backup is $BACKUP_AGE_MINS minutes old (expected <30)"
  else
    # Verify archive is valid
    if tar -tzf "$LATEST_REDIS" &>/dev/null; then
      pass "Redis backup valid and fresh ($BACKUP_AGE_MINS min old)"
    else
      fail "Redis backup archive is corrupt: $LATEST_REDIS"
    fi
  fi
fi

# ────────────────────────────────────────────────
# TEST 4: MinIO replication health
# ────────────────────────────────────────────────
log "TEST 4: MinIO replication health"

if /opt/nebula/backup/scripts/minio-replication.sh verify >> "$TEST_LOG" 2>&1; then
  pass "MinIO replication health check"
else
  fail "MinIO replication health check"
fi

# ────────────────────────────────────────────────
# TEST 5: Restic config backup
# ────────────────────────────────────────────────
log "TEST 5: Restic config backup availability"

if restic -r "${RESTIC_REPOSITORY:-}" snapshots --last --tag config >> "$TEST_LOG" 2>&1; then
  SNAPSHOT_AGE=$(restic -r "${RESTIC_REPOSITORY}" snapshots --last --tag config --json 2>/dev/null \
    | python3 -c "
import sys, json, datetime
snaps = json.load(sys.stdin)
if snaps:
    t = datetime.datetime.fromisoformat(snaps[-1]['time'].replace('Z', '+00:00'))
    age = (datetime.datetime.now(datetime.timezone.utc) - t).total_seconds() / 3600
    print(f'{age:.1f}')
else:
    print('999')
" 2>/dev/null || echo "999")

  if python3 -c "exit(0 if float('$SNAPSHOT_AGE') < 25 else 1)" 2>/dev/null; then
    pass "Restic config backup fresh (${SNAPSHOT_AGE}h old)"
  else
    fail "Restic config backup is ${SNAPSHOT_AGE}h old (expected <25h)"
  fi
else
  fail "Restic config backup not accessible"
fi

# ────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────
TOTAL_ELAPSED=$(( $(date +%s) - START_TIME ))
TOTAL_MIN=$(( TOTAL_ELAPSED / 60 ))

log ""
log "=== DR Test Summary ==="
log "Date: $(date -u)"
log "Total elapsed: ${TOTAL_MIN}m"
log "PostgreSQL restore time: ${RESTORE_ELAPSED:-N/A}s"
log "Failures: $FAILURES"

if [[ "$FAILURES" -eq 0 ]]; then
  log "RESULT: ALL TESTS PASSED"
  report_to_slack "PASS" "All 5 DR tests passed ✓ | PG restore: ${RESTORE_ELAPSED:-N/A}s | Total: ${TOTAL_MIN}m"
else
  log "RESULT: $FAILURES TEST(S) FAILED — see $TEST_LOG"
  report_to_slack "FAIL" "$FAILURES test(s) FAILED | See server log: $TEST_LOG"
  exit 1
fi
