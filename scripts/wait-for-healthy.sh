#!/usr/bin/env bash
# wait-for-healthy.sh — Poll docker compose until all containers with health checks report healthy
# Usage: ./scripts/wait-for-healthy.sh [timeout_seconds]

set -euo pipefail

TIMEOUT="${1:-120}"
INTERVAL=5
ELAPSED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date -u +%H:%M:%SZ)] $*"; }

# Returns 0 if all containers are healthy (or have no healthcheck),
# 1 if still waiting, 2 if any are unhealthy.
check_health() {
  local ids
  ids=$(docker compose ps -q 2>/dev/null) || return 1
  [[ -z "$ids" ]] && return 1

  local total=0
  local healthy=0
  local unhealthy=0

  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    local status
    status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo "unknown")
    case "$status" in
      healthy)            healthy=$((healthy + 1)); total=$((total + 1)) ;;
      none)               ;;  # no healthcheck — skip
      unhealthy)          unhealthy=$((unhealthy + 1)); total=$((total + 1)) ;;
      starting|*)         total=$((total + 1)) ;;  # still coming up
    esac
  done <<< "$ids"

  if [[ "$unhealthy" -gt 0 ]]; then
    return 2
  fi

  if [[ "$total" -gt 0 && "$healthy" -ge "$total" ]]; then
    echo "$healthy"
    return 0
  fi

  echo "${healthy}/${total}"
  return 1
}

echo "================================================"
echo "  Waiting for containers to become healthy"
echo "  Timeout: ${TIMEOUT}s  |  Interval: ${INTERVAL}s"
echo "================================================"

while [[ "$ELAPSED" -lt "$TIMEOUT" ]]; do
  result=$(check_health) && code=$? || code=$?

  case "$code" in
    0)
      log "$(echo -e "${GREEN}✓ All ${result} container(s) healthy${NC}")"
      exit 0
      ;;
    2)
      log "$(echo -e "${RED}✗ One or more containers are unhealthy — aborting${NC}")"
      docker compose ps
      exit 1
      ;;
    *)
      log "$(echo -e "${YELLOW}⏳ ${result} healthy — waiting... (${ELAPSED}s / ${TIMEOUT}s)${NC}")"
      ;;
  esac

  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
log "$(echo -e "${RED}✗ Timeout after ${TIMEOUT}s — containers did not become healthy in time${NC}")"
docker compose ps
exit 1
