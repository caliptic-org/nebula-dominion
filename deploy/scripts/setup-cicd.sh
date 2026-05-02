#!/usr/bin/env bash
# setup-cicd.sh — Bootstrap Gitea + Drone CI + internal Docker registry
# Usage: ./setup-cicd.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Prerequisites ──────────────────────────────────────────────────────────────
for bin in docker docker-compose openssl curl; do
  command -v "$bin" &>/dev/null || error "$bin is required but not installed"
done

# ── Environment file ───────────────────────────────────────────────────────────
ENV_FILE="$DEPLOY_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  info "Generating .env from .env.example ..."
  cp "$DEPLOY_DIR/.env.example" "$ENV_FILE"

  # Auto-generate secrets
  sed -i "s|change-me-gitea-db|$(openssl rand -hex 16)|g"      "$ENV_FILE"
  sed -i "s|change-me-drone-rpc-secret|$(openssl rand -hex 16)|g" "$ENV_FILE"
  sed -i "s|change-me-drone-db|$(openssl rand -hex 16)|g"      "$ENV_FILE"

  warn ".env created — fill in DRONE_GITEA_CLIENT_ID and DRONE_GITEA_CLIENT_SECRET after Gitea setup"
fi
source "$ENV_FILE"

# ── Configure insecure registry on Docker daemon ───────────────────────────────
DAEMON_JSON="/etc/docker/daemon.json"
if ! grep -q "registry.local:5000" "$DAEMON_JSON" 2>/dev/null; then
  info "Adding registry.local:5000 to insecure-registries ..."
  if [[ -f "$DAEMON_JSON" ]]; then
    python3 - <<EOF
import json, sys
with open("$DAEMON_JSON") as f:
    d = json.load(f)
d.setdefault("insecure-registries", [])
if "registry.local:5000" not in d["insecure-registries"]:
    d["insecure-registries"].append("registry.local:5000")
with open("$DAEMON_JSON", "w") as f:
    json.dump(d, f, indent=2)
EOF
  else
    echo '{"insecure-registries": ["registry.local:5000"]}' > "$DAEMON_JSON"
  fi
  systemctl reload docker || true
fi

# Add registry.local to /etc/hosts if missing
if ! grep -q "registry.local" /etc/hosts; then
  echo "127.0.0.1  registry.local gitea.local drone.local" >> /etc/hosts
  info "Added registry.local / gitea.local / drone.local to /etc/hosts"
fi

# ── Start services ─────────────────────────────────────────────────────────────
info "Starting Gitea + Drone CI + Registry ..."
cd "$DEPLOY_DIR"
docker-compose -f docker-compose.gitea-drone.yml --env-file .env up -d

# Wait for Gitea
info "Waiting for Gitea to be healthy ..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/healthz &>/dev/null; then
    info "Gitea is up."
    break
  fi
  sleep 5
  [[ $i -eq 30 ]] && error "Gitea did not become healthy in time"
done

# Wait for Drone
info "Waiting for Drone CI to be healthy ..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/healthz &>/dev/null; then
    info "Drone CI is up."
    break
  fi
  sleep 5
  [[ $i -eq 30 ]] && error "Drone CI did not become healthy in time"
done

info "Registry UI is at http://localhost:8081"

# ── Post-setup instructions ────────────────────────────────────────────────────
cat <<'INSTRUCTIONS'

═══════════════════════════════════════════════════════════════════
  Gitea + Drone CI Setup — Next Steps
═══════════════════════════════════════════════════════════════════

1. GITEA FIRST-TIME SETUP
   Open http://gitea.local:3000 in your browser.
   Complete the install wizard (DB values are already in .env).
   Create an admin account (e.g. nebula-admin).

2. CREATE OAUTH2 APP IN GITEA (for Drone CI)
   Gitea → Profile → Settings → Applications → OAuth2 Applications
   - Application name: Drone CI
   - Redirect URI:     http://drone.local:8080/login
   Copy the Client ID and Secret into .env:
     DRONE_GITEA_CLIENT_ID=...
     DRONE_GITEA_CLIENT_SECRET=...

3. RESTART DRONE WITH OAUTH CREDENTIALS
   docker-compose -f docker-compose.gitea-drone.yml --env-file .env up -d drone

4. ACTIVATE REPO IN DRONE CI
   Open http://drone.local:8080 → sync repos → activate nebula-dominion

5. ADD DRONE SECRETS
   docker run --rm drone/cli:1 secret add \
     --server http://drone.local:8080 \
     --token  <your-drone-token> \
     --repository <gitea-org>/nebula-dominion \
     --name ssh_key --data @~/.ssh/deploy_key

   Repeat for: staging_host, prod_host, slack_webhook

6. PUSH CODE TO GITEA
   git remote add gitea http://gitea.local:3000/<org>/nebula-dominion.git
   git push gitea main

7. BRANCH STRATEGY
   main     → Production deploys
   develop  → Staging deploys
   feature/ → CI only (no deploy)
   hotfix/  → CI only (merge to main)
   release/ → CI only (merge to main)

═══════════════════════════════════════════════════════════════════
INSTRUCTIONS
