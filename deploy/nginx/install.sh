#!/usr/bin/env bash
# Idempotent installer for Nebula's bastion nginx vhost.
#
# Drops `nebula-dominion.conf` into /etc/nginx/sites-available/ and links
# it into sites-enabled/ — mirrors how ocp-proxy.conf is shipped, so the
# whole bastion stays on one pattern (Debian-style sites-* layout, NOT
# the conf.d/ drop-in style we used in the first revision).
#
# Re-run safely after every push; reload is zero-downtime.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_SITES_AVAILABLE="${NGINX_SITES_AVAILABLE:-/etc/nginx/sites-available}"
NGINX_SITES_ENABLED="${NGINX_SITES_ENABLED:-/etc/nginx/sites-enabled}"
NGINX_CONF_D="${NGINX_CONF_D:-/etc/nginx/conf.d}"

if [[ $EUID -ne 0 ]]; then
  echo "Re-run with sudo." >&2
  exit 1
fi
[[ -d "$NGINX_SITES_AVAILABLE" ]] || { echo "Missing $NGINX_SITES_AVAILABLE (is this a sites-* nginx?)" >&2; exit 1; }
[[ -d "$NGINX_SITES_ENABLED"   ]] || { echo "Missing $NGINX_SITES_ENABLED" >&2; exit 1; }

echo "==> Installing nebula-dominion nginx vhost"

# 1. Clean up the OLD revision's conf.d/ drops if they exist.  The first
#    install pass mistakenly used /etc/nginx/conf.d/ instead of
#    sites-available; leaving those files around would either duplicate
#    server_name entries (nginx warns + uses the first) or, worse, the
#    old listen-80-only config would shadow this new 443-ssl one.
for stale in "${NGINX_CONF_D}/nebula-dominion.conf" \
             "${NGINX_CONF_D}/00-nebula-maps.conf"; do
  if [[ -f "$stale" ]]; then
    echo "  - removing stale ${stale}"
    rm -f "$stale"
  fi
done

# 2. Copy the canonical config into sites-available.
install -m 0644 "${SCRIPT_DIR}/nebula-dominion.conf" \
                "${NGINX_SITES_AVAILABLE}/nebula-dominion.conf"
echo "  - wrote ${NGINX_SITES_AVAILABLE}/nebula-dominion.conf"

# 3. Symlink into sites-enabled (only if missing or pointing elsewhere).
target="${NGINX_SITES_AVAILABLE}/nebula-dominion.conf"
link="${NGINX_SITES_ENABLED}/nebula-dominion.conf"
if [[ -L "$link" && "$(readlink -f "$link")" == "$target" ]]; then
  echo "  - symlink already in place"
else
  ln -sf "$target" "$link"
  echo "  - linked ${link} -> ${target}"
fi

# 4. Validate the entire nginx config — sites-enabled/* is part of it.
echo "==> nginx -t"
if ! nginx -t; then
  echo ""
  echo "Config test FAILED — vhost is in place but nginx NOT reloaded." >&2
  echo "Revert with:" >&2
  echo "  sudo rm ${link}" >&2
  echo "  sudo rm ${NGINX_SITES_AVAILABLE}/nebula-dominion.conf" >&2
  echo "  sudo nginx -t && sudo systemctl reload nginx" >&2
  exit 1
fi

# 5. Graceful reload — drains existing connections.
echo "==> systemctl reload nginx"
systemctl reload nginx

echo ""
echo "Done.  Nebula vhosts live on bastion:"
echo "  - https://nebula.caliptic.com"
echo "  - https://api-nebula.caliptic.com"
echo "  - https://game-nebula.caliptic.com"
echo ""
echo "Cloudflare tunnel Service field for all three should be:"
echo "  https://<BASTION_IP>:443"
echo "(same shape as ocp.caliptic.com / app.caliptic.com)"
