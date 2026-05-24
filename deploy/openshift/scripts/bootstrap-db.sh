#!/usr/bin/env bash
# Bootstrap script — create the `nebula_dominion` database and `nebula` user
# on the shared postgres VM (10.10.10.20). One-time setup; idempotent.
#
# Reads credentials from deploy/openshift/terraform.tfvars (uses the same
# postgres_user, postgres_password, postgres_db, postgres_host vars that
# the Terraform module reads).
#
# Requires:
#   - PG postgres-admin credentials (env: PG_ADMIN_USER, PG_ADMIN_PASSWORD)
#   - psql on PATH, or run from the bastion VM which has it
#   - Network reachability to the postgres VM (10.10.10.20:5432)
#
# Usage:
#   PG_ADMIN_USER=postgres PG_ADMIN_PASSWORD='...' bash bootstrap-db.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f terraform.tfvars ]]; then
  echo "ERROR: terraform.tfvars not found. Copy from terraform.tfvars.example and fill in." >&2
  exit 1
fi

# Pull values from terraform.tfvars. Quick-and-dirty grep (assumes the file
# stays well-formatted — Terraform's HCL syntax doesn't change between runs).
extract() {
  grep -E "^${1}\s*=" terraform.tfvars | head -1 \
    | sed -E 's/^[^=]+=\s*"?([^"]*)"?\s*$/\1/'
}

POSTGRES_HOST=$(extract postgres_host || echo "10.10.10.20")
POSTGRES_PORT=$(extract postgres_port || echo "5432")
POSTGRES_DB=$(extract postgres_db || echo "nebula_dominion")
POSTGRES_USER=$(extract postgres_user || echo "nebula")
POSTGRES_PASSWORD=$(extract postgres_password)

if [[ -z "${PG_ADMIN_USER:-}" || -z "${PG_ADMIN_PASSWORD:-}" ]]; then
  echo "ERROR: PG_ADMIN_USER and PG_ADMIN_PASSWORD must be set in env." >&2
  echo "Example: PG_ADMIN_USER=postgres PG_ADMIN_PASSWORD=secret bash $0" >&2
  exit 1
fi

if [[ -z "${POSTGRES_PASSWORD}" ]]; then
  echo "ERROR: postgres_password missing from terraform.tfvars" >&2
  exit 1
fi

echo "[bootstrap] target: ${POSTGRES_HOST}:${POSTGRES_PORT} / db=${POSTGRES_DB} user=${POSTGRES_USER}"

export PGPASSWORD="${PG_ADMIN_PASSWORD}"
PSQL_BASE="psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${PG_ADMIN_USER} -v ON_ERROR_STOP=1"

# Create role if missing (idempotent).
${PSQL_BASE} -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    CREATE ROLE "${POSTGRES_USER}" LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  ELSE
    ALTER ROLE "${POSTGRES_USER}" WITH PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;
SQL
echo "[bootstrap] role ${POSTGRES_USER} ready"

# Create database if missing. We can't run CREATE DATABASE inside DO $$, so
# check first.
DB_EXISTS=$(${PSQL_BASE} -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" | tr -d '[:space:]')

if [[ "${DB_EXISTS}" != "1" ]]; then
  ${PSQL_BASE} -d postgres -c \
    "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"
  echo "[bootstrap] database ${POSTGRES_DB} created"
else
  echo "[bootstrap] database ${POSTGRES_DB} already exists (no-op)"
fi

# Grant everything the role needs on the DB.
${PSQL_BASE} -d "${POSTGRES_DB}" <<SQL
GRANT ALL ON SCHEMA public TO "${POSTGRES_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO "${POSTGRES_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${POSTGRES_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "${POSTGRES_USER}";
SQL
echo "[bootstrap] privileges granted"

echo "[bootstrap] DONE. Connection string ready:"
echo "  postgresql://${POSTGRES_USER}:****@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
