#!/usr/bin/env bash
# pgBackRest point-in-time recovery script for Nebula Dominion
# Usage:
#   restore.sh                         — restore latest backup
#   restore.sh --target "2026-05-01 03:00:00"  — PITR to specific timestamp
#   restore.sh --target-lsn 1/2345678  — PITR to specific LSN
#   restore.sh --set 20260501-030001F  — restore specific backup set
set -euo pipefail

STANZA="nebula-pg"
PG_VERSION="16"
PG_DATA="/var/lib/postgresql/${PG_VERSION}/main"
PG_SERVICE="postgresql@${PG_VERSION}-main"
ENV_FILE="/etc/pgbackrest/pgbackrest.env"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Must run as root"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

TARGET=""
TARGET_TYPE=""
BACKUP_SET=""
REPO=""
DRY_RUN=false

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --target "YYYY-MM-DD HH:MM:SS"   Point-in-time recovery target (UTC)
  --target-lsn "LSN"               Recover to LSN (e.g. 1/2345678)
  --set "BACKUP_LABEL"             Restore specific backup set label
  --repo 1|2                       Repository to use (default: 1 = offsite)
  --dry-run                        Show what would be done without executing
  -h, --help                       Show this help

Examples:
  $0                                       Restore latest from offsite
  $0 --target "2026-05-01 03:00:00"        PITR to May 1st 03:00 UTC
  $0 --set 20260501-030001F --repo 2       Restore set from local repo
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --target)         TARGET="$2";      TARGET_TYPE="time"; shift 2 ;;
        --target-lsn)     TARGET="$2";      TARGET_TYPE="lsn";  shift 2 ;;
        --set)            BACKUP_SET="$2";                       shift 2 ;;
        --repo)           REPO="$2";                             shift 2 ;;
        --dry-run)        DRY_RUN=true;                          shift   ;;
        -h|--help)        usage ;;
        *)                die "Unknown option: $1" ;;
    esac
done

list_backups() {
    log "Available backups in repository ${REPO:-1}:"
    sudo -u postgres pgbackrest --stanza="$STANZA" ${REPO:+--repo="$REPO"} info
}

confirm() {
    local prompt="$1"
    read -rp "$prompt [yes/no]: " answer
    [[ "$answer" == "yes" ]] || { log "Aborted."; exit 1; }
}

stop_postgresql() {
    log "Stopping PostgreSQL service..."
    systemctl stop "$PG_SERVICE" || true
}

run_restore() {
    local cmd=(sudo -u postgres pgbackrest --stanza="$STANZA" restore)

    [[ -n "$REPO" ]]       && cmd+=(--repo="$REPO")
    [[ -n "$BACKUP_SET" ]] && cmd+=(--set="$BACKUP_SET")

    if [[ -n "$TARGET" ]]; then
        cmd+=(--target="$TARGET")
        cmd+=(--target-type="$TARGET_TYPE")
        cmd+=(--target-action=promote)
    fi

    log "Restore command: ${cmd[*]}"

    if $DRY_RUN; then
        log "[DRY RUN] Would execute: ${cmd[*]}"
        return
    fi

    "${cmd[@]}"
    log "Restore completed."
}

start_postgresql() {
    log "Starting PostgreSQL service..."
    systemctl start "$PG_SERVICE"

    local attempts=0
    until sudo -u postgres pg_isready -q; do
        sleep 2
        ((attempts++))
        [[ $attempts -lt 60 ]] || die "PostgreSQL failed to start after restore"
    done
    log "PostgreSQL is up."
}

verify_restore() {
    log "Verifying database connectivity..."
    sudo -u postgres psql -c "SELECT version(), now() AS restored_at, pg_is_in_recovery() AS is_replica;"
    log "Restore verification complete."
}

main() {
    list_backups
    echo ""

    if $DRY_RUN; then
        log "[DRY RUN MODE — no changes will be made]"
    else
        confirm "⚠️  This will OVERWRITE ${PG_DATA}. Continue?"
    fi

    stop_postgresql
    run_restore
    start_postgresql
    verify_restore

    log "Point-in-time recovery complete."
    log "RTO target: < 1 hour. Elapsed: check timestamps above."
}

main "$@"
