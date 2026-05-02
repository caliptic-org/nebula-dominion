#!/usr/bin/env bash
# MinIO cross-replication setup and sync verification
# Run once on setup to configure server-side replication rules,
# then run periodically to verify replication health.
#
# MinIO server-side replication keeps buckets in sync in real-time.
# This script:
#   1. Sets up one-way replication rules from primary to replica site
#   2. Can verify sync status and alert on lag
set -euo pipefail

MC="${MC_CMD:-mc}"
PRIMARY_ALIAS="${MINIO_PRIMARY_ALIAS:-minio-primary}"
REPLICA_ALIAS="${MINIO_REPLICA_ALIAS:-minio-replica}"
LOG_FILE="/var/log/nebula-backup/minio-replication.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

BUCKETS=(
  "nebula-assets"
  "nebula-avatars"
  "nebula-replays"
  "nebula-backups"
)

mkdir -p "$(dirname "$LOG_FILE")"

log()   { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }
alert() {
  log "ERROR: $*"
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -s -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\":\":rotating_light: *MinIO Replication Alert* on $(hostname): $*\"}" || true
  fi
}

setup_replication() {
  log "Setting up MinIO server-side replication rules"

  for BUCKET in "${BUCKETS[@]}"; do
    log "Configuring replication for bucket: $BUCKET"

    # Ensure bucket exists on both sites with versioning enabled
    "$MC" mb --ignore-existing "${PRIMARY_ALIAS}/${BUCKET}" 2>>"$LOG_FILE" || true
    "$MC" mb --ignore-existing "${REPLICA_ALIAS}/${BUCKET}" 2>>"$LOG_FILE" || true
    "$MC" version enable "${PRIMARY_ALIAS}/${BUCKET}" 2>>"$LOG_FILE" || true
    "$MC" version enable "${REPLICA_ALIAS}/${BUCKET}" 2>>"$LOG_FILE" || true

    # Add replication rule (primary → replica)
    "$MC" replicate add \
      --remote-bucket "${REPLICA_ALIAS}/${BUCKET}" \
      --replicate "delete,delete-marker,existing-objects" \
      "${PRIMARY_ALIAS}/${BUCKET}" 2>>"$LOG_FILE"

    log "Replication rule added for $BUCKET"
  done

  log "Replication setup complete"
}

verify_replication() {
  log "Verifying MinIO replication health"
  FAILED=0

  for BUCKET in "${BUCKETS[@]}"; do
    # Check replication status
    STATUS=$("$MC" replicate status "${PRIMARY_ALIAS}/${BUCKET}" --json 2>/dev/null || echo '{"error":"unreachable"}')
    PENDING=$(echo "$STATUS" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  print(d.get('stats', {}).get('failedReplicationCount', 0))
except Exception:
  print(-1)
" 2>/dev/null || echo -1)

    if [[ "$PENDING" -gt 100 ]]; then
      alert "Bucket $BUCKET has $PENDING failed/pending replications"
      FAILED=$((FAILED + 1))
    elif [[ "$PENDING" -lt 0 ]]; then
      alert "Could not retrieve replication status for $BUCKET"
      FAILED=$((FAILED + 1))
    else
      log "Bucket $BUCKET: replication OK (pending failures: $PENDING)"
    fi
  done

  return $FAILED
}

COMMAND="${1:-verify}"

case "$COMMAND" in
  setup)
    setup_replication
    ;;
  verify)
    verify_replication
    ;;
  *)
    echo "Usage: $0 {setup|verify}"
    exit 1
    ;;
esac
