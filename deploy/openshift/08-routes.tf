# OpenShift Routes — external HTTPS exposure.
#
# We use `kubernetes_manifest` because Terraform's `kubernetes` provider
# doesn't have a first-class Route resource (Routes are OpenShift-specific,
# not vanilla Kubernetes Ingress). The manifest API works against any CRD
# the cluster knows about.
#
# TLS termination: "edge" means OpenShift's haproxy ingress terminates TLS
# using the cluster's wildcard cert for *.apps.<cluster>.<domain>. For the
# clean hostnames (nebula.caliptic.com etc.) we still use edge — Cloudflare
# tunnel handles the public TLS upstream of OpenShift, so HTTP between CF
# and the cluster is fine on the internal network.

resource "kubernetes_manifest" "route_web" {
  manifest = {
    apiVersion = "route.openshift.io/v1"
    kind       = "Route"
    metadata = {
      name      = "nebula-web"
      namespace = kubernetes_namespace.nebula.metadata[0].name
      labels    = { app = "nebula-web" }
    }
    spec = {
      # Internal hostname matches *.apps.<cluster> wildcard cert — HAProxy
      # serves TLS without errors. Public hostname (nebula.caliptic.com) is
      # proxied to this via nginx on the bastion (Caliptic pattern).
      host = local.internal_host_web
      to = {
        kind   = "Service"
        name   = kubernetes_service.web.metadata[0].name
        weight = 100
      }
      port = {
        targetPort = "http"
      }
      tls = {
        termination                   = "edge"
        insecureEdgeTerminationPolicy = "Redirect"
      }
      wildcardPolicy = "None"
    }
  }
}

resource "kubernetes_manifest" "route_api" {
  manifest = {
    apiVersion = "route.openshift.io/v1"
    kind       = "Route"
    metadata = {
      name      = "nebula-api"
      namespace = kubernetes_namespace.nebula.metadata[0].name
      labels    = { app = "nebula-api" }
    }
    spec = {
      host = local.internal_host_api
      to = {
        kind   = "Service"
        name   = kubernetes_service.api.metadata[0].name
        weight = 100
      }
      port = {
        targetPort = "http"
      }
      tls = {
        termination                   = "edge"
        insecureEdgeTerminationPolicy = "Redirect"
      }
      wildcardPolicy = "None"
    }
  }
}

# Game-server Route — websocket-aware. The haproxy router needs annotations
# to keep socket.io clients pinned to the same backend pod (sticky sessions)
# and to allow long-lived WS upgrades through the LB.
resource "kubernetes_manifest" "route_game" {
  manifest = {
    apiVersion = "route.openshift.io/v1"
    kind       = "Route"
    metadata = {
      name      = "nebula-game-server"
      namespace = kubernetes_namespace.nebula.metadata[0].name
      labels    = { app = "nebula-game-server" }
      annotations = {
        # Sticky sessions via source IP — without this, scaling beyond 1
        # replica breaks socket.io sessions on reconnect.
        "haproxy.router.openshift.io/balance"           = "source"
        # Long timeout for upgraded WS connections (matchmaking queues +
        # in-battle ticks). Default is 30s which kills queues prematurely.
        "haproxy.router.openshift.io/timeout"           = "5m"
        "haproxy.router.openshift.io/timeout-tunnel"    = "5m"
      }
    }
    spec = {
      host = local.internal_host_game
      to = {
        kind   = "Service"
        name   = kubernetes_service.game_server.metadata[0].name
        weight = 100
      }
      port = {
        targetPort = "http-ws"
      }
      tls = {
        termination                   = "edge"
        insecureEdgeTerminationPolicy = "Redirect"
      }
      wildcardPolicy = "None"
    }
  }
}
