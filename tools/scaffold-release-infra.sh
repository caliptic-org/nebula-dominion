#!/usr/bin/env bash
# Bootstrap the release infrastructure (bastion nginx + GitHub Actions
# workflow) into a fresh project repository.
#
# Reads templates from ./release-infra-template/ next to this script,
# substitutes placeholders, and writes the result under <TARGET>/deploy/
# nginx/ and <TARGET>/.github/workflows/.
#
# ── Usage ──────────────────────────────────────────────────────────────────
#
#   bash tools/scaffold-release-infra.sh [TARGET_DIR]
#
# If TARGET_DIR is omitted, prompts interactively.  Every placeholder also
# prompts when not supplied via env var.
#
#   # Non-interactive (CI / one-liner):
#   TARGET_DIR=~/work/myapp \
#   PROJECT=myapp \
#   SHORT=myapp \
#   NAMESPACE=myapp-prod \
#   HOST_WEB=myapp.caliptic.com \
#   HOST_API=api-myapp.caliptic.com \
#   HOST_WS= \
#   WS_SERVICE= \
#   CLUSTER_DOMAIN=apps.ocp-sno.caliptic.com \
#   bash tools/scaffold-release-infra.sh
#
# Set HOST_WS empty to skip the WebSocket vhost entirely.
#
# ── Idempotency ────────────────────────────────────────────────────────────
#
# Existing files at the target paths are overwritten without prompting.
# Re-running on the same TARGET refreshes the templates with the latest
# variables; no destructive merge with hand-edited content.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TPL_DIR="${SCRIPT_DIR}/release-infra-template"

if [[ ! -d "$TPL_DIR" ]]; then
  echo "Templates not found at $TPL_DIR" >&2
  exit 1
fi

prompt() {
  local var_name="$1" default="${2:-}" label="$3"
  local current="${!var_name:-}"
  if [[ -n "$current" ]]; then
    echo "  $label: $current"
    return
  fi
  if [[ -n "$default" ]]; then
    read -rp "  $label [$default]: " value
    value="${value:-$default}"
  else
    read -rp "  $label: " value
  fi
  printf -v "$var_name" '%s' "$value"
  export "$var_name"
}

# ── Collect variables ──────────────────────────────────────────────────────

TARGET_DIR="${TARGET_DIR:-${1:-}}"
if [[ -z "$TARGET_DIR" ]]; then
  read -rp "  Target project directory (absolute path): " TARGET_DIR
fi
if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Target directory does not exist: $TARGET_DIR" >&2
  exit 1
fi
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo ""
echo "==> Configure release infra for: $TARGET_DIR"
echo ""

prompt PROJECT        "$(basename "$TARGET_DIR")"     "Project name (long form, eg. nebula-dominion)"
prompt SHORT          "$(echo "$PROJECT" | tr -d '-' | tr -d '_')" "Short project key (lowercase, no dashes — used in upstream / filenames)"
prompt NAMESPACE      "${SHORT}-prod"                 "OpenShift namespace"
prompt CLUSTER_DOMAIN "apps.ocp-sno.caliptic.com"     "Cluster wildcard domain (apps.<cluster>.<base>)"
prompt HOST_WEB       "${SHORT}.caliptic.com"         "Public hostname for web"
prompt HOST_API       "api-${SHORT}.caliptic.com"     "Public hostname for api"

# WebSocket vhost is optional.  Set HOST_WS empty (literal empty input) to
# skip the third server block, the WS upstream, and the WS smoke probe.
echo ""
echo "  ↪ Leave HOST_WS empty to skip the WebSocket vhost entirely."
prompt HOST_WS        ""                              "Public hostname for WebSocket service (or blank to skip)"
if [[ -n "$HOST_WS" ]]; then
  prompt WS_SERVICE   "game-server"                   "Internal OpenShift service name for WS upstream (eg. game-server)"
else
  WS_SERVICE=""
fi

echo ""
echo "==> Plan"
echo "    TARGET_DIR    = $TARGET_DIR"
echo "    PROJECT       = $PROJECT"
echo "    SHORT         = $SHORT"
echo "    NAMESPACE     = $NAMESPACE"
echo "    CLUSTER       = $CLUSTER_DOMAIN"
echo "    HOST_WEB      = $HOST_WEB"
echo "    HOST_API      = $HOST_API"
if [[ -n "$HOST_WS" ]]; then
  echo "    HOST_WS       = $HOST_WS  (svc: $WS_SERVICE)"
else
  echo "    HOST_WS       = (skipped — no WebSocket vhost)"
fi
echo ""

if [[ "${YES:-}" != "1" ]]; then
  read -rp "Proceed? [y/N]: " confirm
  [[ "$confirm" =~ ^[yY] ]] || { echo "Aborted."; exit 0; }
fi

# ── Substitute placeholders ────────────────────────────────────────────────

