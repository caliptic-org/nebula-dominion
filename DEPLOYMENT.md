# Nebula Dominion — Production Deployment

Bu doküman Nebula Dominion'un Proxmox üzerindeki LXC deploy'unun **kalıcı
referansıdır**. Yeniden kurulum, ölçeklendirme, rollback ve günlük operasyon
prosedürleri buraya yazılır. README.md kullanıcıya hitap eder; bu dosya
SRE/operatöre.

> **Üretim ortamı durumu** (2026-05-30): canlı. 3 public hostname
> Cloudflare Tunnel üzerinden çalışıyor:
> - `https://nebula.caliptic.com` → web (200)
> - `https://api-nebula.caliptic.com` → api (`/api/docs-json` döner, 75 KB OpenAPI)
> - `https://game-nebula.caliptic.com` → game-server (`/api/health/live` → `{"status":"ok"}`)

---

## 1. Mimari

```
                 Cloudflare Edge
                       │
              Cloudflare Tunnel (cloudflared)
                       │   tunnel id 722cb9f0-…
                       ▼
              Caliptic bastion (LXC 201)
              192.168.1.228 / 10.10.10.10
              nginx (sites-available/nebula-proxy.conf)
                       │
                       │ 10.10.10.40 (vmbr1 internal)
                       ▼
            Nebula LXC 204 — `nebula-dominion`
            10.10.10.40 (vmbr1) / 192.168.1.231 (vmbr0 mgmt)
            Ubuntu 22.04 + Docker 29.5.2 + Compose v5.1.4
            4 vCPU / 8 GB RAM / 30 GB disk / unprivileged + nesting=1
            │
            ├── docker compose stack (/opt/nebula-dominion/)
            │     ├── web         :3000  Next.js
            │     ├── api         :4000  NestJS REST
            │     ├── game-server :3001  NestJS + Socket.io
            │     ├── redis       :6379  cache + matchmaking
            │     └── minio       :9000  S3-uyumlu storage
            │
            └── Postgres external @ 10.10.10.20:5432
                 (Caliptic-postgres VM 202, paylaşılan PG 17.10
                  + pgvector; `nebula_dominion` DB ayrı, `nebula` user)
```

**Subdomain → backend eşleştirmesi:**

| Public | nginx upstream | Container | Port |
|---|---|---|---|
| `nebula.caliptic.com` | `nebula_web` | web | 3000 |
| `api-nebula.caliptic.com` | `nebula_api` | api | 4000 |
| `game-nebula.caliptic.com` | `nebula_gameserver` | game-server | 3001 |

---

## 2. Ortamdaki kalıcı durum (state-of-the-world)

| Component | Path / yer | Backup'ı kim alıyor? |
|---|---|---|
| Source code + compose | LXC 204 `/opt/nebula-dominion/` | vzdump (Proxmox) günlük |
| `.env` (secrets) | LXC 204 `/opt/nebula-dominion/.env` (mode 600) | vzdump |
| Postgres data | postgres VM 202 `/var/lib/postgresql/17/main/` | pgBackRest (full + diff + WAL → backup-pool) |
| MinIO buckets | LXC 204 docker volume `nebula-dominion_minio-data` | vzdump |
| Redis snapshot | LXC 204 docker volume `nebula-dominion_redis-data` | vzdump (ephemeral, kayıp tolere edilir) |
| nginx config | bastion `/etc/nginx/sites-available/nebula-proxy.conf` | vzdump (bastion daily) |

**Çakışmaz kabuller:**
- Nebula `nebula` PG kullanıcısı sadece `nebula_dominion` veritabanına erişebilir.
  Caliptic verisine `caliptic` kullanıcısı, oraya `nebula` user yetkisi yok.
- LXC 204 üç tane disposable container çalıştırıyor (redis + minio + minio-init).
  Redis snapshot her 60sn (RDB), MinIO yerel disk — kritik state burada değil.

---

## 3. Subdomain + Cloudflare Tunnel ingress

Üç hostname de **Cloudflare Tunnel 722cb9f0-41eb-43fd-b682-36d935da5cf0**
üzerinde tanımlı, hepsi `https://127.0.0.1:443` (bastion nginx) noktasına
gider (`noTLSVerify: true`):

