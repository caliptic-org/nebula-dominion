# MinIO — S3-compatible object storage for user uploads (avatars, race
# artwork, future user-generated content). Single replica + PVC, exactly
# like docker-compose, except cluster-scoped.
#
# Browser-facing operations go through the api service (signed URLs), so we
# don't expose minio externally — only an internal ClusterIP Service.

resource "kubernetes_persistent_volume_claim" "minio" {
  metadata {
    name      = "nebula-minio-data"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "20Gi"
      }
    }
  }
  # See 03-redis.tf for rationale — WaitForFirstConsumer mode requires the
  # Pod to exist before Bind can happen, so terraform must not block on it.
  wait_until_bound = false
}

resource "kubernetes_stateful_set" "minio" {
  metadata {
    name      = "nebula-minio"
    namespace = kubernetes_namespace.nebula.metadata[0].name
    labels    = { app = "nebula-minio" }
  }
  # See 03-redis.tf for rationale.
  wait_for_rollout = false
  spec {
    service_name = "nebula-minio"
    replicas     = 1
    selector {
      match_labels = { app = "nebula-minio" }
    }
    template {
      metadata { labels = { app = "nebula-minio" } }
      spec {
        security_context {
          fs_group = 1000
        }
        container {
          name  = "minio"
          image = "minio/minio:latest"
          args  = ["server", "/data", "--console-address", ":9001"]
          port {
            container_port = 9000
            name           = "s3"
          }
          port {
            container_port = 9001
            name           = "console"
          }
          env {
            name = "MINIO_ROOT_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.minio.metadata[0].name
                key  = "MINIO_ROOT_USER"
              }
            }
          }
          env {
            name = "MINIO_ROOT_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.minio.metadata[0].name
                key  = "MINIO_ROOT_PASSWORD"
              }
            }
          }
          volume_mount {
            name       = "data"
            mount_path = "/data"
          }
          resources {
            requests = { cpu = "100m", memory = "256Mi" }
            limits   = { cpu = "1",    memory = "1Gi" }
          }
          readiness_probe {
            http_get {
              path = "/minio/health/ready"
              port = 9000
            }
            initial_delay_seconds = 10
            period_seconds        = 15
          }
        }
        volume {
          name = "data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.minio.metadata[0].name
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "minio" {
  metadata {
    name      = "nebula-minio"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  spec {
    selector = { app = "nebula-minio" }
    port {
      port        = 9000
      target_port = 9000
      name        = "s3"
    }
    port {
      port        = 9001
      target_port = 9001
      name        = "console"
    }
    cluster_ip = "None"
  }
}
