# Non-secret runtime config.
#
# These values are safe to read off `oc describe configmap` — no creds, no
# tokens. They drive routing/feature flags and externally-visible URLs.

resource "kubernetes_config_map" "shared" {
  metadata {
    name      = "nebula-shared"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  data = {
    NODE_ENV               = "production"
    # Cross-service URLs — web uses NEXT_PUBLIC_* (browser-side fetch), api +
    # game-server use the in-cluster service DNS for low-latency intra-pod
    # traffic (no external hop).
    NEXT_PUBLIC_API_URL         = "https://${var.host_api}"
    NEXT_PUBLIC_GAME_SERVER_URL = "https://${var.host_game}"

    # Server-to-server intra-cluster URLs (no TLS overhead, no DNS lookup).
    API_INTERNAL_URL         = "http://nebula-api.${var.namespace}.svc.cluster.local:4000"
    GAME_SERVER_INTERNAL_URL = "http://nebula-game-server.${var.namespace}.svc.cluster.local:3001"
    REDIS_URL                = "redis://nebula-redis.${var.namespace}.svc.cluster.local:6379"
    MINIO_ENDPOINT           = "nebula-minio.${var.namespace}.svc.cluster.local"
    MINIO_PORT               = "9000"
    MINIO_USE_SSL            = "false"

    # CORS — api accepts requests from the player-facing web origin.
    CORS_ORIGINS = "https://${var.host_web}"

    # TypeORM: migrations run on boot, synchronize stays off (destructive in
    # prod). Same defaults as docker-compose.
    DB_SYNCHRONIZE     = "false"
    DB_RUN_MIGRATIONS  = "true"
    DB_LOGGING         = "false"

    # Game-server matchmaking tunables — copied from docker-compose defaults
    # so the prod stack behaves identically to local dev unless overridden.
    MATCHMAKING_INITIAL_ELO_RANGE     = "100"
    MATCHMAKING_ELO_EXPANSION_RATE    = "50"
    MATCHMAKING_EXPANSION_INTERVAL_MS = "10000"
    MATCHMAKING_MAX_WAIT_MS           = "120000"
    MATCHMAKING_TICK_INTERVAL_MS      = "2000"
    GAME_ROOM_TTL_SECONDS             = "3600"
    RECONNECT_WINDOW_MS               = "30000"
    MAX_ACTIONS_PER_SECOND            = "10"
    MAX_ROUND_DURATION_MS             = "30000"

    # Sentry environment label (not the DSN — that lives in secrets/).
    NEXT_PUBLIC_SENTRY_ENV = "production"
    SENTRY_ENV             = "production"

    # Analytics IDs that are baked into the client bundle at BUILD time but
    # we still expose here so a rebuild via BuildConfig pulls them in.
    NEXT_PUBLIC_GA_ID       = var.next_public_ga_id
    NEXT_PUBLIC_FB_PIXEL_ID = var.next_public_fb_pixel_id
  }
}
