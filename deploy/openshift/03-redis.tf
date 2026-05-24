# Redis — used by game-server's socket.io adapter (multi-pod pub/sub) and
# by api for rate limiting / session cache. Single replica is fine on a SNO
# cluster; data loss on pod restart is acceptable since we don't persist
# game state in Redis (Postgres is source of truth).

resource "kubernetes_persistent_volume_claim" "redis" {
  metadata {
    name      = "nebula-redis-data"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "2Gi"
      }
    }
    # storage_class_name = null — let OpenShift pick the cluster default
    # (local-path on SNO with rancher provisioner, ocs-storagecluster-ceph-rbd
    # on OCS, lvms-vg1 on LVMS).
  }
  # local-path-provisioner uses WaitForFirstConsumer binding mode — the PVC
  # only Bounds once a consumer Pod (this StatefulSet) tries to mount it.
  # Without this flag terraform blocks for 5min waiting for Bound status
  # that can't happen pre-Pod. Skip the wait; the StatefulSet below will
  # create the Pod which kicks off PV provisioning.
  wait_until_bound = false
}

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
        # OpenShift runs containers under arbitrary UIDs in the namespace's
        # SCC range — Redis's official image works because it uses /data
        # as a relative volume that we own via PVC group permissions.
        security_context {
          fs_group = 1000
        }
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
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.redis.metadata[0].name
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
