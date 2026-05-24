# Nebula Dominion — OpenShift deploy providers.
#
# Reference setup: D:\CararSenin\ocp-sno-kurulum\terraform (Proxmox infra).
# This module deploys the APP layer (web/api/game-server/redis/minio) into an
# already-provisioned SNO cluster. Postgres is reused from the existing VM
# at 10.10.10.20 — we create a new database (`nebula_dominion`) and user on
# it via the bootstrap script (scripts/bootstrap-db.sh).
#
# Auth: terraform reads ~/.kube/config (set via `oc login` on the user's
# machine). For CI you'd switch to a service account token + KUBE_TOKEN env.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "kubernetes" {
  # Pulls cluster + token from the default kubeconfig. To override per-env:
  #   export KUBECONFIG=/path/to/sno-kubeconfig
  config_path = var.kubeconfig_path
}
