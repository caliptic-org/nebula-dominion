# Nebula Dominion — CI/CD

GitHub Actions workflow'ları. **Hedef: Proxmox LXC 204'teki Docker Compose
stack'i** (`/opt/nebula-dominion/`) main'e push'la otomatik güncelle.

> **Mimari değişiklik (2026-05-30)**: OpenShift kaldırıldı. Önceki
> tag-bazlı `oc set image` modeli yerine main'e push → self-hosted runner
> LXC 204'te `docker compose build + up -d` koşturur. Eski workflow'un
> git history'sinde nasıl çalıştığı `git log -p .github/workflows/deploy-prod.yml`
> ile görülebilir.

## 📋 Workflow envanteri

| Dosya | Tetikleyici | Runner | Ne yapar |
|---|---|---|---|
| `deploy-prod.yml` | `push: main` (paths-ignore var) veya manuel dispatch | `[self-hosted, nebula-prod]` (LXC 204) | 3 image build + `docker compose up -d` + healthcheck + internal/public smoke |
| `nginx-bastion.yml` | `deploy/nginx/**` push | `[self-hosted, bastion]` (LXC 201, Caliptic mirası) | Bastion nginx vhost dosyasını kopyala + reload |
| `auto-merge.yml` | PR opened/sync (`agent/*` branch) | `ubuntu-latest` (GH-hosted) | Agent PR'larını otomatik squash-merge |

## ⚙️ Tek seferlik kurulum (nebula-prod runner)

### 1. Self-hosted runner (LXC 204)

Runner kullanıcısı: `nebula-runner` (docker grubuna üye, NOT root).
systemd unit: `actions.runner.caliptic-org-nebula-dominion.nebula-prod-runner.service`.

**Otomatik (önerilen):**
```bash
# GitHub UI: Settings → Actions → Runners → New self-hosted runner
# → Linux x64 ekranındaki --token değerini al (1 saat geçerli)

ssh root@192.168.1.231
REGISTRATION_TOKEN=AXXXX... bash /opt/nebula-dominion/infrastructure/runner/install.sh
```

Veya local checkout'tan stream:
```powershell
ssh root@192.168.1.231 'REGISTRATION_TOKEN=AXXXX... bash -s' < infrastructure/runner/install.sh
```

**Manuel adımlar** (script'in yaptıklarının özeti):
1. `useradd -m -G docker nebula-runner`
2. `chgrp nebula-runner /opt/nebula-dominion/.env && chmod 640` — runner DATABASE_URL vs. okuyabilsin
3. Runner tarball indir + extract (`/home/nebula-runner/actions-runner/`)
4. `./config.sh --url … --token … --labels self-hosted,nebula-prod,linux,x64`
5. `./svc.sh install nebula-runner && ./svc.sh start`

Verify: GitHub UI'da runner `Idle` (yeşil daire), `nebula-prod-runner` adıyla.

### 2. /opt/nebula-dominion/ on-host state

Runner workflow source-of-truth değil — runner her run'da fresh `actions/checkout@v4`
yapar. Ama **`.env`** kalıcı olarak `/opt/nebula-dominion/.env`'de durur (mode 640,
grup `nebula-runner`). Workflow `--env-file /opt/nebula-dominion/.env` ile okur.

Yeni `.env` ekleme:
```bash
ssh root@192.168.1.231
nano /opt/nebula-dominion/.env       # NEW_VAR=value ekle
chgrp nebula-runner /opt/nebula-dominion/.env && chmod 640 /opt/nebula-dominion/.env
# Sonra docker-compose.prod.yml'a referans ekle, commit + push → deploy
```

### 3. GitHub repo secrets

**Şu an workflow secret kullanmıyor** — tüm sensitive değerler `.env` üzerinden,
on-host. Bu sayede `.env` rotation GitHub UI'sına dokunmadan yapılabiliyor.

Sentry release bildirimi veya benzeri future feature için secret eklenirse buraya yaz:

| Secret | Değer | Kullanan workflow |
|---|---|---|
| _(şu an yok)_ | — | — |

## 🚀 Deploy akışı

### Otomatik (push to main)

```bash
git checkout main
# kod değişikliği yap, commit
git push origin main
# → GitHub Actions başlar (paths-ignore'da değilse), ~5-8 dk sonra canlı
```

