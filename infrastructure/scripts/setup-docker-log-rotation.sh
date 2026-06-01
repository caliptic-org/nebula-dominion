#!/usr/bin/env bash
#
# One-shot LXC setup: cap Docker container json logs at 50 MB × 3 files per
# container (so the biggest any single container's log file set can grow to
# is 150 MB before the oldest is rotated out). Without this, the default
# json-file driver grows unbounded — game-server alone produces hundreds of
# MB of socket.io trace per day at 1000× playtest pace.
#
# Idempotent — running it twice is fine, second run is a no-op if daemon.json
# already has the desired log-opts.
#
# Apply: `sudo bash infrastructure/scripts/setup-docker-log-rotation.sh`
# Reload: `systemctl restart docker` (causes brief container restart — DO
#         this OUTSIDE of a deploy window since it bounces ALL containers).

set -euo pipefail

DAEMON_JSON=/etc/docker/daemon.json
TARGET_OPTS='{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}'

if [ ! -f "$DAEMON_JSON" ]; then
  echo "Creating $DAEMON_JSON with log rotation policy..."
  mkdir -p "$(dirname "$DAEMON_JSON")"
  echo "$TARGET_OPTS" > "$DAEMON_JSON"
else
  # Existing file — merge our opts in via jq.  If jq isn't present, refuse
  # to clobber: the operator should install jq or edit manually.
  if ! command -v jq >/dev/null 2>&1; then
    echo "::error::jq required to merge log-opts into existing $DAEMON_JSON — apt install jq" >&2
    exit 1
  fi
  if jq -e '."log-opts"."max-size" == "50m" and ."log-opts"."max-file" == "3"' "$DAEMON_JSON" >/dev/null 2>&1; then
    echo "Daemon already configured for 50m × 3 rotation — no change."
    exit 0
  fi
  echo "Merging log rotation policy into existing $DAEMON_JSON..."
  TMP=$(mktemp)
  jq '. + {"log-driver":"json-file","log-opts":{"max-size":"50m","max-file":"3"}}' "$DAEMON_JSON" > "$TMP"
  mv "$TMP" "$DAEMON_JSON"
fi

echo "Done. Restart Docker to apply (will bounce all containers — schedule outside a deploy):"
echo "  systemctl restart docker"
echo
echo "Verify after restart:"
echo "  docker inspect <container-id> --format '{{.HostConfig.LogConfig}}'"
