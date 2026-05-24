output "namespace" {
  value       = kubernetes_namespace.nebula.metadata[0].name
  description = "Project / namespace where all Nebula resources live."
}

output "external_urls" {
  value = {
    web         = "https://${var.host_web}"
    api         = "https://${var.host_api}"
    game_server = "https://${var.host_game}"
  }
  description = "Public URLs (require matching Cloudflare tunnel hostname entries)."
}

output "internal_dns" {
  value = {
    api         = "nebula-api.${var.namespace}.svc.cluster.local:4000"
    game_server = "nebula-game-server.${var.namespace}.svc.cluster.local:3001"
    redis       = "nebula-redis.${var.namespace}.svc.cluster.local:6379"
    minio       = "nebula-minio.${var.namespace}.svc.cluster.local:9000"
  }
  description = "Service DNS used for in-cluster pod-to-pod communication."
}

output "image_refs" {
  value = {
    web         = local.web_image
    api         = local.api_image
    game_server = local.game_image
  }
  description = "Image references that the deploys pull. Push targets for `docker push`."
}

output "next_steps" {
  value = <<-EOT

    ✔  Resources applied.

    Before pods can come up successfully:

    1. Bootstrap the postgres DB (one-time):
       bash deploy/openshift/scripts/bootstrap-db.sh

    2. Build + push images to the internal registry:
       bash deploy/openshift/scripts/push-images.sh

    3. Add Cloudflare tunnel hostname entries (if using clean domains):
         - ${var.host_web}        → https://<sno-ip>:443
         - ${var.host_api}        → https://<sno-ip>:443
         - ${var.host_game}       → https://<sno-ip>:443

    4. Watch pods come up:
       oc -n ${var.namespace} get pods -w

  EOT
}
