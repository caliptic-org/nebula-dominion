# CLAUDE.md

Bu dosya Nebula Dominion kod tabanında çalışan Claude / AI agent'lara
**kalıcı operasyonel context** verir. README.md kullanıcıya hitap eder,
DEPLOYMENT.md operatöre — bu dosya **bir sonraki AI agent**'a.

---

## Şu anki üretim durumu (2026-05-30)

- **Canlı**: 3 public hostname Cloudflare Tunnel üzerinden çalışıyor:
  - `https://nebula.caliptic.com` (Next.js web)
  - `https://api-nebula.caliptic.com` (NestJS REST API)
  - `https://game-nebula.caliptic.com` (NestJS + Socket.io)
- **Backend altyapısı**: Proxmox LXC 204 @ `10.10.10.40`, Ubuntu 22.04,
  Docker Compose ile 5 servis çalışıyor (web, api, game-server, redis,
  minio).
- **Veritabanı**: Caliptic-postgres VM 202 (10.10.10.20) üzerinde
  paylaşımlı PostgreSQL 17 + pgvector. `nebula_dominion` DB ayrı,
  `nebula` user yetkisi sadece kendi DB'sinde. 31 tablo migrate edildi.
- **Reverse proxy**: Caliptic bastion (LXC 201, 10.10.10.10) nginx
  `nebula-proxy.conf` üzerinden üç hostname proxy ediyor.
- **Tunnel**: Cloudflare Tunnel `722cb9f0-…` üzerinden üç hostname de
  bastion nginx'e gidiyor (`noTLSVerify: true`).

Tüm setup detayları: **`DEPLOYMENT.md`** (root'ta).

---

## Proje anatomisi

```
nebula-dominion/
├── apps/
│   ├── web/          # Next.js 14 — Phaser.js oyun motoru burada
│   ├── api/          # NestJS REST API + Swagger (/api/docs)
│   ├── api-server/   # (legacy / yan iş — production'da deploy edilmiyor)
│   └── game-server/  # NestJS + Socket.io PvP eşleştirme, savaş tick'i
├── backend/          # API ile shared kod — Docker'a Dockerfile context'iyle giriyor
├── database/migrations/  # TypeORM migration'ları (game-server boot'ta koşar)
├── infrastructure/   # init-db.sql vs.
├── monitoring/       # legacy Prometheus/Grafana stack (production'da Caliptic stack'ı kullanıyoruz)
├── deploy/           # nginx + openshift örnek config'ler (production'da unused)
├── docker-compose.yml         # geliştirme — postgres dahil her şey
├── docker-compose.prod.yml    # production overlay — LXC 204'te kullanılıyor
└── DEPLOYMENT.md / CLAUDE.md  # bu dosyalar
```

**Production'da deploy edilen 5 servis**: `web`, `api`, `game-server`,
`redis`, `minio` (+ `minio-init` one-shot). `postgres` external.
`api-server` ve `backend/` ayrı build artifact'ları üretiyor ama
production stack'inde aktif değil.

---

## Önemli kavramsal notlar

### 1. JWT cross-service token

`api` ile `game-server` aynı `JWT_SECRET`'i paylaşıyor (env'de
`GAME_SERVER_JWT_SECRET: ${JWT_SECRET}` ile zorlanıyor). `api`'nin
mint ettiği token, `game-server`'da verify olur. Production'da her
ikisi de aynı `.env`'den okuyor — secret değiştirirsen ikisini birden
restart et.

### 2. CORS — production validation

`api` ve `game-server` her ikisi de `CORS_ORIGINS` env'i
**production'da set edilmemişse boot'ta crash** ediyor
(`configuration.js:10:15`). `docker-compose.prod.yml` her ikisinin
environment bloğuna `CORS_ORIGINS: ${CORS_ORIGINS}` ekliyor. Yeni
servis eklersen aynısını yap.

### 3. Database migration trigger

**HER İKİ servis de kendi migration'larını boot'ta koşar** (paylaşımlı
DB'ye, bağımsızca):
- **game-server**: `apps/game-server/src/database/typeorm-migrations/*`
  globu, `DB_RUN_MIGRATIONS=true` env'i + `app.module.ts` `migrationsRun`.
- **api**: `apps/api/src/config/database.config.ts` içinde `migrationsRun: true`
  (hardcoded — env'e bağlı değil), glob = `apps/api/src/database/migrations/*`
  **VE** root `database/migrations/*` (yani api-owned tablolar: `shop_items`,
  `user_currency`, `transactions`, premium_pass seed'leri api boot'ta gelir).

Yani: api-owned bir tablo/seed eklemek için yeni TypeORM migration'ı
`apps/api/src/database/migrations/`'a koy (api boot'ta koşar); game-server
tablosu için `apps/game-server/src/database/typeorm-migrations/`'a koy. Bozuk
migration ilgili servisi crash-loop'lar → additive + `IF NOT EXISTS` + dedup-önce.

Order'a dikkat:
- `redis` healthy →
- `game-server` start → kendi migration'larını koş → listen →
- `api` start → kendi migration'larını koş (+ root SQL seed'leri) →
- `web` start → API'ye bağlan.