```
nebula.caliptic.com         → https://127.0.0.1:443 (noTLS)
api-nebula.caliptic.com     → https://127.0.0.1:443 (noTLS)
game-nebula.caliptic.com    → https://127.0.0.1:443 (noTLS)
```

DNS kayıtları proxied=true, Cloudflare A/CNAME otomatik.

Doğrulama (bastion'dan veya genel internet'ten):
```bash
for h in nebula api-nebula game-nebula; do
  curl -sI -o /dev/null -w "$h → %{http_code}\n" "https://${h}.caliptic.com/"
done
# Beklenen:
#   nebula      → 200
#   api-nebula  → 404 (root path 404, /api/docs-json çalışmalı)
#   game-nebula → 404 (root path 404, /api/health/live çalışmalı)

curl -s https://api-nebula.caliptic.com/api/docs-json | head -c 80
curl -s https://game-nebula.caliptic.com/api/health/live
```

Tunnel config'i Cloudflare API ile sorgulamak (token yetkisi gerekir):
```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/0e105df0e96e63c4786539a29056a0be/cfd_tunnel/722cb9f0-41eb-43fd-b682-36d935da5cf0/configurations" \
  -H "Authorization: Bearer <TOKEN>" | jq '.result.config.ingress'
```

---

## 4. nginx reverse proxy (bastion)

