#!/usr/bin/env bash
# Install all backup cron jobs for Nebula Dominion.
# Run as root on each server. Detects primary vs replica automatically.
set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STANZA="nebula-pg"
PG_VERSION="16"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Must run as root"

is_pg_primary() {
    sudo -u postgres psql -tAc "SELECT NOT pg_is_in_recovery();" 2>/dev/null | grep -q "t"
}

install_postgres_crons() {
    if is_pg_primary; then
        log "This is the PostgreSQL PRIMARY — installing pgBackRest crons."

        # Daily full backup at 03:00
        crontab -u postgres -l 2>/dev/null | grep -v "pgbackrest" > /tmp/pgcron || true
        cat >> /tmp/pgcron <<EOF
# pgBackRest: daily full backup (03:00)
0 3 * * * pgbackrest --stanza=${STANZA} --type=full backup >> /var/log/pgbackrest/cron-full.log 2>&1

# pgBackRest: incremental backup every 6h (except 03:00 which does full)
0 9,15,21 * * * pgbackrest --stanza=${STANZA} --type=incr backup >> /var/log/pgbackrest/cron-incr.log 2>&1

# pgBackRest: archive verification (daily 04:00)
0 4 * * * pgbackrest --stanza=${STANZA} check >> /var/log/pgbackrest/cron-check.log 2>&1
EOF
        crontab -u postgres /tmp/pgcron
        rm -f /tmp/pgcron
        log "PostgreSQL backup crons installed for postgres user."
    else
        log "This is a PostgreSQL REPLICA — skipping pgBackRest crons."
    fi
}

install_restic_crons() {
    log "Installing Restic crons for root user..."
    crontab -l 2>/dev/null | grep -v "restic" | grep -v "dr-test" > /tmp/rootcron || true
    cat >> /tmp/rootcron <<EOF
# Restic: MinIO backup (03:30 daily)
30 3 * * * ${BACKUP_DIR}/restic/backup-minio.sh >> /var/log/restic/cron-minio.log 2>&1

# Restic: Config backup (04:00 daily)
0 4 * * * ${BACKUP_DIR}/restic/backup-config.sh >> /var/log/restic/cron-config.log 2>&1

# Backup health monitor (every 6 hours)
0 */6 * * * ${BACKUP_DIR}/scripts/monitor.sh >> /var/log/restic/monitor.log 2>&1

# Monthly DR test — 1st of month at 10:00
0 10 1 * * ${BACKUP_DIR}/scripts/dr-test.sh >> /var/log/dr-test.log 2>&1
EOF
    crontab /tmp/rootcron
    rm -f /tmp/rootcron
    log "Restic crons installed for root user."
}

show_installed_crons() {
    log ""
    log "=== Installed cron jobs ==="
    log "postgres user:"
    crontab -u postgres -l 2>/dev/null | grep -E "pgbackrest|#" || echo "  (none)"
    log ""
    log "root user:"
    crontab -l 2>/dev/null | grep -E "restic|dr-test|monitor|#" || echo "  (none)"
    log ""
}

main() {
    install_postgres_crons
    install_restic_crons
    show_installed_crons
    log "Cron setup complete."
}

main "$@"
