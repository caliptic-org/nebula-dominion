#!/usr/bin/env bash
# Restic restore helper for Nebula Dominion.
# Usage:
#   restore.sh --tag minio --target /mnt/restore     — restore latest MinIO snapshot
#   restore.sh --tag config --target /mnt/restore    — restore latest config snapshot
#   restore.sh --snapshot abc12345 --target /mnt/restore
#   restore.sh --list                                 — list all snapshots
set -euo pipefail

ENV_FILE="/etc/restic/restic.env"
[[ -f "$ENV_FILE" ]] || { echo "ERROR: $ENV_FILE not found"; exit 1; }
# shellcheck source=/dev/null
source "$ENV_FILE"

export RESTIC_REPOSITORY RESTIC_PASSWORD
SFTP_ARGS="-i ${RESTIC_SSH_KEY} -o StrictHostKeyChecking=accept-new"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

TAG=""
SNAPSHOT=""
TARGET_DIR=""
LIST_MODE=false
INCLUDE=""

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --tag TAG             Filter snapshots by tag (minio|config|secrets)
  --snapshot HASH       Restore specific snapshot by short or full ID
  --target DIR          Directory to restore into (required for restore)
  --include PATTERN     Only restore paths matching pattern
  --list                List available snapshots
  -h, --help            Show help

Examples:
  $0 --list
  $0 --tag minio --target /mnt/restore/minio
  $0 --tag config --target / --include /etc/pgbackrest
  $0 --snapshot abc12345 --target /mnt/restore
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)       TAG="$2";        shift 2 ;;
        --snapshot)  SNAPSHOT="$2";   shift 2 ;;
        --target)    TARGET_DIR="$2"; shift 2 ;;
        --include)   INCLUDE="$2";    shift 2 ;;
        --list)      LIST_MODE=true;  shift   ;;
        -h|--help)   usage ;;
        *)           die "Unknown option: $1" ;;
    esac
done

list_snapshots() {
    log "Snapshots in ${RESTIC_REPOSITORY}:"
    restic -o sftp.args="$SFTP_ARGS" snapshots \
        ${TAG:+--tag "$TAG"} \
        --compact
}

do_restore() {
    [[ -n "$TARGET_DIR" ]] || die "--target is required for restore"
    mkdir -p "$TARGET_DIR"

    local cmd=(restic -o sftp.args="$SFTP_ARGS" restore)
    [[ -n "$SNAPSHOT" ]] && cmd+=("$SNAPSHOT") || cmd+=("latest")
    cmd+=(--target "$TARGET_DIR")
    [[ -n "$TAG" ]]     && cmd+=(--tag "$TAG")
    [[ -n "$INCLUDE" ]] && cmd+=(--include "$INCLUDE")

    log "Restoring to ${TARGET_DIR}..."
    "${cmd[@]}" --verify 2>&1 | tee -a /var/log/restic/restore.log
    log "Restore complete."
}

main() {
    mkdir -p /var/log/restic
    if $LIST_MODE; then
        list_snapshots
    else
        list_snapshots
        do_restore
    fi
}

main "$@"
