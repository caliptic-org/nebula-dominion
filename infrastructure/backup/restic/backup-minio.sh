#!/usr/bin/env bash
# Restic backup of MinIO object storage data to Hetzner Storage Box.
# Called daily by cron. Syncs MinIO buckets locally then snapshots with restic.
set -euo pipefail

ENV_FILE="/etc/restic/restic.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/var/run/restic-minio-backup.lock"
STAGING_DIR="/mnt/backup/minio-staging"

# shellcheck source=/dev/null
source "$ENV_FILE"
source "${SCRIPT_DIR}/../scripts/notify.sh"

export RESTIC_REPOSITORY RESTIC_PASSWORD
SFTP_ARGS="-i ${RESTIC_SSH_KEY} -o StrictHostKeyChecking=accept-new"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; notify_error "MinIO backup" "$*"; exit 1; }

acquire_lock() {
    exec 9>"$LOCK_FILE"
    flock -n 9 || die "Another backup is already running (lock: $LOCK_FILE)"
}

release_lock() {
    flock -u 9
    rm -f "$LOCK_FILE"
}

sync_minio_to_staging() {
    log "Syncing MinIO buckets to staging dir ${STAGING_DIR}..."
    mkdir -p "$STAGING_DIR"

    # Sync all buckets from MinIO to local staging directory
    rclone sync minio: "$STAGING_DIR" \
        --transfers=8 \
        --checkers=16 \
        --s3-chunk-size=64M \
        --stats=60s \
        --log-level=INFO \
        --log-file=/var/log/restic/rclone-minio.log

    local bucket_count
    bucket_count=$(find "$STAGING_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
    local size
    size=$(du -sh "$STAGING_DIR" | cut -f1)
    log "Sync complete: ${bucket_count} buckets, ${size} total."
}

run_restic_backup() {
    log "Running restic backup of MinIO staging data..."
    local start_time
    start_time=$(date +%s)

    restic -o sftp.args="$SFTP_ARGS" backup "$STAGING_DIR" \
        --tag minio \
        --tag "$(hostname -s)" \
        --one-file-system \
        --exclude="*.tmp" \
        --exclude="*.lock" \
        --verbose=1 \
        2>&1 | tee -a /var/log/restic/backup-minio.log

    local end_time elapsed
    end_time=$(date +%s)
    elapsed=$(( end_time - start_time ))
    log "Restic backup complete in ${elapsed}s."
}

apply_retention() {
    log "Applying retention policy (daily=${RESTIC_KEEP_DAILY}, weekly=${RESTIC_KEEP_WEEKLY}, monthly=${RESTIC_KEEP_MONTHLY})..."
    restic -o sftp.args="$SFTP_ARGS" forget \
        --tag minio \
        --keep-daily  "$RESTIC_KEEP_DAILY" \
        --keep-weekly "$RESTIC_KEEP_WEEKLY" \
        --keep-monthly "$RESTIC_KEEP_MONTHLY" \
        --prune \
        2>&1 | tee -a /var/log/restic/backup-minio.log
}

verify_latest() {
    log "Verifying latest snapshot integrity..."
    restic -o sftp.args="$SFTP_ARGS" check --read-data-subset=5% \
        2>&1 | tee -a /var/log/restic/backup-minio.log
    log "Integrity check passed."
}

report_stats() {
    local snapshot_id
    snapshot_id=$(restic -o sftp.args="$SFTP_ARGS" snapshots --tag minio --json --latest 1 \
        | python3 -c "import sys,json; snaps=json.load(sys.stdin); print(snaps[0]['short_id'] if snaps else 'none')" 2>/dev/null || echo "unknown")
    log "Latest MinIO snapshot: $snapshot_id"
    notify_success "MinIO backup succeeded — snapshot ${snapshot_id}"
}

main() {
    mkdir -p /var/log/restic
    acquire_lock
    trap 'release_lock' EXIT

    log "=== MinIO Restic Backup Start ==="
    sync_minio_to_staging
    run_restic_backup
    apply_retention
    verify_latest
    report_stats
    log "=== MinIO Restic Backup Complete ==="
}

main "$@"
