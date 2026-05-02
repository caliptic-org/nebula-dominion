#!/bin/bash
# Docker Swarm Auto-Scaler
# Scales services up when CPU > 70%, down when CPU < 30%
# Runs as a background daemon on the Swarm manager node

set -euo pipefail

SCALE_UP_THRESHOLD=${SCALE_UP_THRESHOLD:-70}
SCALE_DOWN_THRESHOLD=${SCALE_DOWN_THRESHOLD:-30}
CHECK_INTERVAL=${CHECK_INTERVAL:-30}
COOLDOWN_PERIOD=${COOLDOWN_PERIOD:-120}

SERVICES=("nebula_web" "nebula_api" "nebula_game" "nebula_worker")
declare -A MIN_REPLICAS=( ["nebula_web"]=2 ["nebula_api"]=3 ["nebula_game"]=2 ["nebula_worker"]=2 )
declare -A MAX_REPLICAS=( ["nebula_web"]=8 ["nebula_api"]=12 ["nebula_game"]=8 ["nebula_worker"]=8 )
declare -A LAST_SCALED=()

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

get_service_cpu() {
  local service=$1
  local containers
  containers=$(docker ps --filter "label=com.docker.swarm.service.name=${service}" --format "{{.ID}}" 2>/dev/null || true)

  if [[ -z "$containers" ]]; then
    echo "0"
    return
  fi

  local total_cpu=0
  local count=0
  while IFS= read -r container; do
    local cpu
    cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" "$container" 2>/dev/null | tr -d '%' || echo "0")
    total_cpu=$(echo "$total_cpu + ${cpu:-0}" | bc)
    ((count++)) || true
  done <<< "$containers"

  if [[ $count -eq 0 ]]; then
    echo "0"
    return
  fi

  echo "scale=2; $total_cpu / $count" | bc
}

get_current_replicas() {
  local service=$1
  docker service inspect --format "{{.Spec.Mode.Replicated.Replicas}}" "$service" 2>/dev/null || echo "0"
}

can_scale() {
  local service=$1
  local now
  now=$(date +%s)
  local last=${LAST_SCALED[$service]:-0}
  local diff=$((now - last))
  [[ $diff -ge $COOLDOWN_PERIOD ]]
}

scale_service() {
  local service=$1
  local new_replicas=$2
  docker service scale "${service}=${new_replicas}"
  LAST_SCALED[$service]=$(date +%s)
  log "Scaled ${service} to ${new_replicas} replicas"
}

main() {
  log "Auto-scaler started (up=${SCALE_UP_THRESHOLD}%, down=${SCALE_DOWN_THRESHOLD}%, interval=${CHECK_INTERVAL}s)"

  while true; do
    for service in "${SERVICES[@]}"; do
      if ! docker service inspect "$service" &>/dev/null; then
        continue
      fi

      local avg_cpu
      avg_cpu=$(get_service_cpu "$service")
      local current_replicas
      current_replicas=$(get_current_replicas "$service")
      local min=${MIN_REPLICAS[$service]:-1}
      local max=${MAX_REPLICAS[$service]:-10}

      log "${service}: CPU=${avg_cpu}%, replicas=${current_replicas}"

      if (( $(echo "$avg_cpu > $SCALE_UP_THRESHOLD" | bc -l) )) && [[ $current_replicas -lt $max ]]; then
        if can_scale "$service"; then
          local new_replicas=$((current_replicas + 1))
          log "Scaling UP ${service}: ${current_replicas} -> ${new_replicas} (CPU: ${avg_cpu}%)"
          scale_service "$service" "$new_replicas"
        fi
      elif (( $(echo "$avg_cpu < $SCALE_DOWN_THRESHOLD" | bc -l) )) && [[ $current_replicas -gt $min ]]; then
        if can_scale "$service"; then
          local new_replicas=$((current_replicas - 1))
          log "Scaling DOWN ${service}: ${current_replicas} -> ${new_replicas} (CPU: ${avg_cpu}%)"
          scale_service "$service" "$new_replicas"
        fi
      fi
    done

    sleep "$CHECK_INTERVAL"
  done
}

main
