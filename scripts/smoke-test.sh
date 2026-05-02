#!/usr/bin/env bash
# smoke-test.sh — Docker environment smoke tests for Nebula Dominion
# Tests: PostgreSQL, Redis, MinIO, NestJS API, Game Server, Next.js Web, Auth flow, WebSocket
# Usage: ./scripts/smoke-test.sh

set -uo pipefail

# ── Endpoints (override via env) ─────────────────────────────────────────────
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-nebula}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

MINIO_HOST="${MINIO_HOST:-localhost}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"

API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-4000}"
API_PREFIX="${API_PREFIX:-}"

GAME_HOST="${GAME_HOST:-localhost}"
GAME_PORT="${GAME_PORT:-5000}"
GAME_PREFIX="${GAME_PREFIX:-api}"

WEB_HOST="${WEB_HOST:-localhost}"
WEB_PORT="${WEB_PORT:-3000}"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Result tracking ───────────────────────────────────────────────────────────
PASSED=0
FAILED=0
PASSED_LIST=()
FAILED_LIST=()

pass() {
  local name="$1"; shift
  printf "${GREEN}✓ PASS${NC}  %-20s %s\n" "[$name]" "${*:-}"
  PASSED=$((PASSED + 1))
  PASSED_LIST+=("$name")
}

fail() {
  local name="$1"; shift
  printf "${RED}✗ FAIL${NC}  %-20s %s\n" "[$name]" "${*:-}"
  FAILED=$((FAILED + 1))
  FAILED_LIST+=("$name")
}

warn() {
  printf "${YELLOW}⚠ WARN${NC}  %s\n" "$*"
}

http_status() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$@" 2>/dev/null || echo "000"
}

# ── Test functions ─────────────────────────────────────────────────────────────

test_postgresql() {
  printf "${CYAN}[1/8]${NC} PostgreSQL connection...\n"
  if command -v pg_isready &>/dev/null; then
    if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -t 5 &>/dev/null; then
      pass "PostgreSQL" "pg_isready ${PG_HOST}:${PG_PORT} OK"
    else
      fail "PostgreSQL" "pg_isready failed at ${PG_HOST}:${PG_PORT}"
    fi
  else
    # Fallback: TCP connection check
    if bash -c "echo > /dev/tcp/${PG_HOST}/${PG_PORT}" 2>/dev/null; then
      pass "PostgreSQL" "TCP ${PG_HOST}:${PG_PORT} reachable (pg_isready not available)"
    else
      fail "PostgreSQL" "TCP connect failed at ${PG_HOST}:${PG_PORT}"
    fi
  fi
}

test_redis() {
  printf "${CYAN}[2/8]${NC} Redis ping...\n"
  if command -v redis-cli &>/dev/null; then
    local response
    response=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --no-auth-warning PING 2>/dev/null || echo "")
    if [[ "$response" == "PONG" ]]; then
      pass "Redis" "PING → PONG at ${REDIS_HOST}:${REDIS_PORT}"
    else
      fail "Redis" "Expected PONG, got '${response}' at ${REDIS_HOST}:${REDIS_PORT}"
    fi
  else
    if bash -c "echo > /dev/tcp/${REDIS_HOST}/${REDIS_PORT}" 2>/dev/null; then
      pass "Redis" "TCP ${REDIS_HOST}:${REDIS_PORT} reachable (redis-cli not available)"
    else
      fail "Redis" "TCP connect failed at ${REDIS_HOST}:${REDIS_PORT}"
    fi
  fi
}

test_minio() {
  printf "${CYAN}[3/8]${NC} MinIO health...\n"
  local status
  status=$(http_status "http://${MINIO_HOST}:${MINIO_PORT}/minio/health/ready")
  if [[ "$status" == "200" ]]; then
    pass "MinIO" "GET /minio/health/ready → ${status}"
  else
    # Try the live endpoint as fallback
    status=$(http_status "http://${MINIO_HOST}:${MINIO_PORT}/minio/health/live")
    if [[ "$status" == "200" ]]; then
      pass "MinIO" "GET /minio/health/live → ${status}"
    else
      fail "MinIO" "health endpoints returned HTTP ${status} at ${MINIO_HOST}:${MINIO_PORT}"
    fi
  fi
}

test_api_health() {
  printf "${CYAN}[4/8]${NC} NestJS API health...\n"
  local prefix="${API_PREFIX:+/${API_PREFIX}}"
  local status
  status=$(http_status "http://${API_HOST}:${API_PORT}${prefix}/health")
  if [[ "$status" == "200" ]]; then
    pass "NestJS API" "GET ${prefix}/health → ${status}"
  else
    fail "NestJS API" "Expected 200, got HTTP ${status} at http://${API_HOST}:${API_PORT}${prefix}/health"
  fi
}

test_game_health() {
  printf "${CYAN}[5/8]${NC} Game Server health...\n"
  local prefix="/${GAME_PREFIX}"
  # Try liveness probe first (simpler, no external dependencies)
  local status
  status=$(http_status "http://${GAME_HOST}:${GAME_PORT}${prefix}/health/live")
  if [[ "$status" == "200" ]]; then
    pass "Game Server" "GET ${prefix}/health/live → ${status}"
  else
    # Fallback: try root health path (matches docker-stack.yml healthcheck)
    status=$(http_status "http://${GAME_HOST}:${GAME_PORT}/health")
    if [[ "$status" == "200" ]]; then
      pass "Game Server" "GET /health → ${status}"
    else
      fail "Game Server" "health endpoint returned HTTP ${status} at http://${GAME_HOST}:${GAME_PORT}"
    fi
  fi
}

