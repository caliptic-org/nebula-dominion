#!/usr/bin/env bash
# Backup health monitoring script for Nebula Dominion.
# Checks pgBackRest and Restic backup recency, alerts via Slack if stale.
set -euo pipefail

RESTIC_ENV="/etc/restic/restic.env"
PGBACKREST_ENV="/etc/pgbackrest/pgbackrest.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Thresholds (hours)
PGBACKREST_FULL_MAX_AGE_HOURS=25     # Alert if full backup older than 25h
PGBACKREST_WAL_MAX_AGE_MINUTES=10    # Alert if WAL archiving lagged > 10 min
RESTIC_MINIO_MAX_AGE_HOURS=25
RESTIC_CONFIG_MAX_AGE_HOURS=25

ALERT_LEVEL="ok"   # ok | warning | critical
ISSUES=()

# Source notification helper
[[ -f "${SCRIPT_DIR}/notify.sh" ]] && source "${SCRIPT_DIR}/notify.sh"

# Source envs if available
[[ -f "$RESTIC_ENV" ]] && source "$RESTIC_ENV"
[[ -f "$PGBACKREST_ENV" ]] && source "$PGBACKREST_ENV"

hours_since_epoch() {
    local epoch="$1"
    echo $(( ( $(date +%s) - epoch ) / 3600 ))
}

check_pgbackrest() {
    log "Checking pgBackRest backup age..."
    if ! command -v pgbackrest &>/dev/null; then
        log "pgBackRest not installed, skipping."
        return
    fi

    local info
    info=$(sudo -u postgres pgbackrest --stanza=nebula-pg info --output=json 2>/dev/null) || {
        ISSUES+=("CRITICAL: pgBackRest info command failed — stanza may be broken")
        ALERT_LEVEL="critical"
        return
    }

    # Parse last full backup timestamp using python3
    local last_full_ts
    last_full_ts=$(echo "$info" | python3 -c "
import sys, json, time
data = json.load(sys.stdin)
for stanza in data:
    for backup in stanza.get('backup', []):
        if backup.get('type') == 'full':
            ts = backup.get('timestamp', {}).get('stop', 0)
            print(ts)
            sys.exit(0)
print(0)
" 2>/dev/null || echo "0")

    if [[ "$last_full_ts" -eq 0 ]]; then
        ISSUES+=("CRITICAL: No full pgBackRest backup found")
        ALERT_LEVEL="critical"
    else
        local age_hours
        age_hours=$(hours_since_epoch "$last_full_ts")
        if [[ $age_hours -gt $PGBACKREST_FULL_MAX_AGE_HOURS ]]; then
            ISSUES+=("WARNING: Last pgBackRest full backup is ${age_hours}h old (threshold: ${PGBACKREST_FULL_MAX_AGE_HOURS}h)")
            [[ "$ALERT_LEVEL" == "ok" ]] && ALERT_LEVEL="warning"
        else
            log "pgBackRest full backup age: ${age_hours}h — OK"
        fi
    fi

    # Check WAL archiving lag
    local wal_lag_seconds
    wal_lag_seconds=$(sudo -u postgres psql -tAc "
        SELECT EXTRACT(EPOCH FROM (now() - last_archived_time))::int
        FROM pg_stat_archiver
        WHERE last_archived_time IS NOT NULL;
    " 2>/dev/null | tr -d ' ' || echo "9999")

    local wal_lag_minutes=$(( ${wal_lag_seconds:-9999} / 60 ))
    if [[ $wal_lag_minutes -gt $PGBACKREST_WAL_MAX_AGE_MINUTES ]]; then
        ISSUES+=("WARNING: WAL archiving lag is ${wal_lag_minutes} minutes (threshold: ${PGBACKREST_WAL_MAX_AGE_MINUTES}m)")
        [[ "$ALERT_LEVEL" == "ok" ]] && ALERT_LEVEL="warning"
    else
        log "WAL archive lag: ${wal_lag_minutes} minutes — OK"
    fi
}

check_restic_snapshots() {
    local tag="$1"
    local max_age_hours="$2"
    log "Checking Restic ${tag} snapshot age..."

    if ! command -v restic &>/dev/null; then
        log "restic not installed, skipping."
        return
    fi

    [[ -z "${RESTIC_REPOSITORY:-}" ]] && { log "RESTIC_REPOSITORY not set, skipping."; return; }

    export RESTIC_REPOSITORY RESTIC_PASSWORD
    local sftp_args="-i ${RESTIC_SSH_KEY:-/root/.ssh/hetzner_backup_key} -o StrictHostKeyChecking=accept-new"

    local last_ts
    last_ts=$(restic -o sftp.args="$sftp_args" snapshots --tag "$tag" --json --latest 1 2>/dev/null \
        | python3 -c "
import sys, json, datetime, calendar
snaps = json.load(sys.stdin)
if snaps:
    ts_str = snaps[0].get('time', '')
    dt = datetime.datetime.fromisoformat(ts_str.replace('Z','+00:00'))
    print(int(calendar.timegm(dt.timetuple())))
else:
    print(0)
" 2>/dev/null || echo "0")

    if [[ "$last_ts" -eq 0 ]]; then
        ISSUES+=("CRITICAL: No Restic ${tag} snapshot found")
        ALERT_LEVEL="critical"
    else
        local age_hours
        age_hours=$(hours_since_epoch "$last_ts")
        if [[ $age_hours -gt $max_age_hours ]]; then
            ISSUES+=("WARNING: Last Restic ${tag} snapshot is ${age_hours}h old (threshold: ${max_age_hours}h)")
            [[ "$ALERT_LEVEL" == "ok" ]] && ALERT_LEVEL="warning"
        else
            log "Restic ${tag} snapshot age: ${age_hours}h — OK"
        fi
    fi
}

check_disk_usage() {
    log "Checking local backup disk usage..."
    local local_backup="/mnt/backup"
    if mountpoint -q "$local_backup" 2>/dev/null || [[ -d "$local_backup" ]]; then
        local usage_pct
        usage_pct=$(df --output=pcent "$local_backup" | tail -1 | tr -d ' %')
        if [[ ${usage_pct:-0} -ge 90 ]]; then
            ISSUES+=("CRITICAL: Local backup disk ${local_backup} is ${usage_pct}% full")
            ALERT_LEVEL="critical"
        elif [[ ${usage_pct:-0} -ge 80 ]]; then
            ISSUES+=("WARNING: Local backup disk ${local_backup} is ${usage_pct}% full")
            [[ "$ALERT_LEVEL" == "ok" ]] && ALERT_LEVEL="warning"
        else
            log "Local backup disk usage: ${usage_pct}% — OK"
        fi
    fi
}

report() {
    log ""
    log "=== Backup Monitor Report ==="
    log "Host: $(hostname -s)"
    log "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    log "Status: ${ALERT_LEVEL^^}"

    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        log "All backup checks passed."
        notify_success "Backup health OK on $(hostname -s)"
    else
        log "Issues found:"
        for issue in "${ISSUES[@]}"; do
            log "  - $issue"
        done

        local message
        message="Backup issues on $(hostname -s):\n$(printf '• %s\n' "${ISSUES[@]}")"
        case "$ALERT_LEVEL" in
            critical) notify_error   "$message" ;;
            warning)  notify_warning "$message" ;;
        esac
    fi
}

main() {
    check_pgbackrest
    check_restic_snapshots "minio"  "$RESTIC_MINIO_MAX_AGE_HOURS"
    check_restic_snapshots "config" "$RESTIC_CONFIG_MAX_AGE_HOURS"
    check_disk_usage
    report
}

main "$@"
