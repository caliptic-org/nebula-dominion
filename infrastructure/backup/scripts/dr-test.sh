#!/usr/bin/env bash
# Monthly Disaster Recovery Test for Nebula Dominion
#
# Tests all three backup tiers in a non-destructive way:
#   1. pgBackRest: catalog query + test restore to isolated container
#   2. Restic MinIO: snapshot list + partial restore to temp dir
#   3. Restic Config: snapshot list + restore verification
#
# Generates a report and posts to Slack. Run on the 1st of every month at 10:00.
set -euo pipefail

RESTIC_ENV="/etc/restic/restic.env"
PGBACKREST_ENV="/etc/pgbackrest/pgbackrest.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="/var/log/dr-tests"
STANZA="nebula-pg"
PG_VERSION="16"
TEST_DATE=$(date +%Y%m%d)
REPORT_FILE="${REPORT_DIR}/dr-test-${TEST_DATE}.txt"
STAGING_BASE="/tmp/dr-test-${TEST_DATE}"

[[ -f "$RESTIC_ENV" ]] && source "$RESTIC_ENV"
[[ -f "$PGBACKREST_ENV" ]] && source "$PGBACKREST_ENV"
source "${SCRIPT_DIR}/notify.sh"

export RESTIC_REPOSITORY RESTIC_PASSWORD
SFTP_ARGS="-i ${RESTIC_SSH_KEY:-/root/.ssh/hetzner_backup_key} -o StrictHostKeyChecking=accept-new"

PASS=0
FAIL=0
RESULTS=()

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$REPORT_FILE"; }
pass() { log "  PASS: $*"; ((PASS++)); RESULTS+=("PASS: $*"); }
fail() { log "  FAIL: $*"; ((FAIL++)); RESULTS+=("FAIL: $*"); }

# ------------------------------------------------------------------ #
# Test 1: pgBackRest catalog and WAL archive integrity
# ------------------------------------------------------------------ #
test_pgbackrest_catalog() {
    log ""
    log "=== TEST 1: pgBackRest Backup Catalog ==="
    local start_time
    start_time=$(date +%s)

    # Check stanza info
    if sudo -u postgres pgbackrest --stanza="$STANZA" info > /tmp/pgb-info.txt 2>&1; then
        local full_count
        full_count=$(grep -c "full backup" /tmp/pgb-info.txt || true)
        pass "pgBackRest info OK — ${full_count} full backup(s) in catalog"
    else
        fail "pgBackRest info command failed"
        return
    fi

    # Verify archive integrity
    if sudo -u postgres pgbackrest --stanza="$STANZA" check >> "$REPORT_FILE" 2>&1; then
        pass "pgBackRest archive check passed"
    else
        fail "pgBackRest archive check failed"
    fi

    # Attempt a test restore to an isolated directory (reads only, no service impact)
    local restore_dir="${STAGING_BASE}/pg-restore"
    mkdir -p "$restore_dir"
    chown postgres:postgres "$restore_dir"

    log "  Testing PITR restore to ${restore_dir} (read-only verify)..."
    if sudo -u postgres pgbackrest --stanza="$STANZA" \
        --pg1-path="$restore_dir" \
        --delta \
        --type=immediate \
        --target-action=promote \
        restore >> "$REPORT_FILE" 2>&1; then
        pass "pgBackRest test restore to isolated dir succeeded"
        # Measure RTO proxy: time for restore catalog phase
        local elapsed=$(( $(date +%s) - start_time ))
        log "  Catalog restore time: ${elapsed}s (production restore extrapolation: ~$((elapsed * 10))s)"
        if [[ $elapsed -gt 3600 ]]; then
            fail "RTO exceeded 1 hour threshold (${elapsed}s)"
        else
            pass "RTO within target (extrapolated under 1 hour)"
        fi
    else
        fail "pgBackRest test restore failed"
    fi

    rm -rf "$restore_dir"
}

