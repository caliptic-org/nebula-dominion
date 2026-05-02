#!/usr/bin/env bash
# Restic configuration backup to Hetzner Storage Box
# Backs up: Ansible playbooks, Docker stacks, configs, secrets (encrypted), env files
# Schedule: Daily at 02:00
set -euo pipefail

RESTIC="${RESTIC_CMD:-restic}"
REPO="${RESTIC_REPOSITORY:-sftp:nebula-backup@${HETZNER_STORAGEBOX_HOST:-storagebox.example.com}:/nebula-dominion/restic-config}"
export RESTIC_PASSWORD="${RESTIC_PASSWORD:?RESTIC_PASSWORD env var must be set}"
LOG_FILE="/var/log/nebula-backup/restic-config.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

BACKUP_PATHS=(
  "/etc/pgbackrest"
  "/etc/postgresql"
  "/etc/redis"
  "/etc/haproxy"
  "/etc/caddy"
  "/opt/nebula/ansible"
  "/opt/nebula/docker"
  "/opt/nebula/.env.encrypted"
  "/etc/prometheus"
  "/etc/grafana"
)

EXCLUDE_PATTERNS=(
  "*.log"
  "*.tmp"
  "*/node_modules/*"
  "*/__pycache__/*"
)

mkdir -p "$(dirname "$LOG_FILE")"

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }
alert() {
  log "ERROR: $*"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":rotating_light: *Restic Config Backup FAILED* on $(hostname): $*\"}" || true
  fi
}

# Build exclude flags
EXCLUDE_FLAGS=()
for PATTERN in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_FLAGS+=(--exclude "$PATTERN")
done

# Build path list (only include paths that exist)
EXISTING_PATHS=()
for P in "${BACKUP_PATHS[@]}"; do
  if [[ -e "$P" ]]; then
    EXISTING_PATHS+=("$P")
  else
    log "WARNING: backup path not found, skipping: $P"
  fi
done

if [[ ${#EXISTING_PATHS[@]} -eq 0 ]]; then
  alert "No backup paths found — nothing to back up"
  exit 1
fi

log "Starting Restic config backup to $REPO"
log "Paths: ${EXISTING_PATHS[*]}"

# Initialize repo if it doesn't exist yet
if ! "$RESTIC" -r "$REPO" snapshots &>/dev/null; then
  log "Initializing Restic repository"
  if ! "$RESTIC" -r "$REPO" init >> "$LOG_FILE" 2>&1; then
    alert "Failed to initialize Restic repository"
    exit 1
  fi
fi

# Run backup
if ! "$RESTIC" -r "$REPO" backup \
    --tag "config" \
    --tag "$(hostname)" \
    --hostname "$(hostname)" \
    --json \
    "${EXCLUDE_FLAGS[@]}" \
    "${EXISTING_PATHS[@]}" >> "$LOG_FILE" 2>&1; then
  alert "Restic backup failed — check $LOG_FILE"
  exit 1
fi

log "Restic backup completed"

# Forget old snapshots: keep 7 daily, 4 weekly, 3 monthly
if ! "$RESTIC" -r "$REPO" forget \
    --tag "config" \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 3 \
    --prune >> "$LOG_FILE" 2>&1; then
  log "WARNING: Restic forget/prune failed (non-fatal)"
fi

# Verify repository integrity monthly (first day of month)
if [[ "$(date +%d)" == "01" ]]; then
  log "Running monthly repository integrity check"
  if ! "$RESTIC" -r "$REPO" check >> "$LOG_FILE" 2>&1; then
    alert "Restic repository integrity check FAILED"
    exit 1
  fi
  log "Repository integrity check passed"
fi

log "Restic config backup job finished"
