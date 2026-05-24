# NestJS API — auth + game state + Conversion Forward to GA4.
#
# Image is built locally (or via OCP BuildConfig) and pushed to the internal
# registry. Tag defaults to "latest" but CI should set it to git-short-sha
# so every deploy is reproducible.

locals {
  api_image = "${var.image_registry}/${var.namespace}/nebula-api:${var.image_tag}"
}

resource "kubernetes_deployment" "api" {
  metadata {
    name      = "nebula-api"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-api" }
  }
  # First-deploy reality: the image referenced below doesn't exist in the
  # registry until GitHub Actions runs `push-images.sh`. Without this flag,
  # `terraform apply` blocks for 10 minutes waiting for pods to go Ready,
  # then errors out — even though the Deployment object itself was created
  # successfully. Disabling the wait lets `apply` return immediately; pods
  # come up automatically once images arrive.
  wait_for_rollout = false
  spec {
    replicas = var.replicas_api
    selector {
      match_labels = { app = "nebula-api" }
    }
    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = "1"
        max_unavailable = "0"
      }
    }
    template {
      metadata {
        labels = { app = "nebula-api" }
        annotations = {
          # Force a rollout when secrets/configmaps change by hashing their
          # resource versions into the pod annotation. Without this, env
          # changes only land on the next manual restart.
          "nebula.io/config-hash" = sha1(jsonencode({
            shared   = kubernetes_config_map.shared.data
            postgres = kubernetes_secret.postgres.metadata[0].resource_version
            jwt      = kubernetes_secret.jwt.metadata[0].resource_version
            sentry   = kubernetes_secret.sentry.metadata[0].resource_version
          }))
        }
      }
      spec {
        container {
          name              = "api"
          image             = local.api_image
          image_pull_policy = "Always"
          port {
            container_port = 4000
            name           = "http"
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map.shared.metadata[0].name
            }
          }
          env_from {
            secret_ref {
              name = kubernetes_secret.postgres.metadata[0].name
            }
          }
          env_from {
            secret_ref {
              name = kubernetes_secret.jwt.metadata[0].name
            }
          }
          env_from {
            secret_ref {
              name = kubernetes_secret.sentry.metadata[0].name
            }
          }
          env_from {
            secret_ref {
              name = kubernetes_secret.minio.metadata[0].name
            }
          }

          env {
            name  = "PORT"
            value = "4000"
          }

          resources {
            requests = { cpu = "100m", memory = "256Mi" }
            limits   = { cpu = "1",    memory = "1Gi" }
          }

          # Nest's main.ts mounts swagger at /api/docs-json — using that as
          # the liveness gate confirms the entire dependency graph is up,
          # not just the HTTP socket.
          liveness_probe {
            http_get {
              path = "/api/docs-json"
              port = 4000
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }
          readiness_probe {
            http_get {
              path = "/api/docs-json"
              port = 4000
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "api" {
  metadata {
    name      = "nebula-api"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-api" }
  }
  spec {
    selector = { app = "nebula-api" }
    port {
      port        = 4000
      target_port = 4000
      name        = "http"
    }
  }
}