Konfig: `/etc/nginx/sites-available/nebula-proxy.conf` (symlinked'tir).

```nginx
upstream nebula_web         { server 10.10.10.40:3000; keepalive 32; }
upstream nebula_api         { server 10.10.10.40:4000; keepalive 32; }
upstream nebula_gameserver  { server 10.10.10.40:3001; keepalive 32; }

server {
  listen 443 ssl; listen 80;
  server_name nebula.caliptic.com;
  ssl_certificate     /etc/letsencrypt/live/caliptic-bastion/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/caliptic-bastion/privkey.pem;
  include snippets/cf-realip.conf;
  proxy_read_timeout  3600;
  location / {
    proxy_pass http://nebula_web;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;
  }
}
# api-nebula.* ve game-nebula.* için ayrı server { ... } bloğu var
# (game-server'da proxy_buffering off + 7200s timeout — Socket.io için).
```

TLS sertifikası `caliptic-bastion` Let's Encrypt cert'i (SAN: app.caliptic.com,
ocp.caliptic.com vs.). Nebula subdomain'leri **bu cert tarafından kapsanmıyor**
— Cloudflare Tunnel `noTLSVerify: true` ile gönderdiği için origin TLS
handshake mismatch'e takılmıyor. İstersen Caliptic'in cert renewal hook'una
nebula.* + api-nebula.* + game-nebula.* eklenerek SAN genişletilebilir.

Yeniden yüklemek:
```bash
ssh ocp@192.168.1.228 'sudo nginx -t && sudo systemctl reload nginx'
```

---

## 5. LXC 204 yönetimi (Proxmox)

```bash
# Proxmox host (192.168.1.220) üzerinden:
pct status 204                    # çalışıyor mu
pct enter 204                     # interaktif shell
pct stop 204 ; pct start 204      # restart (10 sn)
pct shutdown 204                  # nazik kapat
pct snapshot 204 pre-update -d "before upgrade"
pct listsnapshot 204
pct rollback 204 pre-update       # snapshot'a dön (DB harici!)
```

LXC config: `/etc/pve/lxc/204.conf` Proxmox host'unda. Kaynak değişikliği:
```bash
pct set 204 --memory 16384       # 8 → 16 GB (live)
pct set 204 --cores 6            # vCPU artır
pct set 204 --rootfs local-lvm:50  # disk 30 → 50 GB
```

---

## 6. Stack başlatma / durdurma / log inceleme

LXC içinde, `/opt/nebula-dominion`:

```bash
# Tüm stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env logs -f api game-server web

# Tek servis recreate
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d --force-recreate api

# Image yeniden build (kod değişti)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env build --no-cache api
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d api
```

`docker-compose.prod.yml` overlay'in işi:
- `postgres: !reset null` — bundled postgres'i devre dışı bırak (external @ 10.10.10.20 kullanıyoruz).
- Tüm host port binding'lerini `10.10.10.40:` üzerine al (sadece vmbr1
  internal'dan erişilebilsin; bastion nginx oradan proxy yapsın).
- `depends_on: !override` — postgres healthcheck dependency'sini sil.
- Production env override (CORS_ORIGINS, NEXT_PUBLIC_*, vs.).

> **Pitfall**: docker compose'un `!override` ve `!reset` directive'leri
> sadece v2.24+'da var. LXC'de v5.1.4 yüklü, çalışıyor. Daha eski compose
> kullanırsan profil veya override başka bir şekilde yapılmalı.

---

## 7. Veritabanı

**Connection string** (saklanan tek yerden okumak: LXC 204 `.env`):

```
DATABASE_URL=postgresql://nebula:<password>@10.10.10.20:5432/nebula_dominion
```

Şifre yedeği: postgres VM'inde `/root/nebula-pg-pass.txt` (mode 600, root-only).

Migration: `game-server` container'ı boot olurken otomatik koşturuyor
(`DB_RUN_MIGRATIONS=true`). 31 tablo + indeksler. Yeni migration eklersen
sadece kod build edip recreate yeterli.

Backup: pgBackRest (postgres VM'de) `nebula_dominion` DB'yi de yedekliyor —
postgres cluster bazlı backup. Restore senaryosu:

```bash
ssh ocp@192.168.1.229
sudo systemctl stop postgresql@17-main
sudo -u postgres pgbackrest --stanza=caliptic --type=time \
     --target='2026-05-29 19:00:00+00' --target-action=promote restore
sudo systemctl start postgresql@17-main
# Nebula'nın migration version tablosu da geri döner.
```

Manuel inceleme:
```bash
ssh ocp@192.168.1.229
sudo -u postgres psql nebula_dominion -c "\dt"
sudo -u postgres psql nebula_dominion -c "SELECT count(*) FROM users;"
```

---

## 8. Secrets

**Üretim ortamında saklanan ve commit edilmeyen değerler:**

| Secret | Konum | Değiştirme |
|---|---|---|
| `POSTGRES_PASSWORD` (nebula) | LXC `/opt/nebula-dominion/.env` + postgres VM `/root/nebula-pg-pass.txt` | Hem postgres'te `ALTER USER nebula PASSWORD …` hem `.env` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | `.env` | Yeniden generate + tüm session'lar invalid olur |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | `.env` | MinIO restart + IAM key rotation |
| `TELEMETRY_API_KEY` | `.env` | Frontend env'ini de güncelle |

`.env` dosyası `.gitignore`'da (commit ETMEYIN). Reinstall senaryosunda
yeni `.env` oluştur, secret'ları regenerate et, `docker compose up -d`.

---

## 9. Observability

| Component | Nereden gelir | Erişim |
|---|---|---|
| Node-level metrics | LXC 204 node_exporter (host pkg) :9100 | Prometheus job `node-exporter` (caliptic monitoring stack) |
| Container metrics | (henüz cAdvisor yok LXC'de — opsiyonel) | — |
| App logs (stdout) | docker logs via Promtail (henüz LXC'ye install edilmedi — opsiyonel) | — |
| Public URL uptime | (henüz Uptime Kuma probe eklenmedi — bekleyen iş) | Future |
| nginx access logs | bastion `/var/log/nginx/access.log` | grep nebula |

**Mevcut Caliptic monitoring** stack'i Nebula'yı host-seviyesinde görüyor:
- `monitor.caliptic.com` → Grafana "Node Exporter Full" dashboard → instance dropdown'unda `10.10.10.40:9100` seç.
- Alerts (`infra/monitoring/alerts/caliptic.yml`): `HighMemoryUsage`, `HighCPUUsage`, `DiskAlmostFull`, `NodeDown` — hepsi 10.10.10.40 dahil çalışıyor.

**Sonradan eklenecek** (öncelik düşük):
1. Promtail LXC'de — docker container loglarını Loki'ye gönder.
2. Uptime Kuma 3 public URL probe (HTTP /api/health/live).
3. cAdvisor LXC'de — per-container CPU/RAM panels.

---

## 10. Operasyon senaryoları

### 10.1 Kodu güncelle + deploy

```powershell
# Geliştirici makinesinde (D:\nebula\me\nebula-dominion):
# 1. Değişikliği yap, test et, commit et
# 2. tar + scp LXC'ye

cd D:\nebula\me\nebula-dominion
tar.exe --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.git' `
        --exclude='.env' --exclude='coverage' -czf $env:TEMP\nebula-update.tar.gz .
scp -i ~/.ssh/id_ed25519 $env:TEMP\nebula-update.tar.gz root@192.168.1.231:/tmp/
```

LXC'de:
```bash
ssh root@192.168.1.231
cd /opt/nebula-dominion
tar -xzf /tmp/nebula-update.tar.gz   # .env'i overwrite ETMEZ (exclude'da)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env build api game-server web
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env ps
```

### 10.2 Rollback

```bash
# Proxmox host'unda:
pct shutdown 204
pct listsnapshot 204
pct rollback 204 pre-deploy-2026-05-29   # commit'ten önce snapshot al!
pct start 204
# DB rollback gerekirse ayrı (pgBackRest)
```

### 10.3 Yeni runtime env var ekle

1. `.env` dosyasına ekle: `NEW_VAR=value`
2. `docker-compose.prod.yml` ilgili servisin `environment:` bloğuna referans:
   `NEW_VAR: ${NEW_VAR}`
3. Compose recreate: `docker compose ... up -d api`

### 10.4 Container içine shell

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env exec api sh
# game-server:
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env exec game-server sh
```

### 10.5 Hızlı debugging

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env logs --tail=200 --follow api
# nginx access log (bastion):
ssh ocp@192.168.1.228 'sudo tail -50 /var/log/nginx/access.log | grep nebula'
# postgres queries (postgres VM):
ssh ocp@192.168.1.229 'sudo tail -50 /var/log/postgresql/postgresql-17-main.log'
```

---

## 11. Pending / known issues

1. **TLS SAN** caliptic-bastion sertifikasında nebula subdomain'leri yok.
   Cloudflare Tunnel `noTLSVerify` ile sorun olmuyor ama temizlik için
   `certbot` renewal hook'una `--cert-name caliptic-bastion -d nebula.caliptic.com
   -d api-nebula.caliptic.com -d game-nebula.caliptic.com` eklenebilir.
2. **Promtail + cAdvisor** LXC'ye install edilmedi. Caliptic
   `infra/monitoring/docker-compose.agents-bastion.yml`'deki pattern
   takip edilerek kurulabilir (nebula-agents adıyla ayrı compose project).
3. **Uptime Kuma probe'ları** 3 public URL için eklenmedi —
   monitor.caliptic.com'a giriş yapıp `nebula.caliptic.com/health`,
   `api-nebula.caliptic.com/api/docs-json`, `game-nebula.caliptic.com/api/health/live`
   HTTP monitor'leri eklemek 2 dakikalık iş.
4. **CI/CD** yok — şu an manuel deploy. Gitea/Drone seçeneği `deploy/`
   altında ama henüz wire edilmemiş. v2'de bir CI runner eklenip GH veya
   Gitea üzerinden auto-deploy yapılabilir.
5. **Backup retention** Nebula'ya özel rule yok — global pgBackRest schedule
   (Caliptic için ayarlanmış: full 7gün, diff 2gün, WAL 14gün) Nebula
   DB'sini de kapsıyor.

---

## 12. Quick reference cheatsheet

```bash
# Public URL health
curl -s https://nebula.caliptic.com/health
curl -s https://api-nebula.caliptic.com/api/docs-json | head -c 100
curl -s https://game-nebula.caliptic.com/api/health/live

# Stack durumu
ssh root@192.168.1.231 'cd /opt/nebula-dominion && docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env ps'

# DB tablo sayısı
ssh ocp@192.168.1.229 'sudo -u postgres psql nebula_dominion -tc "SELECT count(*) FROM pg_tables WHERE schemaname='\''public'\''"'

# nginx config test
ssh ocp@192.168.1.228 'sudo nginx -t'

# Proxmox kaynak kullanımı
ssh root@192.168.1.220 'pct exec 204 -- top -b -n 1 | head -10'
```
