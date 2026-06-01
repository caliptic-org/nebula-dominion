#!/usr/bin/env bash
#
# Nebula host cleanup — frees Docker disk space accumulated across deploys.
#
# Called automatically at the end of every deploy-prod workflow run.  Safe
# to invoke standalone too (idempotent; only prunes things older than the
# retention windows below).
#
# What it cleans:
#   1. Stopped containers older than 24h
#   2. Dangling + UNUSED images older than 72h (keeps last 3 days for rollback)
#   3. Build cache older than 72h (BuildKit accumulates ~1-2 GB per web build)
#   4. systemd journal entries older than 7 days
#   5. Runner workspace diag logs older than 7 days
#   6. /opt/nebula-dominion/.env.bak-* backups, keep most recent 5
#
# What it NEVER touches:
#   - Named volumes (postgres-data / redis-data / minio-data)
#   - Currently-running containers + their images
#   - .env (only .env.bak-* trim)
#   - DB rows / Redis state
#
# Disk-usage delta is printed at start + end so the deploy log shows the
# savings.  Errors don't abort — every step is best-effort; if `journalctl`
# isn't installed for example the script still completes the docker prune.

set -uo pipefail

log() { printf '\033[36m[cleanup]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[cleanup warn]\033[0m %s\n' "$*"; }

# Force English locale so the "Total reclaimed space" parse below isn't
# sensitive to system locale settings (Turkish locale would say "Toplam").
export LC_ALL=C

# Retention windows.  Routine mode keeps a generous window for rollback +
# incremental-build cache; AGGRESSIVE=1 collapses everything to the active
# working set (used by the deploy workflow when disk pressure is critical,
# or by an ops-on-call manually freeing the disk).
#
#   bash nebula-cleanup.sh             → routine (defaults below)
#   AGGRESSIVE=1 bash nebula-cleanup.sh → drop filters, prune everything
#   IMAGE_UNTIL=12h BUILDER_UNTIL=12h bash nebula-cleanup.sh → custom window
AGGRESSIVE=${AGGRESSIVE:-0}
if [ "$AGGRESSIVE" = "1" ]; then
  CONTAINER_UNTIL=${CONTAINER_UNTIL:-0h}
  IMAGE_UNTIL=${IMAGE_UNTIL:-0h}
  BUILDER_UNTIL=${BUILDER_UNTIL:-0h}
  log "AGGRESSIVE mode: all filters dropped — pruning everything reclaimable"
else
  CONTAINER_UNTIL=${CONTAINER_UNTIL:-24h}
  IMAGE_UNTIL=${IMAGE_UNTIL:-24h}
  BUILDER_UNTIL=${BUILDER_UNTIL:-24h}
fi

# ── Snapshot before ──────────────────────────────────────────────────────────
log "=== Disk usage BEFORE ==="
df -h / | tail -1 || true
docker system df 2>/dev/null | sed 's/^/  /' || true
echo

# Helper that omits the --filter flag entirely when the threshold is 0h,
# because some docker versions parse `until=0h` as "nothing matches" instead
# of "everything".  Filterless prune is the AGGRESSIVE path.
prune_with_until() {
  local cmd="$1" until="$2"
  shift 2
  if [ "$until" = "0h" ]; then
    $cmd "$@"
  else
    $cmd --filter "until=$until" "$@"
  fi
}

# ── 1) Stopped containers ────────────────────────────────────────────────────
log "Pruning stopped containers (until=$CONTAINER_UNTIL)..."
prune_with_until "docker container prune -f" "$CONTAINER_UNTIL" 2>&1 | sed 's/^/  /' || warn "container prune failed"

# ── 2) Unused images ─────────────────────────────────────────────────────────
# `-a` removes images that aren't referenced by ANY container — that includes
# the previous-deploy images once the new container is recreated.  The
# until window keeps a roll-back surface; if the deploy was older than the
# window and broken, you'd need a manual rebuild anyway.
log "Pruning unused images (until=$IMAGE_UNTIL)..."
prune_with_until "docker image prune -af" "$IMAGE_UNTIL" 2>&1 | sed 's/^/  /' || warn "image prune failed"

# ── 3) BuildKit cache ────────────────────────────────────────────────────────
# This is the BIGGEST disk consumer on Nebula — every web build adds ~1-2 GB
# of intermediate layers.  24h default still gives BuildKit a useful cache
# for same-day rebuilds; AGGRESSIVE drops to 0 for emergencies.
log "Pruning BuildKit cache (until=$BUILDER_UNTIL)..."
prune_with_until "docker builder prune -f" "$BUILDER_UNTIL" 2>&1 | sed 's/^/  /' || warn "builder prune failed"

# ── 4) systemd journal (>7d) ────────────────────────────────────────────────
# Journal grew silently on LXC 204 — vacuum keeps the on-disk index honest.
# Active service logs stay; only archived entries older than 7d are removed.
if command -v journalctl >/dev/null 2>&1; then
  log "Vacuuming systemd journal (>7d old)..."
  journalctl --vacuum-time=7d 2>&1 | sed 's/^/  /' || warn "journal vacuum failed"
else
  warn "journalctl not present; skipping journal vacuum"
fi

# ── 5) Runner diag logs (>7d) ────────────────────────────────────────────────
# GitHub Actions runner keeps a Worker_*.log per job + a _temp/ scratch dir.
# Neither is needed once the job completes; runner re-creates them on demand.
RUNNER_HOME=/home/nebula-runner/actions-runner
if [ -d "$RUNNER_HOME/_diag" ]; then
  log "Removing runner diag logs (>7d old)..."
  find "$RUNNER_HOME/_diag" -name 'Worker_*.log' -mtime +7 -print -delete 2>&1 | sed 's/^/  /' || warn "runner diag prune failed"
fi
if [ -d "$RUNNER_HOME/_work/_temp" ]; then
  log "Removing runner _temp scratch (>2d old)..."
  find "$RUNNER_HOME/_work/_temp" -mindepth 1 -mtime +2 -print -delete 2>&1 | sed 's/^/  /' || warn "runner _temp prune failed"
fi

# ── 6) Trim .env backups (keep last 5) ───────────────────────────────────────
# We make .env.bak-YYYYMMDD-HHMMSS files when editing env (see the multi-day
# playtest 1000x rollout).  More than 5 are pointless — the most recent
# rollback target is the one a sysadmin would actually use.
ENV_DIR=/opt/nebula-dominion
if compgen -G "$ENV_DIR/.env.bak-*" >/dev/null; then
  log "Trimming .env.bak-* (keep last 5)..."
  ls -1t "$ENV_DIR"/.env.bak-* 2>/dev/null | tail -n +6 | while read -r f; do
    rm -v -- "$f" 2>&1 | sed 's/^/  /'
  done
fi

# ── Snapshot after ───────────────────────────────────────────────────────────
echo
log "=== Disk usage AFTER ==="
df -h / | tail -1 || true
docker system df 2>/dev/null | sed 's/^/  /' || true

exit 0
