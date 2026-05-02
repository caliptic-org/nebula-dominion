#!/usr/bin/env bash
# Restic backup setup for Nebula Dominion
# Installs restic and rclone, sets up SSH key, initializes repository.
set -euo pipefail

ENV_FILE="/etc/restic/restic.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Must run as root"
[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy restic/env.template and fill in values"
# shellcheck source=/dev/null
source "$ENV_FILE"

install_restic() {
    log "Installing restic..."
    if ! command -v restic &>/dev/null; then
        apt-get update -q
        apt-get install -y restic
    fi
    restic self-update 2>/dev/null || true
    log "restic $(restic version | head -1) ready."
}

install_rclone() {
    log "Installing rclone (for MinIO sync)..."
    if ! command -v rclone &>/dev/null; then
        curl -fsSL https://rclone.org/install.sh | bash
    fi
    log "rclone $(rclone version | head -1) ready."
}

configure_ssh_key() {
    log "Setting up SSH key for Hetzner Storage Box..."
    local KEY_DIR
    KEY_DIR="$(dirname "$RESTIC_SSH_KEY")"
    mkdir -p "$KEY_DIR"
    chmod 700 "$KEY_DIR"

    if [[ ! -f "$RESTIC_SSH_KEY" ]]; then
        ssh-keygen -t ed25519 -N "" -C "restic@nebula" -f "$RESTIC_SSH_KEY"
        log "SSH key generated. Add this public key to Hetzner Storage Box:"
        cat "${RESTIC_SSH_KEY}.pub"
        echo ""
    fi

    ssh-keyscan -H "$HETZNER_STORAGE_BOX_HOST" >> "${KEY_DIR}/known_hosts" 2>/dev/null || true
    chmod 600 "${KEY_DIR}/known_hosts"
}

configure_rclone_minio() {
    log "Configuring rclone for MinIO..."
    mkdir -p /root/.config/rclone
    cat > /root/.config/rclone/rclone.conf <<EOF
[minio]
type = s3
provider = Minio
env_auth = false
access_key_id = ${MINIO_ACCESS_KEY}
secret_access_key = ${MINIO_SECRET_KEY}
endpoint = ${MINIO_ENDPOINT}
EOF
    chmod 600 /root/.config/rclone/rclone.conf
    log "rclone MinIO config written."
}

init_restic_repo() {
    log "Initializing restic repository at ${RESTIC_REPOSITORY}..."
    export RESTIC_REPOSITORY RESTIC_PASSWORD

    local sftp_args="-i ${RESTIC_SSH_KEY} -o StrictHostKeyChecking=accept-new"

    if restic -o sftp.args="$sftp_args" snapshots &>/dev/null; then
        log "Repository already initialized."
    else
        restic -o sftp.args="$sftp_args" init
        log "Repository initialized successfully."
    fi
}

install_scripts() {
    log "Installing backup scripts..."
    chmod +x "${SCRIPT_DIR}"/backup-*.sh "${SCRIPT_DIR}"/restore.sh
    log "Scripts ready in ${SCRIPT_DIR}/"
}

print_next_steps() {
    cat <<'EOF'

=== Restic Setup Complete ===

Next steps:
  1. Ensure Hetzner Storage Box SSH key is authorized
  2. Run MinIO backup test:  bash infrastructure/backup/restic/backup-minio.sh
  3. Run config backup test: bash infrastructure/backup/restic/backup-config.sh
  4. Add cron jobs:          bash infrastructure/backup/scripts/cron-setup.sh

EOF
}

main() {
    install_restic
    install_rclone
    configure_ssh_key
    configure_rclone_minio
    init_restic_repo
    install_scripts
    print_next_steps
}

main "$@"
