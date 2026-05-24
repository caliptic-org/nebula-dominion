# Secrets — everything containing credentials or PII goes here.
#
# Splitting into multiple secrets (rather than one giant blob) means we can
# rotate JWT keys without rolling the entire env block, and Postgres creds
# can be mounted differently from analytics DSNs if needed.
#
# All values come from terraform.tfvars (gitignored). The `sensitive = true`
# flag on the input variables means Terraform redacts them from plan output.

resource "kubernetes_secret" "postgres" {
  metadata {
    name      = "nebula-postgres"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  data = {
    DB_HOST     = var.postgres_host
    DB_PORT     = tostring(var.postgres_port)
    DB_USER     = var.postgres_user
    DB_PASSWORD = var.postgres_password
    DB_NAME     = var.postgres_db
    # DATABASE_URL convenience for libs that want a single string
    DATABASE_URL = "postgresql://${var.postgres_user}:${var.postgres_password}@${var.postgres_host}:${var.postgres_port}/${var.postgres_db}"
  }
  type = "Opaque"
}

resource "kubernetes_secret" "jwt" {
  metadata {
    name      = "nebula-jwt"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  data = {
    JWT_SECRET         = var.jwt_secret
    JWT_REFRESH_SECRET = var.jwt_refresh_secret
  }
  type = "Opaque"
}

resource "kubernetes_secret" "sentry" {
  metadata {
    name      = "nebula-sentry"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  data = {
    # Frontend DSN — public-ish, but we still keep it out of the configmap
    # so rotation doesn't trigger a Pod rollout for unrelated env changes.
    NEXT_PUBLIC_SENTRY_DSN = var.next_public_sentry_dsn
    SENTRY_DSN             = var.server_sentry_dsn
  }
  type = "Opaque"
}

resource "kubernetes_secret" "minio" {
  metadata {
    name      = "nebula-minio"
    namespace = kubernetes_namespace.nebula.metadata[0].name
  }
  data = {
    MINIO_ROOT_USER     = var.minio_root_user
    MINIO_ROOT_PASSWORD = var.minio_root_password
    # api/game-server clients reuse these as access/secret keys (single-user
    # setup; multi-user IAM would split via mc admin user add).
    MINIO_ACCESS_KEY = var.minio_root_user
    MINIO_SECRET_KEY = var.minio_root_password
  }
  type = "Opaque"
}
