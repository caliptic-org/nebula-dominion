# Nebula Dominion — OpenShift Deploy

Terraform manifests that deploy the full app stack (web + api + game-server +
redis + minio) into an OpenShift Single-Node Cluster (SNO). Postgres is reused
from the existing VM at `10.10.10.20`.

This module is the **app layer** — it assumes the cluster, the postgres VM,
and the Cloudflare tunnel are already provisioned by the infrastructure
terraform at `D:\CararSenin\ocp-sno-kurulum\terraform`.

---

## Architecture

```
                ┌──────────────────────────────────┐
                │      Cloudflare Tunnel           │  (TLS terminates here)
                │  nebula.caliptic.com       ──┐   │
                │  api-nebula.caliptic.com  ──┤   │
                │  game-nebula.caliptic.com ──┘   │
                └──────────────┬───────────────────┘
                               │
                ┌──────────────▼────────────────┐
                │  OpenShift SNO (10.10.10.50)  │
                │  ─────────────────────────    │
                │  haproxy ingress → Routes     │
                │    → Services → Pods          │
                │                               │
                │  Project: nebula-prod         │
                │    Deployments:               │
                │      - nebula-web      (3000) │
                │      - nebula-api      (4000) │
                │      - nebula-game-srv (3001) │
                │    StatefulSets:              │
                │      - nebula-redis   (PVC)   │
                │      - nebula-minio   (PVC)   │
                └───────────────┬───────────────┘
                                │
                ┌───────────────▼──────────────┐
                │  Postgres VM 10.10.10.20     │
                │  ─ DB: nebula_dominion       │
                │  ─ user: nebula              │
                │  ─ (shared host with         │
                │     caliptic DB)             │
                └──────────────────────────────┘
```

---

## Prerequisites

1. **oc CLI installed** and logged in:
   ```
   oc login --token=... --server=https://api.ocp-sno.caliptic.com:6443
   oc whoami            # sanity check
   ```

2. **Cluster-admin or sufficient project-admin rights** to:
   - create namespaces (`oc create namespace`)
   - create Routes (CRD `route.openshift.io/v1`)
   - patch the image-registry operator (one-time, see below)

3. **Internal image registry exposed externally** (one-time):
   ```
   oc patch configs.imageregistry.operator.openshift.io/cluster \
     --patch '{"spec":{"defaultRoute":true}}' --type=merge
   ```
   Confirms the registry is reachable from your dev machine for `docker push`.

4. **Terraform >= 1.5** + `kubernetes` provider on PATH.

5. **`psql` or bastion SSH** to run the DB bootstrap script.

---

## One-time setup

### 1. Configure secrets

```
cd deploy/openshift
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars     # fill postgres_password, jwt_secret, etc.
```

### 2. Bootstrap the database

Creates `nebula_dominion` DB + `nebula` role on the existing postgres VM:

```
export PG_ADMIN_USER=postgres
export PG_ADMIN_PASSWORD='<postgres-superuser-password>'
bash scripts/bootstrap-db.sh
```

Idempotent — safe to re-run; updates the password if it changed in `tfvars`.

### 3. Build & push images

```
bash scripts/push-images.sh
```

This builds the 3 images (using existing Dockerfiles with BuildKit cache
mounts → fast subsequent rebuilds), tags them for the OpenShift internal
registry route, and pushes. The first push downloads base images (~5min);
subsequent pushes use cached layers (~30s).

### 4. Apply Terraform

```
terraform init
terraform plan      # review
terraform apply     # type 'yes'
```

### 5. Cloudflare tunnel — add hostname entries

For the clean subdomain URLs (`nebula.caliptic.com`, `api-nebula.caliptic.com`,
`game-nebula.caliptic.com`) you need to add 3 new entries to your Cloudflare
tunnel config (likely managed in `D:\CararSenin\ocp-sno-kurulum\terraform\cloudflare-tunnel.tf`).

These are **flat single-level subdomains of caliptic.com** (hyphen pattern,
not dot-nested) — each is its own DNS record + tunnel ingress rule.

Each entry routes the public hostname → SNO API server at 10.10.10.50:443.
The OpenShift ingress routes by `Host` header from there.

Alternative: skip Cloudflare changes, override the hostname variables to use
the existing cluster wildcard:

```
# in terraform.tfvars
host_web  = "nebula-web.apps.ocp-sno.caliptic.com"
host_api  = "nebula-api.apps.ocp-sno.caliptic.com"
host_game = "nebula-game.apps.ocp-sno.caliptic.com"
```

That works immediately via the existing `*.apps.ocp-sno.caliptic.com` tunnel
entry — zero Cloudflare config changes.

---

## Daily ops

### Deploy a new version

```bash
# 1. Bump image tag in terraform.tfvars
sed -i 's/image_tag = "latest"/image_tag = "v0.2.0"/' terraform.tfvars

# 2. Push new images
TAG=v0.2.0 bash scripts/push-images.sh

# 3. Apply (Terraform updates the deployments)
terraform apply

# 4. Watch the rollout
oc -n nebula-prod rollout status deploy/nebula-web
```

