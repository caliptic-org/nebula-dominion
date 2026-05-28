# MinIO — S3-compatible object storage for user uploads (avatars, race
# artwork, future user-generated content). Single replica + PVC, exactly
# like docker-compose, except cluster-scoped.
#
# Browser-facing operations go through the api service (signed URLs), so we
# don't expose minio externally — only an internal ClusterIP Service.

# PVC commented out — see 03-redis.tf for full rationale (no
# StorageClass on the recovered cluster). MinIO runs on emptyDir for
# now. ⚠ Asset uploads (user avatars, race art uploads) are LOST on
# pod restart. Re-enable the PVC once LVMS/local-storage is provisioned.
#
# resource "kubernetes_persistent_volume_claim" "minio" {
#   metadata {
#     name      = "nebula-minio-data"
#     namespace = kubernetes_namespace.nebula.metadata[0].name
#   }
#   spec {
#     access_modes = ["ReadWriteOnce"]
#     resources {
#       requests = {
#         storage = "20Gi"
#       }
#     }
#   }
#   wait_until_bound = false
# }

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
        # No security_context — let OpenShift restricted-v2 SCC inject
        # the namespace-allowed UID/fsGroup range. fs_group=1000 was
        # outside the namespace SCC range and got rejected.
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
          # emptyDir until a default StorageClass is available. ⚠ Uploads
          # don't survive pod restart. See top of file.
          empty_dir {
            size_limit = "10Gi"
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
