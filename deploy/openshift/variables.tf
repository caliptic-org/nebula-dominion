# Nebula Dominion — deploy variables.
#
# All defaults assume the reference SNO cluster at ocp-sno.caliptic.com with
# postgres VM at 10.10.10.20. Override via terraform.tfvars (see *.example).

variable "kubeconfig_path" {
  type        = string
  description = "Path to kubeconfig with cluster-admin or namespace-edit perms."
  default     = "~/.kube/config"
}

variable "namespace" {
  type        = string
  description = "OpenShift project (namespace) for all Nebula resources."
  default     = "nebula-prod"
}

variable "image_registry" {
  type        = string
  description = <<-EOT
    Internal OpenShift registry hostname seen from cluster pods.
    Pods pull via image-registry.openshift-image-registry.svc:5000 because
    the cluster routes that DNS to the registry without auth.
    External push from dev machine uses `oc registry login` + the route
    `default-route-openshift-image-registry.apps.<cluster>.<domain>`.
  EOT
  default     = "image-registry.openshift-image-registry.svc:5000"
}

variable "image_tag" {
  type        = string
  description = "Tag for all three app images (web/api/game-server). Set to git short sha in CI."
  default     = "latest"
}

# ── Hostnames ────────────────────────────────────────────────────────────────
# The web app is exposed at the clean root subdomain. api + game-server use
# either the same clean tree (api.nebula.caliptic.com) or the cluster wildcard
# fallback (nebula-api.apps.ocp-sno.caliptic.com) — see README for the
# Cloudflare tunnel setup needed for the clean subdomains.

variable "host_web" {
  type        = string
  default     = "nebula.caliptic.com"
  description = "External hostname for the Next.js web app (player-facing). Used in NEXT_PUBLIC_* configmap entries — what the BROWSER hits."
}

variable "host_api" {
  type        = string
  default     = "api-nebula.caliptic.com"
  description = "External hostname for the api service (REST + JWT). Flat single-level subdomain of caliptic.com."
}

variable "host_game" {
  type        = string
  default     = "game-nebula.caliptic.com"
  description = "External hostname for the game-server (socket.io + REST)."
}

variable "cluster_apps_domain" {
  type        = string
  default     = "apps.ocp-sno.caliptic.com"
  description = "OpenShift cluster's wildcard apps domain. Routes use the internal hostname pattern <svc>-<ns>.<cluster_apps_domain> so HAProxy serves them with the *.apps.<cluster> wildcard cert. nginx on the bastion proxies external hostnames (host_web/api/game) → these internal route hostnames, mirroring Caliptic's pattern."
}

locals {
  # Internal Route hostnames — match the cluster wildcard cert so HAProxy
  # can serve TLS without errors. nginx on bastion proxies external→internal.
  internal_host_web  = "nebula-web-${var.namespace}.${var.cluster_apps_domain}"
  internal_host_api  = "nebula-api-${var.namespace}.${var.cluster_apps_domain}"
  internal_host_game = "nebula-game-server-${var.namespace}.${var.cluster_apps_domain}"
}

# ── Database (re-used Postgres VM) ───────────────────────────────────────────

variable "postgres_host" {
  type        = string
  description = "Postgres VM IP reachable from the SNO node network."
  default     = "10.10.10.20"
}

variable "postgres_port" {
  type    = number
  default = 5432
}

variable "postgres_db" {
  type        = string
  description = "Database name to create on the shared postgres VM."
  default     = "nebula_dominion"
}

variable "postgres_user" {
  type        = string
  description = "Application DB user. Created by scripts/bootstrap-db.sh."
  default     = "nebula"
}

variable "postgres_password" {
  type        = string
  sensitive   = true
  description = "Application DB password. KEEP OUT OF GIT — set in terraform.tfvars."
}

# ── Auth secrets ─────────────────────────────────────────────────────────────

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "Shared JWT signing secret (api + game-server both verify against this)."
}

variable "jwt_refresh_secret" {
  type        = string
  sensitive   = true
  description = "Refresh-token signing secret (api only)."
}

# ── Analytics + monitoring (Faz 1 carry-over) ────────────────────────────────
# All optional — empty values disable the corresponding integration silently
# (matches the patterns in apps/web/.env.example).

variable "next_public_ga_id" {
  type    = string
  default = ""
}

variable "next_public_fb_pixel_id" {
  type    = string
  default = ""
}

variable "next_public_sentry_dsn" {
  type    = string
  default = ""
}

variable "server_sentry_dsn" {
  type      = string
  sensitive = true
  default   = ""
}

# ── MinIO ────────────────────────────────────────────────────────────────────

variable "minio_root_user" {
  type    = string
  default = "minioadmin"
}

variable "minio_root_password" {
  type      = string
  sensitive = true
}

# ── Replica counts ───────────────────────────────────────────────────────────
# Single-node cluster can't usefully spread replicas across hosts. Default 1.
# Bump to 2 only if you set up anti-affinity rules + the node has headroom.

variable "replicas_web" {
  type    = number
  default = 1
}

variable "replicas_api" {
  type    = number
  default = 1
}

variable "replicas_game" {
  type    = number
  default = 1
}