### Rotate the JWT secret

```bash
# Update terraform.tfvars with new jwt_secret value, then:
terraform apply

# The config-hash annotation on each deployment changes → automatic rollout.
# Old user sessions become invalid (they'll see 401 + re-login prompt).
```

### Check logs

```bash
oc -n nebula-prod logs deploy/nebula-api --tail=200 -f
oc -n nebula-prod logs deploy/nebula-game-server --tail=200 -f
oc -n nebula-prod logs deploy/nebula-web --tail=200 -f
```

### Database migrations

API runs `DB_RUN_MIGRATIONS=true` on boot, so new migrations apply on the
next pod restart. To force right now:

```bash
oc -n nebula-prod rollout restart deploy/nebula-api
```

### Tail Redis / MinIO

```bash
oc -n nebula-prod exec -it nebula-redis-0 -- redis-cli
oc -n nebula-prod port-forward svc/nebula-minio 9001:9001
# Then open http://localhost:9001 (MinIO admin UI)
```

---

## File map

```
deploy/openshift/
├── README.md                  # ← this file
├── providers.tf               # kubernetes + null + random providers
├── variables.tf               # input vars (most have sane defaults)
├── outputs.tf                 # URLs, image refs, next-steps hint
├── terraform.tfvars.example   # template — copy + fill in secrets
├── .gitignore                 # ignores .tfvars, .terraform/, *.tfstate*
│
├── 00-namespace.tf            # OpenShift project
├── 01-secrets.tf              # postgres / jwt / sentry / minio
├── 02-configmaps.tf           # shared env (URLs, feature flags)
├── 03-redis.tf                # StatefulSet + headless Service + PVC
├── 04-minio.tf                # StatefulSet + headless Service + PVC
├── 05-api.tf                  # NestJS api Deployment + Service
├── 06-game-server.tf          # NestJS socket.io Deployment + sticky Service
├── 07-web.tf                  # Next.js web Deployment + Service
├── 08-routes.tf               # OpenShift Routes (edge TLS termination)
│
└── scripts/
    ├── bootstrap-db.sh        # create nebula_dominion DB + role on PG VM
    └── push-images.sh         # build + push 3 images to internal registry
```

---

## Troubleshooting

**Pods stuck in `ImagePullBackOff`**
→ Images not yet pushed. Run `bash scripts/push-images.sh`.

**Pods stuck in `CrashLoopBackOff` for api/game-server**
→ Check `oc logs`. Most common: DB connection refused → bootstrap script not
  run, or postgres VM firewall doesn't accept SNO node IP.

**`Route` won't accept the hostname**
→ Each Route hostname must be unique cluster-wide. If another project owns
  `nebula.caliptic.com` (or `api-nebula.caliptic.com` / `game-nebula.caliptic.com`),
  OpenShift won't let you take it. Check:
  ```
  oc get route -A --field-selector spec.host=nebula.caliptic.com
  oc get route -A --field-selector spec.host=api-nebula.caliptic.com
  oc get route -A --field-selector spec.host=game-nebula.caliptic.com
  ```

**`401 Unauthorized` cross-service (web → api)**
→ JWT secret mismatch. Re-apply Terraform so both services get the same
  secret from `nebula-jwt`.

**Socket.io disconnects every 30s on /battle**
→ Cloudflare tunnel default timeout is short. The Route already has
  5-minute timeout annotations; check that the Cloudflare config doesn't
  override. Use Cloudflare's WebSocket setting → "Enabled".

---

## Capacity notes (SNO sizing)

Defaults are conservative (1 replica each, ~100m CPU / 256Mi RAM requests).
Total cluster usage at idle:

| Pod              | CPU req | Mem req | CPU limit | Mem limit |
|------------------|---------|---------|-----------|-----------|
| nebula-web       | 100m    | 256Mi   | 1         | 1Gi       |
| nebula-api       | 100m    | 256Mi   | 1         | 1Gi       |
| nebula-game-srv  | 100m    | 256Mi   | 1         | 1Gi       |
| nebula-redis     | 50m     | 128Mi   | 500m      | 512Mi     |
| nebula-minio     | 100m    | 256Mi   | 1         | 1Gi       |
| **TOTAL req**    | **450m**| **1.2Gi** | —       | —         |

Plenty of headroom on a SNO with 8+ cores. Bump `replicas_*` to 2-3 if
playtest traffic grows.

---

## What this module does NOT do

- Provision the cluster (use the reference Proxmox terraform)
- Provision the postgres VM (same — that's infra)
- Build the images (you run `push-images.sh` from dev machine or CI)
- Configure Cloudflare DNS / tunnel (manual via dashboard, or extend the
  infra terraform's `cloudflare-tunnel.tf`)
- Backup the DB (write a separate `velero` schedule or pg_dump cron)