`paths-ignore` hangi değişikliklerde build atlar:
- `**.md` (dokümantasyon)
- `docs/**`
- `infrastructure/terraform/**` (TF değişikliği stack'i etkilemez)
- `infrastructure/runner/**` (runner config; deploy etkilemez)
- `.github/workflows/nginx-bastion.yml` ve `deploy/nginx/**` (ayrı workflow)

### Manuel (workflow_dispatch)

GitHub repo → **Actions → Deploy to Production → Run workflow**.

İnputlar:
- `skip_build`: `true` yaparsan image build atlanır (sadece `up -d`). Env-only
  değişiklik veya container restart için kullan.
- `services`: virgülle ayrı liste (default `api,game-server,web`). Sadece `web`
  rebuild için `web`.

### Hızlı sanity (deploy sonrası)

```bash
curl -s https://nebula.caliptic.com/health
curl -s https://api-nebula.caliptic.com/api/docs-json | head -c 100
curl -s https://game-nebula.caliptic.com/api/health/live
```

Hepsi 200 (web /health), 200 (api openapi.json), 200 (game-server health) dönmeli.

## 📊 Workflow adımları

```
1. actions/checkout@v4               (1-3 sn)
2. Show context                       (~0 sn)
3. Verify .env exists + required vars (~0 sn)
4. Validate compose config            (1-2 sn)
5. Build images (parallel)            (3-6 dk — pnpm + Next standalone)
6. compose up -d --remove-orphans     (5-15 sn — image değişen container'ları recreate)
7. Wait for healthchecks              (10-90 sn — game-server migration süresine bağlı)
8. Internal smoke (10.10.10.40)       (3-5 sn)
9. Public smoke (Cloudflare → bastion)(3-15 sn — CF tunnel cold start olabilir)
10. Step summary                      (~0 sn)
```

Toplam typical: **4-8 dk** (build dahil). `skip_build:true` ile **30-60 sn**.

## 🛠 Troubleshooting

**Runner offline**
→ Servis durumu kontrol et:
```bash
ssh root@192.168.1.231 'systemctl status actions.runner.caliptic-org-nebula-dominion.nebula-prod-runner.service'
sudo journalctl -u actions.runner.caliptic-org-nebula-dominion.nebula-prod-runner.service --since "10 min ago"
```
Restart: `sudo systemctl restart actions.runner.caliptic-org-nebula-dominion.nebula-prod-runner.service`

**`Cannot read /opt/nebula-dominion/.env`**
→ Permission drift. Düzelt:
```bash
chgrp nebula-runner /opt/nebula-dominion/.env && chmod 640 /opt/nebula-dominion/.env
```

**`Missing required env var: NEXT_PUBLIC_API_URL`**
→ `.env`'ye eksik var ekle (DEPLOYMENT.md §8'de listelenen secrets). Workflow
bunu fail-fast yapar çünkü web build'i NEXT_PUBLIC_* olmadan yapılırsa runtime'da
404 verir.

**Build 10+ dakika sürüyor**
→ Docker BuildKit cache'i temiz. İlk run'da normaldir. Sonraki run'lar 1-2 dk olmalı
(pnpm cache mount + apt-get layer cache). `docker builder prune` yapma — cache'i siler.

**Healthcheck "unhealthy" döner**
→ Container log'una bak:
```bash
ssh root@192.168.1.231 'cd /opt/nebula-dominion && docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env logs --tail=100 game-server'
```
En tipik: `CORS_ORIGINS` set değil → boot'ta `configuration.js:10:15` crash.
Veya postgres `10.10.10.20:5432` ulaşılmıyor → DB VM kontrol et.

**Public smoke warning ama internal pass**
→ Stack canlı, sorun upstream (Cloudflare Tunnel veya bastion nginx).
```bash
ssh ocp@192.168.1.228 'sudo nginx -t && sudo tail -50 /var/log/nginx/access.log | grep nebula'
```

**Runner workspace dolduruyor disk'i**
→ `_work/` altındaki eski checkout'lar. Manuel temizle:
```bash
ssh root@192.168.1.231 'find /home/nebula-runner/actions-runner/_work -mindepth 3 -maxdepth 3 -type d -mtime +30 -exec rm -rf {} +'
```

## 🔄 Runner yeniden kurma (LXC reset veya token expire)

1. GH UI: **Settings → Actions → Runners → nebula-prod-runner → ⋯ → Remove**
2. Yeni token al (aynı sayfada **New self-hosted runner**)
3. LXC 204'te:
   ```bash
   # Eski servisi temizle (varsa)
   cd /home/nebula-runner/actions-runner
   sudo ./svc.sh stop && sudo ./svc.sh uninstall
   sudo -u nebula-runner ./config.sh remove --token <REMOVAL_TOKEN>
   ```
4. install.sh'i tekrar koştur:
   ```bash
   REGISTRATION_TOKEN=AXXXX... bash infrastructure/runner/install.sh
   ```

## 🔐 Güvenlik notları

- **Runner repo-scoped** — sadece bu repo'nun workflow'larını alır. Fork PR'ları
  default'ta DROP edilir (GH policy + `permissions: contents: read`).
- **Workflow `permissions: contents: read`** — runner GITHUB_TOKEN'ı write
  yetkisi yok. Bir PR comment'i bile yazamaz.
- **`.env` GitHub'da değil** — secret rotation GH state'inden bağımsız.
- **Runner user `nebula-runner`** root değil, docker grup üyesi. Worst-case
  attack vektörü: docker.sock'a erişim → container escape → root. Bunun için
  LXC unprivileged + `keyctl=true` kombinasyonu güvenlik perdesi.
- **Bastion runner ayrı** — bastion-side ops (nginx config) için
  `[self-hosted, bastion]` etiketli ayrı runner var. nebula-prod runner
  bastion'a SSH bile etmez.

## 🔗 İlgili dokümantasyon

- `DEPLOYMENT.md` (root) — runtime arch, env vars, scaling, rollback
- `CLAUDE.md` (root) — AI agent kontekst notları
- `infrastructure/runner/install.sh` — bu runner'ın idempotent install script'i
- `infrastructure/terraform/` — LXC 204'ün Terraform tanımı (runner orada değil; ayrı)
