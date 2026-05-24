# NestJS game-server — socket.io rooms + matchmaking + battle tick loop.
#
# Same shape as api but with socket.io endpoint (port 3001) and a different
# health probe path (/api/health/live since this service mounts the
# Terminus health module under that prefix in main.ts).

locals {
  game_image = "${var.image_registry}/${var.namespace}/nebula-game-server:${var.image_tag}"
}

resource "kubernetes_deployment" "game_server" {
  metadata {
    name      = "nebula-game-server"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-game-server" }
  }
  # See 05-api.tf for rationale — first deploy has no image yet.
  wait_for_rollout = false
  spec {
    replicas = var.replicas_game
    selector {
      match_labels = { app = "nebula-game-server" }
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
        labels = { app = "nebula-game-server" }
        annotations = {
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
          name              = "game-server"
          image             = local.game_image
          image_pull_policy = "Always"
          port {
            container_port = 3001
            name           = "http-ws"
          }

          env_from {
            config_map_ref { name = kubernetes_config_map.shared.metadata[0].name }
          }
          env_from {
            secret_ref { name = kubernetes_secret.postgres.metadata[0].name }
          }
          env_from {
            secret_ref { name = kubernetes_secret.jwt.metadata[0].name }
          }
          env_from {
            secret_ref { name = kubernetes_secret.sentry.metadata[0].name }
          }

          env {
            name  = "PORT"
            value = "3001"
          }

          resources {
            requests = { cpu = "100m", memory = "256Mi" }
            limits   = { cpu = "1",    memory = "1Gi" }
          }

          liveness_probe {
            http_get {
              path = "/api/health/live"
              port = 3001
            }
            initial_delay_seconds = 20
            period_seconds        = 30
            timeout_seconds       = 5
          }
          readiness_probe {
            http_get {
              path = "/api/health/live"
              port = 3001
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "game_server" {
  metadata {
    name      = "nebula-game-server"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-game-server" }
  }
  spec {
    selector = { app = "nebula-game-server" }
    port {
      port        = 3001
      target_port = 3001
      name        = "http-ws"
    }
    # IMPORTANT: socket.io needs sticky sessions when scaling >1 replica.
    # On OpenShift we'll handle that in the Route (haproxy.router.openshift.io/
    # balance: source) rather than at the Service level.
    session_affinity = "ClientIP"
  }
}
