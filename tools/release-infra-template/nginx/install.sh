#!/usr/bin/env bash
# Idempotent installer for __PROJECT__'s bastion nginx config.
#
# Run on the bastion VM as root (sudo).  Copies the drop-in conf files to
# /etc/nginx/conf.d/, validates with `nginx -t`, and reloads — without
# touching nginx.conf or any other project's files.
#
# Safe to re-run any time the source files change.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
PROJECT_SHORT="__SHORT__"

if [[ $EUID -ne 0 ]]; then
  echo "This script needs to write to ${NGINX_CONF_DIR}. Re-run with sudo." >&2
  exit 1
fi
if [[ ! -d "$NGINX_CONF_DIR" ]]; then
  echo "Expected ${NGINX_CONF_DIR} to exist (is nginx installed?)." >&2
  exit 1
fi

echo "==> Installing ${PROJECT_SHORT} nginx config to ${NGINX_CONF_DIR}/"

# Decide whether the connection_upgrade map already exists.
existing_map_hit="$(grep -RH 'connection_upgrade' /etc/nginx/ 2>/dev/null \
                   | grep -v "/${PROJECT_SHORT}" \
                   | grep -v "/00-${PROJECT_SHORT}-maps.conf" \
                   || true)"

if [[ -n "$existing_map_hit" ]]; then
  echo "  - \$connection_upgrade already defined — skipping 00-${PROJECT_SHORT}-maps.conf."
  echo "    (hit: $(echo "$existing_map_hit" | head -1))"
  rm -f "${NGINX_CONF_DIR}/00-${PROJECT_SHORT}-maps.conf"
else
  echo "  - installing 00-${PROJECT_SHORT}-maps.conf"
  install -m 0644 "${SCRIPT_DIR}/00-${PROJECT_SHORT}-maps.conf" "${NGINX_CONF_DIR}/00-${PROJECT_SHORT}-maps.conf"
fi

echo "  - installing ${PROJECT_SHORT}.conf"
install -m 0644 "${SCRIPT_DIR}/${PROJECT_SHORT}.conf" "${NGINX_CONF_DIR}/${PROJECT_SHORT}.conf"

echo "==> Running nginx -t"
if ! nginx -t; then
  echo "" >&2
  echo "nginx config test FAILED.  Files in place but nginx NOT reloaded." >&2
  echo "Remove with:" >&2
  echo "  sudo rm ${NGINX_CONF_DIR}/${PROJECT_SHORT}.conf ${NGINX_CONF_DIR}/00-${PROJECT_SHORT}-maps.conf" >&2
  exit 1
fi

echo "==> Reloading nginx"
systemctl reload nginx

echo ""
echo "Done.  ${PROJECT_SHORT} vhosts live:"
echo "  - __HOST_WEB__   (web)"
echo "  - __HOST_API__   (api)"
# __WS_DONE_BEGIN__
echo "  - __HOST_WS__    (WebSocket)"
# __WS_DONE_END__
