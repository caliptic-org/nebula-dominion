#!/usr/bin/env bash
# Idempotent installer for the bastion nginx config.
#
# Run on the bastion VM as root (sudo).  Copies Nebula's drop-in config to
# /etc/nginx/conf.d/, validates with `nginx -t`, and reloads — without
# touching the shared nginx.conf or any other project's files.
#
# Re-run safely any time the source files change.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"

if [[ $EUID -ne 0 ]]; then
  echo "This script needs to write to ${NGINX_CONF_DIR}. Re-run with sudo." >&2
  exit 1
fi

if [[ ! -d "$NGINX_CONF_DIR" ]]; then
  echo "Expected ${NGINX_CONF_DIR} to exist (is nginx installed?)." >&2
  exit 1
fi

echo "==> Installing Nebula nginx config to ${NGINX_CONF_DIR}/"

# 1. Decide whether the connection_upgrade map already exists somewhere.
# Excluding any nebula-* file so we don't trip over our own previous install.
existing_map_hit="$(grep -RH 'connection_upgrade' /etc/nginx/ 2>/dev/null \
                   | grep -v '/nebula-' \
                   | grep -v '/00-nebula-maps.conf' \
                   || true)"

if [[ -n "$existing_map_hit" ]]; then
  echo "  - \$connection_upgrade already defined elsewhere — skipping 00-nebula-maps.conf."
  echo "    (hit: $(echo "$existing_map_hit" | head -1))"
  rm -f "${NGINX_CONF_DIR}/00-nebula-maps.conf"
else
  echo "  - installing 00-nebula-maps.conf (provides \$connection_upgrade map)."
  install -m 0644 "${SCRIPT_DIR}/00-nebula-maps.conf" "${NGINX_CONF_DIR}/00-nebula-maps.conf"
fi

# 2. Always install the main vhost file.
echo "  - installing nebula-dominion.conf"
install -m 0644 "${SCRIPT_DIR}/nebula-dominion.conf" "${NGINX_CONF_DIR}/nebula-dominion.conf"

# 3. Validate the whole nginx config — fail fast if our edits broke it.
echo "==> Running nginx -t"
if ! nginx -t; then
  echo "" >&2
  echo "nginx config test FAILED. The new file is in place but nginx is NOT reloaded." >&2
  echo "Either fix the error and re-run, or remove the new files:" >&2
  echo "  sudo rm ${NGINX_CONF_DIR}/nebula-dominion.conf ${NGINX_CONF_DIR}/00-nebula-maps.conf" >&2
  exit 1
fi

# 4. Reload — drains existing connections gracefully.
echo "==> Reloading nginx"
systemctl reload nginx

echo ""
echo "Done. Nebula vhosts are live:"
echo "  - nebula.caliptic.com       (web)"
echo "  - api-nebula.caliptic.com   (api)"
echo "  - game-nebula.caliptic.com  (game-server, WS-enabled)"
echo ""
echo "Smoke check:"
echo "  curl -sI -H 'Host: nebula.caliptic.com' http://localhost/ | head -1"