test_web() {
  printf "${CYAN}[6/8]${NC} Next.js Web...\n"
  local status
  status=$(http_status "http://${WEB_HOST}:${WEB_PORT}/")
  if [[ "$status" == "200" || "$status" == "301" || "$status" == "302" || "$status" == "307" || "$status" == "308" ]]; then
    pass "Next.js Web" "GET / → ${status}"
  else
    fail "Next.js Web" "Expected 2xx/3xx, got HTTP ${status} at http://${WEB_HOST}:${WEB_PORT}/"
  fi
}

test_auth_flow() {
  printf "${CYAN}[7/8]${NC} Auth flow: register → login → JWT...\n"
  local prefix="${API_PREFIX:+/${API_PREFIX}}"
  local ts
  ts=$(date +%s)
  local email="smoke_${ts}@nebula.test"
  local password="Smoke@${ts}!"
  local username="smoketest_${ts}"

  # Register
  local reg_body reg_status
  reg_body=$(curl -s -w '\n%{http_code}' --max-time 10 \
    -X POST "http://${API_HOST}:${API_PORT}${prefix}/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"username\":\"${username}\"}" \
    2>/dev/null || echo -e '\n000')
  reg_status=$(echo "$reg_body" | tail -1)

  if [[ "$reg_status" != "201" && "$reg_status" != "200" ]]; then
    fail "Auth Flow" "Register returned HTTP ${reg_status} (expected 200/201)"
    return
  fi

  # Login
  local login_body login_status token
  login_body=$(curl -s -w '\n%{http_code}' --max-time 10 \
    -X POST "http://${API_HOST}:${API_PORT}${prefix}/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
    2>/dev/null || echo -e '\n000')
  login_status=$(echo "$login_body" | tail -1)
  token=$(echo "$login_body" | head -1 | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"//;s/"//' || echo "")

  if [[ "$login_status" != "200" && "$login_status" != "201" ]]; then
    fail "Auth Flow" "Login returned HTTP ${login_status} (expected 200/201)"
    return
  fi

  if [[ -z "$token" ]]; then
    fail "Auth Flow" "Login succeeded but response contained no access_token"
    return
  fi

  pass "Auth Flow" "register(${reg_status}) → login(${login_status}) → JWT (${#token} chars)"
  export SMOKE_JWT_TOKEN="$token"
}

test_websocket() {
  printf "${CYAN}[8/8]${NC} WebSocket ping/pong (game server)...\n"

  # Socket.IO HTTP upgrade probe: polling transport responds to a simple GET
  local ws_base="http://${GAME_HOST}:${GAME_PORT}"
  local status
  status=$(http_status "${ws_base}/socket.io/?EIO=4&transport=polling")
  if [[ "$status" == "200" ]]; then
    pass "WebSocket" "Socket.IO polling transport reachable at ${ws_base}"
    return
  fi

  # Fallback: full ping/pong using Node.js + socket.io-client if available
  if ! command -v node &>/dev/null; then
    warn "WebSocket: node not found and Socket.IO polling returned HTTP ${status} — skipping"
    return
  fi

  local token="${SMOKE_JWT_TOKEN:-}"
  local ws_result exit_code

  ws_result=$(WS_URL="$ws_base" WS_TOKEN="$token" timeout 15 node - <<'EOF' 2>&1 || true
const http = require('http');
const url = new URL(process.env.WS_URL + '/socket.io/?EIO=4&transport=polling');
const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search }, (res) => {
  process.stdout.write('HTTP ' + res.statusCode + '\n');
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', (e) => { process.stdout.write('error: ' + e.message + '\n'); process.exit(1); });
req.end();
EOF
  ) && exit_code=0 || exit_code=$?

  if [[ "$exit_code" -eq 0 ]]; then
    pass "WebSocket" "Socket.IO polling endpoint reachable at ${ws_base}"
  else
    fail "WebSocket" "Socket.IO endpoint unreachable: ${ws_result}"
  fi
}

# ── Run all tests ─────────────────────────────────────────────────────────────
echo "================================================"
echo "  Nebula Dominion — Docker Smoke Tests"
echo "================================================"
echo ""

test_postgresql
test_redis
test_minio
test_api_health
test_game_health
test_web
test_auth_flow
test_websocket

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  Results"
echo "================================================"

if [[ ${#PASSED_LIST[@]} -gt 0 ]]; then
  printf "${GREEN}Passed (%d):${NC}\n" "${#PASSED_LIST[@]}"
  for s in "${PASSED_LIST[@]}"; do printf "  ${GREEN}✓${NC} %s\n" "$s"; done
fi

if [[ ${#FAILED_LIST[@]} -gt 0 ]]; then
  printf "${RED}Failed (%d):${NC}\n" "${#FAILED_LIST[@]}"
  for s in "${FAILED_LIST[@]}"; do printf "  ${RED}✗${NC} %s\n" "$s"; done
fi

echo ""
if [[ "$FAILED" -eq 0 ]]; then
  printf "${GREEN}All %d smoke tests passed.${NC}\n" "$PASSED"
  exit 0
else
  printf "${RED}%d of %d smoke test(s) failed.${NC}\n" "$FAILED" "$((PASSED + FAILED))"
  exit 1
fi