# Returns stdin with __PLACEHOLDER__ tokens replaced.  Uses sed-friendly
# escaping so dots / slashes in hostnames don't break the substitution.
sub() {
  sed \
    -e "s|__PROJECT__|${PROJECT}|g" \
    -e "s|__SHORT__|${SHORT}|g" \
    -e "s|__NAMESPACE__|${NAMESPACE}|g" \
    -e "s|__CLUSTER_DOMAIN__|${CLUSTER_DOMAIN}|g" \
    -e "s|__HOST_WEB__|${HOST_WEB}|g" \
    -e "s|__HOST_API__|${HOST_API}|g" \
    -e "s|__HOST_WS__|${HOST_WS}|g" \
    -e "s|__WS_SERVICE__|${WS_SERVICE}|g"
}

# Strips a __WS_*_BEGIN__ … __WS_*_END__ block from stdin when HOST_WS is
# empty.  When HOST_WS is set we keep the block contents and just remove
# the marker lines.
strip_ws_block() {
  if [[ -z "$HOST_WS" ]]; then
    # Delete everything from any __WS_*_BEGIN__ to its matching __END__.
    sed '/__WS_[A-Z]*_BEGIN__/,/__WS_[A-Z]*_END__/d'
  else
    # Keep the contents but drop the marker lines themselves.
    sed -e '/__WS_[A-Z]*_BEGIN__/d' -e '/__WS_[A-Z]*_END__/d'
  fi
}

# For the workflow smoke test, the loop reads `for host in A B __HOST_WS_LINE__;`
# — substitute the literal placeholder with HOST_WS or strip it out.
ws_line_filter() {
  if [[ -z "$HOST_WS" ]]; then
    sed 's| __HOST_WS_LINE__||g'
  else
    sed "s|__HOST_WS_LINE__|${HOST_WS}|g"
  fi
}

mkdir -p "$TARGET_DIR/deploy/nginx" "$TARGET_DIR/.github/workflows"

echo ""
echo "==> Writing files"

# nginx vhost
out_conf="$TARGET_DIR/deploy/nginx/${SHORT}.conf"
< "$TPL_DIR/nginx/__SHORT__.conf.tpl" sub | strip_ws_block > "$out_conf"
echo "    + $out_conf"

# WS map (always emit — installer skips if it would duplicate)
out_maps="$TARGET_DIR/deploy/nginx/00-${SHORT}-maps.conf"
< "$TPL_DIR/nginx/00-__SHORT__-maps.conf" sub > "$out_maps"
echo "    + $out_maps"

# installer
out_install="$TARGET_DIR/deploy/nginx/install.sh"
< "$TPL_DIR/nginx/install.sh" sub | strip_ws_block > "$out_install"
chmod +x "$out_install"
echo "    + $out_install (chmod +x)"

# workflow
out_wf="$TARGET_DIR/.github/workflows/nginx-bastion.yml"
< "$TPL_DIR/workflows/nginx-bastion.yml" sub | ws_line_filter > "$out_wf"
echo "    + $out_wf"

# README footer with the install / sudoers cheatsheet
cat > "$TARGET_DIR/deploy/nginx/README.md" <<EOF
# ${PROJECT} — bastion nginx config

Drop-in nginx reverse proxy config for the bastion VM.  Owned files live
under \`/etc/nginx/conf.d/${SHORT}.conf\` (+ optional WS map); the shared
\`nginx.conf\` stays untouched.

## Install

\`\`\`bash
git -C ~/${PROJECT} pull
sudo bash ~/${PROJECT}/deploy/nginx/install.sh
\`\`\`

## Self-hosted runner sudoers

Drop the following into \`/etc/sudoers.d/${SHORT}-nginx-deploy\`
(adjust the runner user and repo path):

\`\`\`
gh-runner ALL=(root) NOPASSWD: /usr/bin/bash /home/gh-runner/_work/${PROJECT}/${PROJECT}/deploy/nginx/install.sh
gh-runner ALL=(root) NOPASSWD: /usr/sbin/nginx -t
gh-runner ALL=(root) NOPASSWD: /bin/systemctl reload nginx
\`\`\`

## Smoke test

\`\`\`bash
curl -sI -H 'Host: ${HOST_WEB}' http://localhost/ | head -1
curl -sI -H 'Host: ${HOST_API}' http://localhost/ | head -1
EOF

if [[ -n "$HOST_WS" ]]; then
  echo "curl -sI -H 'Host: ${HOST_WS}' http://localhost/ | head -1" >> "$TARGET_DIR/deploy/nginx/README.md"
fi

cat >> "$TARGET_DIR/deploy/nginx/README.md" <<EOF
\`\`\`

Each should return \`HTTP/1.1 200\` (or a redirect from the upstream).
EOF
echo "    + $TARGET_DIR/deploy/nginx/README.md"

echo ""
echo "Done.  Next steps:"
echo ""
echo "  1. cd $TARGET_DIR"
echo "  2. git add deploy/nginx .github/workflows/nginx-bastion.yml"
echo "  3. git commit -m 'ci: bastion nginx config + deploy workflow'"
echo "  4. git push origin main"
echo ""
echo "  Then on the bastion (one-time):"
echo "    - drop the sudoers snippet from deploy/nginx/README.md into"
echo "      /etc/sudoers.d/${SHORT}-nginx-deploy"
echo "    - either trigger the workflow via GitHub UI 'Run workflow', or"
echo "      run sudo bash deploy/nginx/install.sh manually after pulling."
