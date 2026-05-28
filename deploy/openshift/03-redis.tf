# Redis — used by game-server's socket.io adapter (multi-pod pub/sub) and
# by api for rate limiting / session cache. Single replica is fine on a SNO
# cluster; data loss on pod restart is acceptable since we don't persist
# game state in Redis (Postgres is source of truth).

# PVC commented out — the SNO recovery showed the cluster has no
# default StorageClass and no PVs, so PVC bind fails and the
# StatefulSet pod never schedules. Until LVMS/local-storage is
# provisioned, redis runs on emptyDir (volatile but tolerable: Postgres
# is source of truth, redis is only socket.io pub/sub + rate-limit
# cache and rebuilds fine on restart).
#
# resource "kubernetes_persistent_volume_claim" "redis" {
#   metadata {
#     name      = "nebula-redis-data"
#     namespace = kubernetes_namespace.nebula.metadata[0].name
#   }
#   spec {
#     access_modes = ["ReadWriteOnce"]
#     resources {
#       requests = {
#         storage = "2Gi"
#       }
#     }
#   }
#   wait_until_bound = false
# }

resource "kubernetes_stateful_set" "redis" {
  metadata {
    name      = "nebula-redis"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels = {
      "app"                       = "nebula-redis"
      "app.kubernetes.io/name"    = "redis"
      "app.kubernetes.io/part-of" = "nebula-dominion"
    }
  }
  # Don't block on rollout — local-path-provisioner WaitForFirstConsumer
  # makes the first Pod take ~30-60s to schedule (PV must be created on
  # the chosen node). Terraform's default 10min wait is fine in theory
  # but if anything fails (SCC blocks pod, registry pull slow), the whole
  # apply errors out. Better to return immediately and inspect via oc.
  wait_for_rollout = false
  spec {
    service_name = "nebula-redis"
    replicas     = 1
    selector {
      match_labels = { app = "nebula-redis" }
    }
    template {
      metadata { labels = { app = "nebula-redis" } }
      spec {
        # No security_context — let OpenShift restricted-v2 SCC inject the
        # namespace-allowed UID/fsGroup range automatically. Hard-coding
        # fs_group=1000 caused the pod to be rejected because 1000 is not
        # inside the nebula-prod range. The redis image runs fine under
        # arbitrary UIDs.
        container {
          name  = "redis"
          image = "redis:7-alpine"
          args  = ["redis-server", "--appendonly", "yes", "--save", "60", "1000"]
          port {
            container_port = 6379
            name           = "redis"
          }
          volume_mount {
            name       = "data"
            mount_path = "/data"
          }
          resources {
            requests = { cpu = "50m", memory = "128Mi" }
            limits   = { cpu = "500m", memory = "512Mi" }
          }
          liveness_probe {
            tcp_socket { port = 6379 }
            initial_delay_seconds = 15
            period_seconds        = 20
          }
          readiness_probe {
            exec { command = ["redis-cli", "ping"] }
            initial_delay_seconds = 5
            period_seconds        = 10
          }
        }
        volume {
          name = "data"
          # emptyDir until LVMS/local-storage provisioner lands — see
          # comment above. Pod restart loses data; that's OK for socket.io
          # pub/sub + rate-limit cache use case.
          empty_dir {
            size_limit = "2Gi"
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "redis" {
  metadata {
    name      = "nebula-redis"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  spec {
    selector = { app = "nebula-redis" }
    port {
      port        = 6379
      target_port = 6379
      name        = "redis"
    }
    # Headless StatefulSet companion (cluster IP "None" makes pod DNS work).
    cluster_ip = "None"
  }
}
