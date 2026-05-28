# OpenShift Build pipeline — replaces the bastion-side docker build flow.
#
# Originally the deploy-prod.yml workflow shelled out to `docker build` on
# the bastion runner, then pushed to the cluster registry. That required
# the bastion to have docker-ce + buildx installed, which the recovery
# scenario showed is a brittle dependency: a fresh runner VM means a fresh
# docker install before any deploy can succeed.
#
# OpenShift's BuildConfig + ImageStream resources fix this. The runner now
# just runs `oc start-build --from-dir=. --follow` for each image; the
# build pod inside the cluster does the Dockerfile build and pushes
# directly into the internal registry. No daemon, no buildx, no docker
# CLI on the bastion — only `oc` and `git`.
#
# Three (ImageStream, BuildConfig) pairs — one per app. ImageStream is the
# target the BuildConfig pushes to and the Deployment pulls from. Tag
# strategy: every build pushes to `:latest`; the runner also tags the
# pushed image with the git short sha via `oc tag` so historical tags are
# preserved for rollback.

locals {
  app_images = {
    api = {
      dockerfile = "apps/api/Dockerfile"
    }
    game-server = {
      dockerfile = "apps/game-server/Dockerfile"
    }
    web = {
      dockerfile = "apps/web/Dockerfile"
    }
  }
}

# ── ImageStreams (target of build pushes, source of deployment pulls) ──
resource "kubernetes_manifest" "image_stream" {
  for_each = local.app_images

  manifest = {
    apiVersion = "image.openshift.io/v1"
    kind       = "ImageStream"
    metadata = {
      name      = "nebula-${each.key}"
      namespace = var.namespace
    }
    spec = {
      lookupPolicy = {
        local = true
      }
    }
  }

  depends_on = [kubernetes_namespace.nebula]
}

# ── BuildConfigs (binary Dockerfile builds, no external git source) ──
#
# Binary strategy: runner uploads the working tree via `oc start-build
# --from-dir=.`, so the build pod sees the exact code at the deploy tag.
# This lets us reuse the existing Dockerfiles unchanged.
#
# Resource limits chosen to keep the SNO node from getting OOM-killed:
# the web build (Next.js) is heaviest at ~3 GB peak; api/game-server
# are lighter.
resource "kubernetes_manifest" "build_config" {
  for_each = local.app_images

  manifest = {
    apiVersion = "build.openshift.io/v1"
    kind       = "BuildConfig"
    metadata = {
      name      = "nebula-${each.key}"
      namespace = var.namespace
    }
    spec = {
      source = {
        type = "Binary"
      }
      strategy = {
        type = "Docker"
        dockerStrategy = {
          dockerfilePath = each.value.dockerfile
        }
      }
      output = {
        to = {
          kind = "ImageStreamTag"
          name = "nebula-${each.key}:latest"
        }
      }
      resources = {
        limits = {
          cpu    = each.key == "web" ? "2"     : "1"
          memory = each.key == "web" ? "4Gi"   : "2Gi"
        }
        requests = {
          cpu    = "500m"
          memory = "1Gi"
        }
      }
      runPolicy = "Serial"
      # No webhook triggers — builds are kicked off explicitly by CI via
      # `oc start-build`. This keeps the deploy gated on the workflow's
      # `oc set env` + rollout-wait steps rather than firing on every
      # git push.
    }
  }

  depends_on = [kubernetes_manifest.image_stream]
}

# ── Outputs for the workflow ──
output "build_config_names" {
  description = "BuildConfig names — referenced by deploy-prod.yml as `oc start-build <name>`."
  value       = [for k, _ in local.app_images : "nebula-${k}"]
}

output "image_stream_pull_paths" {
  description = "Image pull paths the Deployments reference (internal registry → ImageStream)."
  value       = { for k, _ in local.app_images : k => "image-registry.openshift-image-registry.svc:5000/${var.namespace}/nebula-${k}:latest" }
}
