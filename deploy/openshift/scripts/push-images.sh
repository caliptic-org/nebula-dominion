#!/usr/bin/env bash
# Build + push the 3 Nebula images to the OpenShift internal registry.
#
# Flow:
#   1. `oc registry login` (uses your current oc session token)
#   2. Build each image locally using the existing Dockerfiles
#   3. Tag for the external registry route
#   4. Push
#
# Why the external route (default-route-openshift-image-registry...)
# instead of the in-cluster DNS? Because we're pushing FROM the dev machine,
# which isn't on the cluster network. The route is the only externally
# reachable endpoint. Pods still pull via the internal DNS (no auth needed
# inside the cluster).

set -euo pipefail

# Resolve repo root (script is at deploy/openshift/scripts/, we want repo root)
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "${REPO_ROOT}"

NAMESPACE="${NAMESPACE:-nebula-prod}"
TAG="${TAG:-latest}"

# Discover the external image registry route. Requires the registry to be
# exposed — done once via `oc patch configs.imageregistry.operator.openshift.io/cluster --patch '{"spec":{"defaultRoute":true}}' --type=merge`.
REGISTRY="$(oc -n openshift-image-registry get route default-route -o jsonpath='{.spec.host}' 2>/dev/null || true)"

if [[ -z "${REGISTRY}" ]]; then
  echo "ERROR: OpenShift image registry route is not exposed." >&2
  echo "Run once as cluster-admin:" >&2
  echo "  oc patch configs.imageregistry.operator.openshift.io/cluster \\" >&2
  echo "    --patch '{\"spec\":{\"defaultRoute\":true}}' --type=merge" >&2
  exit 1
fi

echo "[push] registry: ${REGISTRY}"
echo "[push] namespace: ${NAMESPACE}"
echo "[push] tag: ${TAG}"

# Authenticate podman/docker against the registry using the oc token.
TOKEN="$(oc whoami -t)"
USER="$(oc whoami)"

if command -v podman >/dev/null 2>&1; then
  CLI="podman"
  # Podman looks for registry CA certs under /etc/docker/certs.d/, which
  # is root-only on the bastion. The internal OCP registry serves a
  # self-signed cert that's not in the system trust store anyway — push
  # to a cluster you already control doesn't need CA verification.
  TLS_FLAGS="--tls-verify=false"
elif command -v docker >/dev/null 2>&1; then
  CLI="docker"
  # Docker has no per-command insecure flag — relies on /etc/docker/daemon.json
  # `insecure-registries` array. Document this in README for Docker Desktop users.
  TLS_FLAGS=""
else
  echo "ERROR: neither podman nor docker found on PATH" >&2
  exit 1
fi

echo "${TOKEN}" | "${CLI}" login ${TLS_FLAGS} -u "${USER}" --password-stdin "${REGISTRY}"

# Build each app. Uses the existing Dockerfiles which already handle
# multi-stage builds and pnpm-based monorepo install. BuildKit cache mounts
# we added earlier make the second push much faster (~30s vs ~5min).
build_and_push() {
  local app="$1"        # web | api | game-server
  local dockerfile="$2" # apps/<app>/Dockerfile
  local image="${REGISTRY}/${NAMESPACE}/nebula-${app}:${TAG}"

  echo ""
  echo "[push] ── ${app} ─────────────────────────────────────────"
  echo "[push] building ${image}"

  # NEXT_PUBLIC_* envs must be baked in at build time for the web image
  # (Next.js inlines them into the client bundle).
  local build_args=()
  if [[ "${app}" == "web" ]]; then
    [[ -n "${NEXT_PUBLIC_GA_ID:-}" ]] && build_args+=(--build-arg "NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}")
    [[ -n "${NEXT_PUBLIC_FB_PIXEL_ID:-}" ]] && build_args+=(--build-arg "NEXT_PUBLIC_FB_PIXEL_ID=${NEXT_PUBLIC_FB_PIXEL_ID}")
    [[ -n "${NEXT_PUBLIC_SENTRY_DSN:-}" ]] && build_args+=(--build-arg "NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}")
    [[ -n "${NEXT_PUBLIC_SENTRY_ENV:-}" ]] && build_args+=(--build-arg "NEXT_PUBLIC_SENTRY_ENV=${NEXT_PUBLIC_SENTRY_ENV:-production}")
  fi

  "${CLI}" build -f "${dockerfile}" "${build_args[@]}" -t "${image}" .

  echo "[push] pushing ${image}"
  "${CLI}" push ${TLS_FLAGS} "${image}"

  echo "[push] ${app} done"
}

build_and_push "web"         "apps/web/Dockerfile"
build_and_push "api"         "apps/api/Dockerfile"
build_and_push "game-server" "apps/game-server/Dockerfile"

echo ""
echo "[push] ALL DONE. Pods will pull these on next rollout:"
echo "  oc -n ${NAMESPACE} rollout restart deploy/nebula-web deploy/nebula-api deploy/nebula-game-server"
