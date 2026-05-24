# Next.js web — player-facing UI.
#
# Health probe: Next.js standalone build serves "/" out of the box. We use
# that as the probe; if the server's up and bundle is loaded, "/" returns
# 200 within a few ms.

locals {
  web_image = "${var.image_registry}/${var.namespace}/nebula-web:${var.image_tag}"
}

resource "kubernetes_deployment" "web" {
  metadata {
    name      = "nebula-web"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-web" }
  }
  # See 05-api.tf for rationale — first deploy has no image yet.
  wait_for_rollout = false
  spec {
    replicas = var.replicas_web
    selector {
      match_labels = { app = "nebula-web" }
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
        labels = { app = "nebula-web" }
        annotations = {
          "nebula.io/config-hash" = sha1(jsonencode({
            shared = kubernetes_config_map.shared.data
            sentry = kubernetes_secret.sentry.metadata[0].resource_version
          }))
        }
      }
      spec {
        container {
          name              = "web"
          image             = local.web_image
          image_pull_policy = "Always"
          port {
            container_port = 3000
            name           = "http"
          }

          env_from {
            config_map_ref { name = kubernetes_config_map.shared.metadata[0].name }
          }
          # Sentry DSN comes via secret even though it's a "public" key —
          # rotating it shouldn't require a configmap rollout for unrelated
          # consumers.
          env_from {
            secret_ref { name = kubernetes_secret.sentry.metadata[0].name }
          }

          env {
            name  = "PORT"
            value = "3000"
          }
          env {
            name  = "HOSTNAME"
            value = "0.0.0.0"
          }

          resources {
            requests = { cpu = "100m", memory = "256Mi" }
            limits   = { cpu = "1",    memory = "1Gi" }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 3000
            }
            initial_delay_seconds = 30
            period_seconds        = 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }
          readiness_probe {
            http_get {
              path = "/"
              port = 3000
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "web" {
  metadata {
    name      = "nebula-web"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-web" }
  }
  spec {
    selector = { app = "nebula-web" }
    port {
      port        = 3000
      target_port = 3000
      name        = "http"
    }
  }
}
