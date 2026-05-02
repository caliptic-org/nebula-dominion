# Nebula Dominion — Backup System

Three-tier backup system. **RTO < 1 hour, RPO < 5 minutes.**

## Architecture

| Tier | Tool | What | Where | Schedule |
|------|------|------|-------|----------|
| 1 | PostgreSQL Streaming Replication | Live WAL stream | Server-2 (replica) | Continuous |
| 2 | pgBackRest | PostgreSQL full + WAL archive | Hetzner Storage Box + local disk | Daily full, incr every 6h |
| 3 | Restic | MinIO object data + configs | Hetzner Storage Box | Daily |

## Directory Structure

```
infrastructure/backup/
├── pgbackrest/
│   ├── pgbackrest.conf          pgBackRest configuration (uses env vars)
│   ├── postgresql-archive.conf  PostgreSQL WAL archiving settings
│   ├── env.template             → copy to /etc/pgbackrest/pgbackrest.env
│   ├── setup.sh                 Full installation and stanza-create
│   └── restore.sh               Point-in-time recovery helper
├── restic/
│   ├── env.template             → copy to /etc/restic/restic.env
│   ├── setup.sh                 Install restic + rclone, init repo
│   ├── backup-minio.sh          MinIO → staging → Restic snapshot
│   ├── backup-config.sh         /etc + infrastructure files → Restic
│   └── restore.sh               Restic restore helper (list/restore)
├── ansible/
│   ├── vars.yml                 Variables (non-secret)
│   ├── backup-setup.yml         Full setup playbook
│   ├── pgbackrest-env.j2        pgBackRest env template
│   ├── restic-env.j2            Restic env template
│   └── rclone.conf.j2           rclone MinIO config template
└── scripts/
    ├── notify.sh                Slack notification helper
    ├── cron-setup.sh            Install all cron jobs
    ├── monitor.sh               Backup health checks (runs every 6h)
    └── dr-test.sh               Monthly disaster recovery test
```

## Quick Start

### Option A — Ansible (recommended)

```bash
# 1. Fill in ansible-vault secrets
ansible-vault create infrastructure/backup/ansible/vault.yml
# Add: vault_pgbackrest_repo1_cipher_pass, vault_restic_password, etc.

# 2. Run playbook
ansible-playbook -i inventory/hosts \
  infrastructure/backup/ansible/backup-setup.yml \
  --ask-vault-pass

# 3. Add SSH public keys to Hetzner Storage Box
# (public keys are printed during playbook run)
```

### Option B — Manual

```bash
# On each server:
cp infrastructure/backup/pgbackrest/env.template /etc/pgbackrest/pgbackrest.env
cp infrastructure/backup/restic/env.template /etc/restic/restic.env
# Edit both files with real values

sudo bash infrastructure/backup/pgbackrest/setup.sh
sudo bash infrastructure/backup/restic/setup.sh
sudo bash infrastructure/backup/scripts/cron-setup.sh
```

## Cron Schedule

```
# PostgreSQL primary (postgres user)
0  3    * * *   pgbackrest full backup           → daily 03:00
0  9,15,21 * * * pgbackrest incremental backup   → every 6h
0  4    * * *   pgbackrest archive check

# All servers (root user)
30 3    * * *   restic backup-minio.sh            → daily 03:30
0  4    * * *   restic backup-config.sh           → daily 04:00
0  */6  * * *   monitor.sh (health check)
0  10   1 * *   dr-test.sh (monthly)
```

## Recovery Procedures

### PostgreSQL Point-in-Time Recovery

```bash
# Restore to latest (fastest)
sudo bash infrastructure/backup/pgbackrest/restore.sh

# Restore to specific time (PITR)
sudo bash infrastructure/backup/pgbackrest/restore.sh \
  --target "2026-05-01 03:00:00"

# List available backups first
sudo -u postgres pgbackrest --stanza=nebula-pg info
```

### Restore MinIO Data

```bash
# List snapshots
bash infrastructure/backup/restic/restore.sh --list --tag minio

# Restore to temp directory
bash infrastructure/backup/restic/restore.sh \
  --tag minio --target /mnt/restore/minio
```

### Restore Config Files

```bash
bash infrastructure/backup/restic/restore.sh \
  --tag config --target /mnt/restore/config
```

## RTO/RPO Targets

| Metric | Target | How |
|--------|--------|-----|
| RPO (max data loss) | **< 5 minutes** | WAL archive every 60s + streaming replication |
| RTO (restore time) | **< 1 hour** | pgBackRest delta restore from local repo cache |
| DR Test | Monthly | Automated `dr-test.sh` on 1st of month |

## Hetzner Storage Box

- Connect via SFTP (SSH key auth)
- pgBackRest path: `/nebula-dominion/pgbackrest`
- Restic path: `/nebula-dominion/restic`
- Both repositories are AES-256-CBC encrypted at rest
- Manage at: https://robot.hetzner.com/storage

## Monitoring

`monitor.sh` runs every 6 hours and checks:
- Age of last pgBackRest full backup
- WAL archive lag
- Age of last Restic MinIO snapshot
- Age of last Restic config snapshot
- Local backup disk usage

Alerts are sent to Slack. Configure `SLACK_WEBHOOK_URL` in `/etc/restic/restic.env`.

## Monthly DR Test

`dr-test.sh` runs on the 1st of each month and:
1. Tests pgBackRest stanza + archive integrity + isolated restore
2. Tests Restic MinIO snapshot accessibility + partial restore + repo check
3. Tests Restic config snapshot + critical file restore
4. Verifies WAL archive lag meets RPO target

Results are written to `/var/log/dr-tests/dr-test-YYYYMMDD.txt` and posted to Slack.
