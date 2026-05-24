# OpenShift project (namespace) for all Nebula Dominion resources.
#
# Note: A "Project" in OpenShift is technically a namespace + extra metadata
# (description, display-name, RBAC). Terraform's kubernetes provider only
# creates a vanilla namespace — the cluster controller upgrades it to a
# Project automatically once OCP sees it. That's intentional and idiomatic;
# no need for the project.openshift.io API.

resource "kubernetes_namespace" "nebula" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/part-of" = "nebula-dominion"
      "app.openshift.io/runtime"  = "nodejs"
    }
    annotations = {
      "openshift.io/display-name" = "Nebula Dominion"
      "openshift.io/description"  = "Turkish dark sci-fi manga strategy game — Next.js + NestJS + Phaser stack."
    }
  }
}
