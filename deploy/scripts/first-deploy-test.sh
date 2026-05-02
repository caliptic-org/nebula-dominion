#!/usr/bin/env bash
# first-deploy-test.sh — Smoke-test the first deployment
# Verifies registry push, Docker Swarm service, and HTTP response.
set -euo pipefail

REGISTRY="${REGISTRY:-registry.local:5000}"
IMAGE="${REGISTRY}/nebula-dominion:smoke-test"
SWARM_SERVICE="${SWARM_SERVICE:-nebula_web}"
APP_URL="${APP_URL:-http://localhost:3000}"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
pass() { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

echo "=== Nebula Dominion — First Deploy Test ==="

# 1. Registry reachable
echo "[1/5] Registry reachability ..."
curl -sf "http://${REGISTRY}/v2/" >/dev/null || fail "Registry not reachable at ${REGISTRY}"
pass "Registry OK"

# 2. Build & push smoke-test image
echo "[2/5] Building + pushing smoke-test image ..."
docker build -t "$IMAGE" "$(dirname "$(dirname "$0")")/.." || fail "docker build failed"
docker push "$IMAGE" || fail "docker push failed"
pass "Image pushed: ${IMAGE}"

# 3. Docker Swarm available
echo "[3/5] Docker Swarm status ..."
docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active" || fail "Docker Swarm not active (run: docker swarm init)"
pass "Swarm active"

# 4. Deploy/update service
echo "[4/5] Deploying service ..."
if docker service ls --format '{{.Name}}' | grep -q "^${SWARM_SERVICE}$"; then
  docker service update --image "$IMAGE" "$SWARM_SERVICE" || fail "Service update failed"
  pass "Service updated: ${SWARM_SERVICE}"
else
  docker service create \
    --name "$SWARM_SERVICE" \
    --replicas 1 \
    --publish published=3000,target=3000 \
    "$IMAGE" || fail "Service create failed"
  pass "Service created: ${SWARM_SERVICE}"
fi

# 5. Wait for HTTP
echo "[5/5] Waiting for HTTP response at ${APP_URL} ..."
for i in $(seq 1 12); do
  if curl -sf "${APP_URL}/health" >/dev/null 2>&1 || curl -sf "${APP_URL}" >/dev/null 2>&1; then
    pass "App responding at ${APP_URL}"
    break
  fi
  sleep 5
  [[ $i -eq 12 ]] && fail "App did not respond within 60 seconds"
done

echo ""
echo -e "${GREEN}=== First deploy test PASSED ===${NC}"
echo "Registry UI:  http://localhost:8081"
echo "App:          ${APP_URL}"
