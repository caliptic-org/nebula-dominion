#!/usr/bin/env bash
# Restic backup of infrastructure configuration files to Hetzner Storage Box.
# Covers: Ansible playbooks, Docker configs, .env files (encrypted), systemd units, etc.
set -euo pipefail

ENV_FILE="/etc/restic/restic.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/var/run/restic-config-backup.lock"

# shellcheck source=/dev/null
source "$ENV_FILE"
source "${SCRIPT_DIR}/../scripts/notify.sh"

export RESTIC_REPOSITORY RESTIC_PASSWORD
SFTP_ARGS="-i ${RESTIC_SSH_KEY} -o StrictHostKeyChecking=accept-new"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; notify_error "Config backup" "$*"; exit 1; }

acquire_lock() {
    exec 9>"$LOCK_FILE"
    flock -n 9 || die "Another config backup is running"
}

release_lock() {
    flock -u 9
    rm -f "$LOCK_FILE"
}

# Directories and files to include in config backup
BACKUP_PATHS=(
    /etc/pgbackrest
    /etc/restic
    /etc/postgresql
    /etc/redis
    /etc/haproxy
    /etc/caddy
    /etc/patroni
    /etc/prometheus
    /etc/grafana
    /etc/loki
    /etc/alertmanager
    /etc/systemd/system
    /opt/nebula-dominion/infrastructure
    /home/deploy/.ssh
    /root/.ssh
)

# Files containing secrets — excluded from plain backup, captured separately
EXCLUDE_PATTERNS=(
    "*.key"
    "*.pem"
    "id_rsa"
    "id_ed25519"
    "*.password"
    "*.secret"
)

backup_encrypted_secrets() {
    log "Backing up sensitive secrets as encrypted archive..."
    local secrets_archive="/tmp/nebula-secrets-$(date +%Y%m%d-%H%M%S).tar.gz.enc"

    # Create encrypted tar of secret files
    find /etc/pgbackrest /etc/restic -name "*.env" -o -name "*.key" -o -name "*.pem" 2>/dev/null \
        | tar czf - --files-from=- 2>/dev/null \
        | openssl enc -aes-256-cbc -pbkdf2 -pass env:RESTIC_PASSWORD \
        > "$secrets_archive" || true

    if [[ -f "$secrets_archive" && -s "$secrets_archive" ]]; then
        restic -o sftp.args="$SFTP_ARGS" backup "$secrets_archive" \
            --tag secrets \
            --tag config \
            --tag "$(hostname -s)"
        rm -f "$secrets_archive"
        log "Encrypted secrets snapshot created."
    fi
}

run_config_backup() {
    log "Running config backup..."

    # Build exclude args
    local exclude_args=()
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=(--exclude="$pattern")
    done

    # Build valid path list (only existing paths)
    local valid_paths=()
    for path in "${BACKUP_PATHS[@]}"; do
        [[ -e "$path" ]] && valid_paths+=("$path")
    done

    if [[ ${#valid_paths[@]} -eq 0 ]]; then
        log "WARNING: No backup paths found on this host."
        return
    fi

    local start_time elapsed
    start_time=$(date +%s)

    restic -o sftp.args="$SFTP_ARGS" backup "${valid_paths[@]}" \
        "${exclude_args[@]}" \
        --tag config \
        --tag "$(hostname -s)" \
        --one-file-system \
        --verbose=1 \
        2>&1 | tee -a /var/log/restic/backup-config.log

    elapsed=$(( $(date +%s) - start_time ))
    log "Config backup complete in ${elapsed}s."
}

apply_retention() {
    log "Applying retention policy to config snapshots..."
    restic -o sftp.args="$SFTP_ARGS" forget \
        --tag config \
        --keep-daily  "$RESTIC_KEEP_DAILY" \
        --keep-weekly "$RESTIC_KEEP_WEEKLY" \
        --keep-monthly "$RESTIC_KEEP_MONTHLY" \
        --prune \
        2>&1 | tee -a /var/log/restic/backup-config.log
}

report() {
    local snapshot_id
    snapshot_id=$(restic -o sftp.args="$SFTP_ARGS" snapshots --tag config --json --latest 1 \
        | python3 -c "import sys,json; s=json.load(sys.stdin); print(s[0]['short_id'] if s else 'none')" 2>/dev/null || echo "unknown")
    log "Latest config snapshot: $snapshot_id"
    notify_success "Config backup succeeded — snapshot ${snapshot_id}"
}

main() {
    mkdir -p /var/log/restic
    acquire_lock
    trap 'release_lock' EXIT

    log "=== Config Restic Backup Start ==="
    backup_encrypted_secrets
    run_config_backup
    apply_retention
    report
    log "=== Config Restic Backup Complete ==="
}

main "$@"