(Eski not "api migration koşturmaz" YANLIŞTI — düzeltildi.)

### 4. MinIO local — LXC volume'da

Production stack'inde MinIO LXC içinde local docker volume kullanıyor
(`nebula-dominion_minio-data`). Şu an replication / Hetzner Storage Box
sync yok. README'deki "Object Storage" mimari hedefi (HA) henüz
implement edilmedi. vzdump LXC'yi günlük yedekliyor — felaket
senaryosunda snapshot rollback işe yarar.

### 5. Matchmaking durumu Redis'te tutulur

Game-server matchmaking queue'ları Redis'te. Redis restart → bekleyen
oyuncuların queue'su sıfırlanır (clientlar disconnect olur, retry).
Production redis volume persistent ama RDB save 60s interval — son
60sn'lik queue state kaybolabilir. Bu kabul edilen trade-off.

### 6. Backend/ klasörü = api Dockerfile'ın context bağımlılığı

`apps/api/Dockerfile` build sırasında `backend/package.json` +
`backend/src/`'i kopyalıyor. `pnpm install`'dan sonra `backend/`'i ayrı
`npm install --ignore-scripts` ile install ediyor (bağımsız node_modules).
Dependency güncellemesinde her ikisini de kontrol et.

### 7. Next.js NEXT_PUBLIC_* build-time'da baked'leniyor

`apps/web/Dockerfile` `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_GAME_SERVER_URL`'i
build sırasında okuyor (Next.js standalone build). LXC'de `.env`
güncellesen bile **web container'ı yeniden BUILD edilmeden** frontend
eski URL'leri çağırmaya devam eder. Production'da subdomain değişirse:
1. `.env` güncelle
2. `docker compose ... build web` (sadece web)
3. `docker compose ... up -d --force-recreate web`

---

## Yaygın görevler

### Kod değişikliğini production'a almak

**Otomatik CI/CD var** (`.github/workflows/deploy-prod.yml`): kodu
`main`'e **push** et → LXC 204'teki **self-hosted GitHub Actions runner**
(`nebula-prod-runner`) tetiklenir → runner workspace'inde
`docker compose -f docker-compose.yml -f docker-compose.prod.yml
--env-file /opt/nebula-dominion/.env build + up -d` → healthcheck
("containers healthy") → internal (LXC 10.10.10.40) + public (Cloudflare
Tunnel) smoke test. `concurrency: deploy-prod` ile aynı anda tek deploy.
Bozuk migration/build → "Wait for containers healthy" adımı kırmızı,
production'a UYGULANMAZ (build "Apply stack"tan önce fail eder).

- İzleme: `gh run watch <id> --exit-status`.
- **`paths-ignore`**: `**.md`, `docs/**`, `infrastructure/terraform|runner/**`
  push'ları deploy TETİKLEMEZ (doc-only commit'ler rebuild yapmaz).
- Sadece-config/env değişikliği: `workflow_dispatch` + `skip_build:true`
  (image build atla, sadece `up -d`).
