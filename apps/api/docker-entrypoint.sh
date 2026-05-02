#!/bin/sh
set -e

wait_for() {
  local host="$1"
  local port="$2"
  local label="$3"
  local retries=30

  echo "Waiting for $label ($host:$port)..."
  while ! nc -z "$host" "$port" 2>/dev/null; do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "Timeout waiting for $label" >&2
      exit 1
    fi
    sleep 1
  done
  echo "$label is ready."
}

# Parse and wait for PostgreSQL
if [ -n "$DATABASE_URL" ]; then
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+)[:/].*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_PORT="${DB_PORT:-5432}"
  wait_for "$DB_HOST" "$DB_PORT" "PostgreSQL"
elif [ -n "$DB_HOST" ]; then
  wait_for "${DB_HOST}" "${DB_PORT:-5432}" "PostgreSQL"
fi

# Parse and wait for Redis
if [ -n "$REDIS_URL" ]; then
  REDIS_HOST=$(echo "$REDIS_URL" | sed -E 's|redis://([^:/@]+).*|\1|' | sed -E 's|.*@(.*)|\1|')
  REDIS_PORT=$(echo "$REDIS_URL" | sed -E 's|.*:([0-9]+)(/.*)?$|\1|')
  REDIS_PORT="${REDIS_PORT:-6379}"
  wait_for "$REDIS_HOST" "$REDIS_PORT" "Redis"
elif [ -n "$REDIS_HOST" ]; then
  wait_for "${REDIS_HOST}" "${REDIS_PORT:-6379}" "Redis"
fi

exec "$@"
