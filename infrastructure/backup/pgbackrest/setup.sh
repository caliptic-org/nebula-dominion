#!/usr/bin/env bash
# pgBackRest setup script for Nebula Dominion
# Run as root on both primary and replica servers.
set -euo pipefail

STANZA="nebula-pg"
PG_VERSION="16"
PGBACKREST_CONF_DIR="/etc/pgbackrest"
PGBACKREST_CONF_DEST="${PGBACKREST_CONF_DIR}/pgbackrest.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="/etc/pgbackrest/pgbackrest.env"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

check_root() {
    [[ $EUID -eq 0 ]] || die "Must run as root"
}

load_env() {
    [[ -f "$ENV_FILE" ]] || die "Environment file not found: $ENV_FILE — copy env.template and fill in values"
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    [[ -n "${HETZNER_STORAGE_BOX_HOST:-}" ]] || die "HETZNER_STORAGE_BOX_HOST not set in $ENV_FILE"
    [[ -n "${PGBACKREST_REPO1_CIPHER_PASS:-}" ]] || die "PGBACKREST_REPO1_CIPHER_PASS not set"
    [[ -n "${PGBACKREST_REPO2_CIPHER_PASS:-}" ]] || die "PGBACKREST_REPO2_CIPHER_PASS not set"
}

install_pgbackrest() {
    log "Installing pgBackRest..."
    apt-get update -q
    apt-get install -y pgbackrest
    log "pgBackRest $(pgbackrest version) installed."
}

configure_pgbackrest() {
    log "Installing pgBackRest config..."
    mkdir -p "$PGBACKREST_CONF_DIR"

    # Expand environment variables into config
    envsubst < "${SCRIPT_DIR}/pgbackrest.conf" > "$PGBACKREST_CONF_DEST"
    chmod 640 "$PGBACKREST_CONF_DEST"
    chown postgres:postgres "$PGBACKREST_CONF_DEST"

    mkdir -p /var/log/pgbackrest
    chown postgres:postgres /var/log/pgbackrest

    mkdir -p /mnt/backup/pgbackrest
    chown postgres:postgres /mnt/backup/pgbackrest
}

configure_ssh_key() {
    log "Setting up SSH key for Hetzner Storage Box..."
    local SSH_DIR="/home/postgres/.ssh"
    local KEY_FILE="${SSH_DIR}/hetzner_backup_key"

    mkdir -p "$SSH_DIR"
    chown postgres:postgres "$SSH_DIR"
    chmod 700 "$SSH_DIR"

    if [[ ! -f "$KEY_FILE" ]]; then
        sudo -u postgres ssh-keygen -t ed25519 -N "" -C "pgbackrest@nebula" -f "$KEY_FILE"
        log "SSH key generated. Public key to add to Hetzner Storage Box authorized_keys:"
        cat "${KEY_FILE}.pub"
        echo ""
        log "Add the above key to your Hetzner Storage Box at:"
        log "  https://robot.hetzner.com/storage → SSH Keys"
    else
        log "SSH key already exists at $KEY_FILE"
    fi

    # Add Hetzner Storage Box to known_hosts
    sudo -u postgres ssh-keyscan -H "${HETZNER_STORAGE_BOX_HOST}" >> "${SSH_DIR}/known_hosts" 2>/dev/null || true
    chown postgres:postgres "${SSH_DIR}/known_hosts"
    chmod 600 "${SSH_DIR}/known_hosts"
}

configure_postgresql_archiving() {
    log "Configuring PostgreSQL WAL archiving..."
    local CONF_D="/etc/postgresql/${PG_VERSION}/main/conf.d"
    mkdir -p "$CONF_D"
    cp "${SCRIPT_DIR}/postgresql-archive.conf" "${CONF_D}/pgbackrest-archive.conf"
    chown postgres:postgres "${CONF_D}/pgbackrest-archive.conf"
    log "Restart PostgreSQL to apply: systemctl restart postgresql@${PG_VERSION}-main"
}

create_stanza() {
    log "Creating pgBackRest stanza: $STANZA ..."
    log "Waiting for PostgreSQL to be running..."
    local attempts=0
    until sudo -u postgres pg_isready -q; do
        sleep 2
        ((attempts++))
        [[ $attempts -lt 30 ]] || die "PostgreSQL did not start in time"
    done

    sudo -u postgres pgbackrest --stanza="$STANZA" stanza-create
    log "Stanza created successfully."
}

verify_setup() {
    log "Verifying pgBackRest setup..."
    sudo -u postgres pgbackrest --stanza="$STANZA" check
    log "pgBackRest check passed."
}

print_next_steps() {
    cat <<'EOF'

=== pgBackRest Setup Complete ===

Next steps:
  1. Add the generated SSH public key to your Hetzner Storage Box
  2. Restart PostgreSQL: systemctl restart postgresql@16-main
  3. Verify archive is working: sudo -u postgres pgbackrest --stanza=nebula-pg check
  4. Run first full backup: sudo -u postgres pgbackrest --stanza=nebula-pg --type=full backup
  5. Add cron jobs: bash infrastructure/backup/scripts/cron-setup.sh

EOF
}

main() {
    check_root
    load_env
    install_pgbackrest
    configure_pgbackrest
    configure_ssh_key
    configure_postgresql_archiving
    create_stanza
    verify_setup
    print_next_steps
}

main "$@"
