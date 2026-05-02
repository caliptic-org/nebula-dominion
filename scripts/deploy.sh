#!/bin/bash
# Nebula Dominion deployment script
# Usage: ./scripts/deploy.sh [stack-name]

set -euo pipefail

STACK_NAME=${1:-nebula}
COMPOSE_FILE=${COMPOSE_FILE:-docker-stack.yml}
REGISTRY=${REGISTRY:-registry.local}

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

check_manager() {
  if ! docker info --format "{{.Swarm.ControlAvailable}}" 2>/dev/null | grep -q "true"; then
    echo "ERROR: This node is not a Swarm manager. Run deploy on a manager node."
    exit 1
  fi
}

pull_images() {
  log "Pulling latest images from ${REGISTRY}..."
  docker pull "${REGISTRY}/nebula-web:latest"
  docker pull "${REGISTRY}/nebula-api:latest"
  docker pull "${REGISTRY}/nebula-game:latest"
  docker pull "${REGISTRY}/nebula-worker:latest"
}

ensure_secrets() {
  for secret in database_url redis_url jwt_secret; do
    if ! docker secret inspect "$secret" &>/dev/null; then
      echo "WARNING: Secret '${secret}' not found. Create it before deploying:"
      echo "  echo 'value' | docker secret create ${secret} -"
    fi
  done
}

deploy() {
  log "Deploying stack '${STACK_NAME}' from ${COMPOSE_FILE}..."
  docker stack deploy \
    --compose-file "$COMPOSE_FILE" \
    --with-registry-auth \
    --prune \
    "$STACK_NAME"
}

wait_for_services() {
  log "Waiting for services to converge..."
  local services=("web" "api" "game" "worker")
  for svc in "${services[@]}"; do
    local full="${STACK_NAME}_${svc}"
    log "  Checking ${full}..."
    local attempts=0
    while [[ $attempts -lt 30 ]]; do
      local desired running
      desired=$(docker service inspect --format "{{.Spec.Mode.Replicated.Replicas}}" "$full" 2>/dev/null || echo "0")
      running=$(docker service ps "$full" --filter "desired-state=running" --format "{{.CurrentState}}" 2>/dev/null | grep -c "Running" || echo "0")
      if [[ "$running" -ge "$desired" && "$desired" -gt 0 ]]; then
        log "  ${full}: ${running}/${desired} running"
        break
      fi
      sleep 5
      ((attempts++))
    done
  done
}

check_manager
ensure_secrets
pull_images
deploy
wait_for_services

log "Deployment complete. Stack status:"
docker stack ps "$STACK_NAME" --no-trunc
