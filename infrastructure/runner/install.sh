#!/usr/bin/env bash
# =============================================================================
# install.sh — GitHub Actions self-hosted runner on LXC 204
#
# Idempotent re-install için. İlk kurulumdaki adımları otomatik koşturur:
#   1. nebula-runner user (docker grubuna üye)
#   2. /opt/nebula-dominion/.env'i group-readable yap (mode 640, grup nebula-runner)
#   3. Runner tarball indir + extract
#   4. config.sh ile GitHub'a kaydet (REGISTRATION_TOKEN gerekir)
#   5. svc.sh install + start → systemd servisi
#
# Kullanım (LXC 204 içinde, root olarak):
#
#   curl -sL https://raw.githubusercontent.com/caliptic-org/nebula-dominion/main/infrastructure/runner/install.sh | \
#     REGISTRATION_TOKEN=AXXXXX... bash
#
# Veya local checkout'tan:
#
#   ssh root@192.168.1.231 'REGISTRATION_TOKEN=AXXXXX bash -s' < infrastructure/runner/install.sh
#
# REGISTRATION_TOKEN'ı GitHub UI'dan al:
#   Settings → Actions → Runners → New self-hosted runner
#   (Linux x64 ekranındaki --token değeri, 1 saatte expire)
# =============================================================================
set -euo pipefail

RUNNER_VERSION="${RUNNER_VERSION:-2.319.1}"
RUNNER_USER="${RUNNER_USER:-nebula-runner}"
RUNNER_HOME="/home/${RUNNER_USER}"
RUNNER_DIR="${RUNNER_HOME}/actions-runner"
REPO_URL="${REPO_URL:-https://github.com/caliptic-org/nebula-dominion}"
RUNNER_NAME="${RUNNER_NAME:-nebula-prod-runner}"
RUNNER_LABELS="${RUNNER_LABELS:-self-hosted,nebula-prod,linux,x64}"
ENV_FILE="${ENV_FILE:-/opt/nebula-dominion/.env}"

log() { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m⚠\033[0m %s\n' "$*" >&2; }
err() { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; exit 1; }

# --- Pre-flight ---
[ "$(id -u)" -eq 0 ] || err "Bu script root olarak koşmalı (sudo bash install.sh)"
command -v docker >/dev/null || err "docker yüklü değil — LXC 204'te Docker engine olmalı"

# --- 1. Runner user ---
if id "$RUNNER_USER" >/dev/null 2>&1; then
  log "User ${RUNNER_USER} zaten var, docker grubuna ekliyorum (idempotent)"
  usermod -aG docker "$RUNNER_USER"
else
  log "User ${RUNNER_USER} oluşturuluyor (-G docker)"
  useradd -m -s /bin/bash -G docker "$RUNNER_USER"
fi

# --- 2. .env group-read access ---
if [ -f "$ENV_FILE" ]; then
  log "${ENV_FILE} grup okuma izni ayarlanıyor (chgrp ${RUNNER_USER}, chmod 640)"
  chgrp "$RUNNER_USER" "$ENV_FILE"
  chmod 640 "$ENV_FILE"
else
  warn "${ENV_FILE} yok — runner deploy'da fail eder. Önce /opt/nebula-dominion'ı kur."
fi

# --- 3. Download + extract runner ---
sudo -u "$RUNNER_USER" mkdir -p "$RUNNER_DIR"

if [ ! -f "${RUNNER_DIR}/config.sh" ]; then
  log "Runner v${RUNNER_VERSION} indiriliyor"
  TARBALL="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  sudo -u "$RUNNER_USER" curl -sL -o "${RUNNER_DIR}/${TARBALL}" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TARBALL}"

  log "Extracting..."
  sudo -u "$RUNNER_USER" tar xzf "${RUNNER_DIR}/${TARBALL}" -C "$RUNNER_DIR"
  rm -f "${RUNNER_DIR}/${TARBALL}"

  log "libicu vs. dependency'leri kontrol"
  "${RUNNER_DIR}/bin/installdependencies.sh" 2>&1 | tail -3
else
  log "Runner zaten extract edilmiş (${RUNNER_DIR}/config.sh var), tarball indirimi atlanıyor"
fi

# --- 4. Register with GitHub ---
SERVICE_NAME="actions.runner.caliptic-org-nebula-dominion.${RUNNER_NAME}.service"

if systemctl list-unit-files | grep -q "$SERVICE_NAME"; then
  log "Service ${SERVICE_NAME} zaten kurulu, register atlanıyor"
  log "Yeniden register etmek istersen önce: ./svc.sh stop && ./svc.sh uninstall && ./config.sh remove"
else
  [ -n "${REGISTRATION_TOKEN:-}" ] || err "REGISTRATION_TOKEN env vermedin — config.sh fail eder. GH UI'dan token al."

  log "GitHub'a kayıt ediliyor (repo: ${REPO_URL}, labels: ${RUNNER_LABELS})"
  sudo -u "$RUNNER_USER" "${RUNNER_DIR}/config.sh" \
    --url "$REPO_URL" \
    --token "$REGISTRATION_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --work _work \
    --runasservice \
    --unattended \
    --replace

  # --- 5. Install + start systemd service ---
  log "systemd servisi kuruluyor + başlatılıyor"
  ( cd "$RUNNER_DIR" && ./svc.sh install "$RUNNER_USER" && ./svc.sh start )
fi

sleep 2
log "Servis durumu:"
systemctl status "$SERVICE_NAME" --no-pager --lines=5 || warn "Service status returned non-zero (henüz online değil olabilir)"

log "Bitti. GitHub UI'da Settings → Actions → Runners'da \"${RUNNER_NAME}\" yeşil görünmeli."