- `.env` repo'da DEĞİL → LXC'deki `/opt/nebula-dominion/.env`'den okunur
  (secret'lar runner'da değil host'ta).

Legacy manuel yol (runner down ise): DEPLOYMENT.md §10.1 — tar + scp LXC'ye
(`.env` exclude) + LXC'de `docker compose ... build && up -d`.

### Yeni migration

1. `database/migrations/` altına `XXXX-description.ts` ekle
2. Lokal test: `pnpm --filter game-server typeorm migration:run`
3. Production'a kodu push et — `game-server` container restart'ında otomatik koşar
4. Verify: `ssh ocp@192.168.1.229 'sudo -u postgres psql nebula_dominion -tc "\dt"'`

### Bir bug'u izole etmek

```bash
# 1. nginx access log → hangi backend'e gitti
ssh ocp@192.168.1.228 'sudo tail -100 /var/log/nginx/access.log | grep nebula | tail -10'

# 2. Container log
ssh root@192.168.1.231 'cd /opt/nebula-dominion && docker compose ... logs --tail=100 api'

# 3. DB query log (gerekirse postgres'te log_statement=all aç)
ssh ocp@192.168.1.229 'sudo tail -50 /var/log/postgresql/postgresql-17-main.log'
```

### Resource artırmak

LXC 204 şu an 4 vCPU / 8 GB / 30 GB. Concurrent player capacity'sini
test et:
```bash
ssh root@192.168.1.231 'docker stats --no-stream'
# api memory > 70%?  →  pct set 204 --memory 16384
# game-server CPU > 80%?  →  pct set 204 --cores 8
```

Live update (containerlar etkilenmeden):
```bash
ssh root@192.168.1.220 'pct set 204 --memory 16384 --cores 8'
```

---

## Çakışmaz kural setleri

1. **`.env` asla commit edilmez.** `.gitignore`'da, git-track edilmiyor.
   Yeni secret eklerken `.env.example`'a placeholder ekle, gerçek değeri
   LXC'deki dosyaya yaz.
2. **Production'da postgres LXC içinde çalıştırılmaz.** Tüm DB trafiği
   `10.10.10.20:5432` Caliptic-postgres VM'sine gider. `docker-compose.prod.yml`
   `postgres: !reset null` ile bundled servisi siliyor.
3. **`backend/` directory'sini silme**. `apps/api/Dockerfile` ona depend.
4. **Game-server proxy_buffering off** — nginx vhost konfiginde bilerek
   kapalı. Socket.io message latency için kritik. Değiştirme.
5. **Migration drop ETMEZ** — `DB_SYNCHRONIZE=false` production'da.
   Schema değişiklikleri sadece migration'la.
6. **Postgres `nebula` kullanıcısı sadece `nebula_dominion` DB'ye** erişebilir.
   Caliptic verisine yetkisi yok ve olmamalı.
7. **Subdomain naming convention** Cloudflare Tunnel'da `api-nebula` ve
   `game-nebula` (prefix önce). README/DEPLOYMENT/CLAUDE bu sırada tutarlı.
   `nebula-api` veya `nebula-game` ile değiştirme — CF Tunnel'da o isimler
   yok, 404 dönerler.

---

## Subdomain → service eşleştirme (yine)

| Public | Container | Endpoint pattern |
|---|---|---|
| `nebula.caliptic.com` | web | `/` Next.js sayfaları, `/health` |
| `api-nebula.caliptic.com` | api | `/api/v1/*` REST, `/api/docs` Swagger, `/api/docs-json` |
| `game-nebula.caliptic.com` | game-server | `/socket.io/*` WebSocket, `/api/health/live` |

Frontend kodu API'yi `NEXT_PUBLIC_API_URL` env'inden okuyor (build-time):
- Dev: `http://localhost:4000`
- Prod: `https://api-nebula.caliptic.com`

Aynı şekilde `NEXT_PUBLIC_GAME_SERVER_URL`.

---

## Sonraki büyük adımlar (deferred work)

1. **Promtail + Loki** entegrasyonu — Caliptic monitoring stack'ı
   Nebula container loglarını da indeksleyebilsin.
2. **Uptime Kuma** monitor'leri — 3 public URL + 1 DB connect probe.
3. **cAdvisor** LXC'de — per-container CPU/RAM panel'leri Grafana'da.
4. ~~**CI/CD**~~ ✅ TAMAMLANDI — GitHub Actions self-hosted runner LXC 204'te
   kurulu, `main`'e push → otomatik build+deploy+smoke-test
   (`.github/workflows/deploy-prod.yml`). Bkz. §"Kod değişikliğini
   production'a almak".
5. **TLS SAN extension** — `certbot --expand` ile nebula subdomain'leri
   bastion cert'e ekle (Cloudflare Tunnel `noTLSVerify` zaten bypass
   ediyor, low-priority).
6. **MinIO replication** veya Hetzner Storage Box sync — README mimari
   hedefi.

DEPLOYMENT.md §11'de detaylı.

---

## Repo dışındaki dependency'ler

Production'ı etkileyen ama bu repo'da olmayan yerler:

- **Caliptic infra** (`https://github.com/caliptic-org/caliptic`,
  `infra/` altı) — bastion nginx, monitoring stack, postgres VM,
  Cloudflare Tunnel, pgBackRest cron'ları. Nebula bunların üzerinde
  parazitlenmiş halde çalışıyor.
- **Cloudflare Dashboard** — DNS + Tunnel ingress + Zero Trust Access policies.
- **Proxmox host** (192.168.1.220, root SSH) — LXC create/start/snapshot/backup.

Bu zincirin bir halkası bozulursa Nebula da etkilenir.