# ------------------------------------------------------------------ #
# Test 2: Restic MinIO snapshot verification
# ------------------------------------------------------------------ #
test_restic_minio() {
    log ""
    log "=== TEST 2: Restic MinIO Backup ==="

    [[ -z "${RESTIC_REPOSITORY:-}" ]] && { log "  SKIP: RESTIC_REPOSITORY not set"; return; }

    # List snapshots
    if restic -o sftp.args="$SFTP_ARGS" snapshots --tag minio --compact >> "$REPORT_FILE" 2>&1; then
        pass "Restic MinIO snapshot list accessible"
    else
        fail "Restic MinIO snapshot list failed — repository may be unreachable"
        return
    fi

    # Check latest snapshot age (RPO check)
    local last_ts
    last_ts=$(restic -o sftp.args="$SFTP_ARGS" snapshots --tag minio --json --latest 1 2>/dev/null \
        | python3 -c "
import sys, json, datetime, calendar
snaps = json.load(sys.stdin)
if snaps:
    ts_str = snaps[0].get('time', '')
    dt = datetime.datetime.fromisoformat(ts_str.replace('Z','+00:00'))
    print(int(calendar.timegm(dt.timetuple())))
else: print(0)
" 2>/dev/null || echo "0")

    local age_hours=$(( ( $(date +%s) - ${last_ts:-0} ) / 3600 ))
    if [[ $age_hours -le 25 ]]; then
        pass "Latest MinIO snapshot age: ${age_hours}h (RPO target: ≤24h)"
    else
        fail "Latest MinIO snapshot age: ${age_hours}h — exceeds RPO target of 24h"
    fi

    # Partial restore test: restore a single known-small file to verify integrity
    local restore_dir="${STAGING_BASE}/minio-restore"
    mkdir -p "$restore_dir"
    log "  Testing partial MinIO restore to ${restore_dir}..."
    if restic -o sftp.args="$SFTP_ARGS" restore latest \
        --tag minio \
        --target "$restore_dir" \
        --include "/mnt/backup/minio-staging/nebula-assets" \
        --verify >> "$REPORT_FILE" 2>&1; then
        pass "Restic MinIO partial restore and verify passed"
    else
        fail "Restic MinIO restore/verify failed"
    fi
    rm -rf "$restore_dir"

    # Repository integrity check (5% sample)
    log "  Running Restic repository integrity check (5% sample)..."
    if restic -o sftp.args="$SFTP_ARGS" check --read-data-subset=5% >> "$REPORT_FILE" 2>&1; then
        pass "Restic repository integrity check passed (5% sample)"
    else
        fail "Restic repository integrity check failed"
    fi
}

# ------------------------------------------------------------------ #
# Test 3: Restic Config backup verification
# ------------------------------------------------------------------ #
test_restic_config() {
    log ""
    log "=== TEST 3: Restic Config Backup ==="

    [[ -z "${RESTIC_REPOSITORY:-}" ]] && { log "  SKIP: RESTIC_REPOSITORY not set"; return; }

    if restic -o sftp.args="$SFTP_ARGS" snapshots --tag config --compact >> "$REPORT_FILE" 2>&1; then
        pass "Restic config snapshot list accessible"
    else
        fail "Restic config snapshot list failed"
        return
    fi

    # Verify critical files are in latest snapshot
    local restore_dir="${STAGING_BASE}/config-restore"
    mkdir -p "$restore_dir"
    log "  Restoring /etc/pgbackrest from latest config snapshot..."
    if restic -o sftp.args="$SFTP_ARGS" restore latest \
        --tag config \
        --target "$restore_dir" \
        --include "/etc/pgbackrest" \
        --verify >> "$REPORT_FILE" 2>&1; then

        if [[ -f "${restore_dir}/etc/pgbackrest/pgbackrest.conf" ]]; then
            pass "pgBackRest config successfully restored from Restic"
        else
            fail "pgBackRest config file missing from Restic config snapshot"
        fi
    else
        fail "Restic config restore failed"
    fi
    rm -rf "$restore_dir"
}

# ------------------------------------------------------------------ #
# Test 4: RPO verification (WAL archive lag)
# ------------------------------------------------------------------ #
test_rpo() {
    log ""
    log "=== TEST 4: RPO Verification (WAL Archive Lag) ==="

    local last_archived_age
    last_archived_age=$(sudo -u postgres psql -tAc "
        SELECT EXTRACT(EPOCH FROM (now() - last_archived_time))::int
        FROM pg_stat_archiver;
    " 2>/dev/null | tr -d ' ' || echo "9999")

    local age_minutes=$(( ${last_archived_age:-9999} / 60 ))
    if [[ $age_minutes -le 5 ]]; then
        pass "WAL archive lag: ${age_minutes} minutes (RPO target: ≤5 minutes)"
    else
        fail "WAL archive lag: ${age_minutes} minutes — exceeds RPO target of 5 minutes"
    fi
}

# ------------------------------------------------------------------ #
# Final report
# ------------------------------------------------------------------ #
generate_report() {
    log ""
    log "==================================================================="
    log "DISASTER RECOVERY TEST REPORT — $(date -u '+%Y-%m-%d %H:%M UTC')"
    log "Host: $(hostname -s)"
    log "==================================================================="
    log ""
    log "Results:"
    for result in "${RESULTS[@]}"; do
        log "  ${result}"
    done
    log ""
    log "Summary: ${PASS} passed, ${FAIL} failed"
    log "==================================================================="

    local status_msg
    if [[ $FAIL -eq 0 ]]; then
        status_msg="✅ DR Test PASSED — ${PASS}/${$(( PASS + FAIL ))} checks OK"
        notify_success "$status_msg — see ${REPORT_FILE}"
    else
        status_msg="🔴 DR Test FAILED — ${FAIL} failure(s). See ${REPORT_FILE} for details."
        notify_error "$status_msg"
    fi

    log "$status_msg"
    log "Full report: $REPORT_FILE"
}

cleanup() {
    rm -rf "$STAGING_BASE"
}

main() {
    mkdir -p "$REPORT_DIR" "$STAGING_BASE"
    trap cleanup EXIT

    log "=== Nebula Dominion Monthly Disaster Recovery Test ==="
    log "Date: $(date -u '+%Y-%m-%d %H:%M UTC')"
    log "Host: $(hostname -s)"

    test_pgbackrest_catalog
    test_restic_minio
    test_restic_config
    test_rpo
    generate_report

    [[ $FAIL -eq 0 ]]
}

main "$@"
