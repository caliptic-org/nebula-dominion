# Release Infra Bootstrap — Transferable HOW-TO

Bu doküman tek bir agent context'ine yapıştırıldığında, agent'ın sıfırdan
yeni bir projeye **bastion nginx reverse-proxy + GitHub Actions deploy
workflow + production rollout diagnostics** kurmasını sağlar.

Kaynak proje: `nebula-dominion`. Hedef pattern: **Caliptic SNO** (OpenShift
Single-Node Cluster + Cloudflare Tunnel + paylaşımlı bastion nginx).

---

## TL;DR — agent'a verilecek talimat

> Bu dokümanı oku. Kullanıcıdan **§3 Parametre Toplama**'daki 7 değeri al.
> Sonra **§5 Dosya İçerikleri**'ndeki 5 dosyayı, placeholder'ları (`__X__`)
> kullanıcının değerleriyle değiştirerek hedef projeye yaz. **§7 Smoke Test**
> komutlarını çalıştır ve sonuçları kullanıcıya raporla. Sorun çıkarsa
> **§8 Troubleshooting** tablosuna bak.

---

## 1. Mimari

```
İnternet → Cloudflare Tunnel (TLS terminates here)
              │
              ▼
        Bastion VM
              │  nginx :80
              ▼  ┌─── server_name __HOST_WEB__ ─→ upstream __SHORT___web_upstream
                 │                                  https://__SHORT__-web-__NAMESPACE__.__CLUSTER_DOMAIN__:443
                 ├─── server_name __HOST_API__ ─→ upstream __SHORT___api_upstream
                 │                                  https://__SHORT__-api-__NAMESPACE__.__CLUSTER_DOMAIN__:443
                 └─── server_name __HOST_WS__  ─→ upstream __SHORT___ws_upstream  (opsiyonel)
                                                    https://__SHORT__-__WS_SERVICE__-__NAMESPACE__.__CLUSTER_DOMAIN__:443
              │
              ▼
       OpenShift SNO (HAProxy → Routes → Services → Pods)
```

### Neden bu yapı

- **Cloudflare** public TLS'i terminate eder (`*.caliptic.com` wildcard).
- **Bastion nginx** birden fazla proje için **paylaşılan reverse proxy**.
  Her proje kendi `/etc/nginx/conf.d/<proje>.conf` dosyasını sahiplenir;
  `nginx.conf`'a kimse dokunmaz → projeler birbirini ezmez.
- **OpenShift Routes** wildcard cert (`*.apps.<cluster>.<base>`) ile servis
  eder → nginx ↔ OCP HTTPS olur (`proxy_ssl_verify off`).

---

## 2. Önkoşullar

| Gereksinim | Doğrulama komutu |
|---|---|
| Bastion VM'de nginx kurulu + `/etc/nginx/conf.d/` mevcut | `ssh bastion sudo ls /etc/nginx/conf.d/` |
| OpenShift cluster + Routes mevcut (`__SHORT__-{web,api}-__NAMESPACE__.__CLUSTER_DOMAIN__`) | `oc get routes -n __NAMESPACE__` |
| Cloudflare tunnel `__HOST_WEB__` / `__HOST_API__` → bastion'a yönlü | Tunnel config UI |
| GitHub self-hosted runner kurulu, `[self-hosted, bastion]` etiketli, online | repo Settings → Actions → Runners |
| Sudoers kuralı (§6) bastion'da hazır | `sudo -l -U gh-runner` |

---

## 3. Parametre Toplama

Agent kullanıcıdan sırayla bu 7 değeri istemeli:

| Var | Örnek | Açıklama |
|---|---|---|
| `__PROJECT__` | `nebula-dominion` | Proje adı (uzun form) — yorum + log'larda kullanılır |
| `__SHORT__` | `nebula` | Kısa anahtar (lowercase, no dashes) — dosya adı + upstream prefix |
| `__NAMESPACE__` | `nebula-prod` | OpenShift namespace |
| `__CLUSTER_DOMAIN__` | `apps.ocp-sno.caliptic.com` | Cluster wildcard domain |
| `__HOST_WEB__` | `nebula.caliptic.com` | Public web hostname |
| `__HOST_API__` | `api-nebula.caliptic.com` | Public API hostname |
| `__HOST_WS__` + `__WS_SERVICE__` | `game-nebula.caliptic.com` / `game-server` | Opsiyonel — WebSocket vhost yok ise **boş bırak**, agent o bloğu skip etsin |

Doğrulama:
- `__SHORT__` boşluk/tire içermemeli (upstream isminde geçecek)
- `__HOST_*` host değerleri DNS'te resolvable (Cloudflare tunnel'da entry açık) olmalı

---

## 4. Hedef Dizin Düzeni

```
<TARGET_DIR>/
├── deploy/
│   └── nginx/
│       ├── __SHORT__.conf            ← §5.1
│       ├── 00-__SHORT__-maps.conf    ← §5.2 (opsiyonel — WS yoksa atla)
│       ├── install.sh                ← §5.3 (chmod +x)
│       └── README.md                 ← §5.5
└── .github/
    └── workflows/
        └── nginx-bastion.yml         ← §5.4
```

Agent: hedef dizin yoksa `mkdir -p` ile yarat. Mevcut dosyalar varsa **üzerine yaz** (kullanıcı onayı al, ama varsayılan `--yes`).

---

## 5. Dosya İçerikleri

> Her bloktaki `__X__` token'larını §3'teki değerlerle global replace et.
> WebSocket bölümleri `__WS_*_BEGIN__ … __WS_*_END__` marker'ları arasında:
> `__HOST_WS__` boşsa **markers + içerik silinir**, doluysa **sadece markers silinir**.

### 5.1 `deploy/nginx/__SHORT__.conf`

```nginx
# /etc/nginx/conf.d/__SHORT__.conf
#
# __PROJECT__ — bastion nginx reverse proxy config (drop-in).
#
# Isolation guarantees:
# 1. Every server block uses explicit server_name — no default_server.
# 2. Upstreams prefixed __SHORT___* — no name collision.
# 3. Log files under /var/log/nginx/__SHORT__-*.log.

upstream __SHORT___web_upstream {
    server __SHORT__-web-__NAMESPACE__.__CLUSTER_DOMAIN__:443;
    keepalive 16;
}

upstream __SHORT___api_upstream {
    server __SHORT__-api-__NAMESPACE__.__CLUSTER_DOMAIN__:443;
    keepalive 16;
}

# __WS_UPSTREAM_BEGIN__
upstream __SHORT___ws_upstream {
    server __SHORT__-__WS_SERVICE__-__NAMESPACE__.__CLUSTER_DOMAIN__:443;
    keepalive 32;
}
# __WS_UPSTREAM_END__

server {
    listen 80;
    listen [::]:80;
    server_name __HOST_WEB__;

    real_ip_header CF-Connecting-IP;
    set_real_ip_from 0.0.0.0/0;

    access_log /var/log/nginx/__SHORT__-web-access.log;
    error_log  /var/log/nginx/__SHORT__-web-error.log warn;

    client_max_body_size 20m;

    location / {
        proxy_pass         https://__SHORT___web_upstream;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_ssl_name     __SHORT__-web-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_ssl_verify   off;
        proxy_set_header   Host               __SHORT__-web-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_set_header   X-Forwarded-Host   $host;
        proxy_set_header   X-Forwarded-Proto  https;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   Connection         "";
        proxy_buffering    off;
        proxy_read_timeout 90s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name __HOST_API__;

    real_ip_header CF-Connecting-IP;
    set_real_ip_from 0.0.0.0/0;

    access_log /var/log/nginx/__SHORT__-api-access.log;
    error_log  /var/log/nginx/__SHORT__-api-error.log warn;

    client_max_body_size 10m;

    location / {
        proxy_pass         https://__SHORT___api_upstream;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_ssl_name     __SHORT__-api-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_ssl_verify   off;
        proxy_set_header   Host               __SHORT__-api-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_set_header   X-Forwarded-Host   $host;
        proxy_set_header   X-Forwarded-Proto  https;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   Connection         "";
        proxy_read_timeout 60s;
    }
}

# __WS_SERVER_BEGIN__
server {
    listen 80;
    listen [::]:80;
    server_name __HOST_WS__;

    real_ip_header CF-Connecting-IP;
    set_real_ip_from 0.0.0.0/0;

    access_log /var/log/nginx/__SHORT__-ws-access.log;
    error_log  /var/log/nginx/__SHORT__-ws-error.log warn;

    client_max_body_size 10m;

    location / {
        proxy_pass         https://__SHORT___ws_upstream;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_ssl_name     __SHORT__-__WS_SERVICE__-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_ssl_verify   off;

        # WebSocket upgrade
        proxy_set_header   Upgrade            $http_upgrade;
        proxy_set_header   Connection         $connection_upgrade;

        proxy_set_header   Host               __SHORT__-__WS_SERVICE__-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_set_header   X-Forwarded-Host   $host;
        proxy_set_header   X-Forwarded-Proto  https;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Real-IP          $remote_addr;

        proxy_read_timeout  5m;
        proxy_send_timeout  5m;
    }
}
# __WS_SERVER_END__
```

### 5.2 `deploy/nginx/00-__SHORT__-maps.conf`

Sadece WS vhost varsa **veya** stock nginx.conf'ta `$connection_upgrade` map'i yoksa
gerekir. `install.sh` zaten bunu otomatik kontrol ediyor; dosyayı yine de yaz.

```nginx
# /etc/nginx/conf.d/00-__SHORT__-maps.conf
#
# Optional companion to __SHORT__.conf — provides $connection_upgrade.
# install.sh skips this file when an existing map is detected elsewhere.

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### 5.3 `deploy/nginx/install.sh`

```bash
#!/usr/bin/env bash
# Idempotent installer for __PROJECT__'s bastion nginx config.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
PROJECT_SHORT="__SHORT__"

if [[ $EUID -ne 0 ]]; then
  echo "Re-run with sudo." >&2; exit 1
fi
[[ -d "$NGINX_CONF_DIR" ]] || { echo "Missing $NGINX_CONF_DIR" >&2; exit 1; }

echo "==> Installing ${PROJECT_SHORT} nginx config"

existing="$(grep -RH 'connection_upgrade' /etc/nginx/ 2>/dev/null \
            | grep -v "/${PROJECT_SHORT}" \
            | grep -v "/00-${PROJECT_SHORT}-maps.conf" || true)"

if [[ -n "$existing" ]]; then
  echo "  - \$connection_upgrade exists, skipping 00-maps."
  rm -f "${NGINX_CONF_DIR}/00-${PROJECT_SHORT}-maps.conf"
else
  install -m 0644 "${SCRIPT_DIR}/00-${PROJECT_SHORT}-maps.conf" "${NGINX_CONF_DIR}/00-${PROJECT_SHORT}-maps.conf"
fi

install -m 0644 "${SCRIPT_DIR}/${PROJECT_SHORT}.conf" "${NGINX_CONF_DIR}/${PROJECT_SHORT}.conf"

echo "==> nginx -t"
if ! nginx -t; then
  echo "Config test failed — files in place, NOT reloaded." >&2
  exit 1
fi

echo "==> systemctl reload nginx"
systemctl reload nginx
echo "Done."
```

Agent: dosyayı yazdıktan sonra `chmod +x` ver.

### 5.4 `.github/workflows/nginx-bastion.yml`

```yaml
name: Deploy Nginx Config

on:
  push:
    branches: [main]
    paths:
      - 'deploy/nginx/**'
      - '.github/workflows/nginx-bastion.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    name: Install __PROJECT__ nginx config on bastion
    runs-on: [self-hosted, bastion]
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Pre-flight nginx -t in /tmp
        run: |
          set -euo pipefail
          TMP="$(mktemp -d)"
          mkdir -p "$TMP/conf.d"
          cp deploy/nginx/__SHORT__.conf "$TMP/conf.d/"
          [[ -f deploy/nginx/00-__SHORT__-maps.conf ]] && cp deploy/nginx/00-__SHORT__-maps.conf "$TMP/conf.d/"
          cat > "$TMP/nginx.conf" <<EOF
          worker_processes 1;
          error_log $TMP/error.log warn;
          pid $TMP/nginx.pid;
          events { worker_connections 64; }
          http { include $TMP/conf.d/*.conf; }
          EOF
          nginx -t -c "$TMP/nginx.conf" -p "$TMP"

      - name: Install + reload
        run: sudo bash deploy/nginx/install.sh

      - name: Smoke test vhosts
        run: |
          for host in __HOST_WEB__ __HOST_API__ __HOST_WS_OR_REMOVE__; do
            STATUS=$(curl -sI -o /dev/null -w "%{http_code}" \
              -H "Host: ${host}" --max-time 5 http://127.0.0.1/ || echo "000")
            echo "Host: ${host} -> HTTP ${STATUS}"
            case "$STATUS" in
              2*|3*|401|404|405) echo "  ok" ;;
              502|503|504) echo "  upstream down"; exit 1 ;;
              000|"") echo "  nginx unreachable"; exit 1 ;;
              *) echo "  unexpected ${STATUS}" ;;
            esac
          done
```

WebSocket yok ise smoke loop'tan `__HOST_WS_OR_REMOVE__` token'ını sil; varsa hostname ile değiştir.

### 5.5 `deploy/nginx/README.md`

Agent kullanıcının değerleriyle aşağıyı doldursun:

```markdown
# __PROJECT__ — bastion nginx config

Drop-in reverse proxy. Owned files: /etc/nginx/conf.d/__SHORT__.conf
(+ optional 00-__SHORT__-maps.conf). nginx.conf untouched.

## Install
    git -C ~/__PROJECT__ pull
    sudo bash ~/__PROJECT__/deploy/nginx/install.sh

## Smoke test
    curl -sI -H 'Host: __HOST_WEB__' http://localhost/ | head -1
    curl -sI -H 'Host: __HOST_API__' http://localhost/ | head -1
    # WS only (skip if not used):
    curl -sI -H 'Host: __HOST_WS__'  http://localhost/ | head -1

## Uninstall
    sudo rm /etc/nginx/conf.d/__SHORT__.conf
    sudo rm -f /etc/nginx/conf.d/00-__SHORT__-maps.conf
    sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Bastion Sudoers (bir kez, manuel)

`/etc/sudoers.d/__SHORT__-nginx-deploy`:

```
gh-runner ALL=(root) NOPASSWD: /usr/bin/bash /home/gh-runner/_work/__PROJECT__/__PROJECT__/deploy/nginx/install.sh
gh-runner ALL=(root) NOPASSWD: /usr/sbin/nginx -t
gh-runner ALL=(root) NOPASSWD: /bin/systemctl reload nginx
```

> Runner kullanıcısının gerçek username'i ve `_work` path'ini doğrula
> (`ssh bastion; whoami; pwd`). Path repo adıyla yinelenir (org/repo /
> `_work/<repo>/<repo>`).

---

## 7. Smoke Test (kurulumdan sonra)

```bash
# 1. Repo'ya commit + push
cd <TARGET_DIR>
git add deploy/nginx .github/workflows/nginx-bastion.yml
git commit -m "ci: bastion nginx config + deploy workflow"
git push origin main

# 2. GitHub Actions
#    Beklenen: nginx-bastion.yml otomatik tetiklenir.
#    Eğer tetiklenmezse, UI'dan "Run workflow" tıkla.

# 3. Bastion'da localhost probe
ssh bastion 'curl -sI -H "Host: __HOST_WEB__" http://localhost/ | head -1'
ssh bastion 'curl -sI -H "Host: __HOST_API__" http://localhost/ | head -1'

# 4. Public probe (Cloudflare tunnel arkasından)
curl -sI https://__HOST_WEB__/ | head -1
curl -sI https://__HOST_API__/ | head -1
```

Beklenen yanıtlar: `200 OK`, `301/302` (yönlendirme), `401` (api auth gerekir),
`404` (path yok). `502/503/504` → upstream pod down. `000` → nginx
yanıt vermiyor (kurulum başarısız).

---

## 8. Troubleshooting

| Belirti | Sebep | Çözüm |
|---|---|---|
| Workflow hiç tetiklenmiyor (0 runs) | Yeni workflow GH cache'inde register olmadı | Repo'da `deploy/nginx/README.md`'ye küçük bir değişiklik push'la → path filter tetiklenir |
| `gh workflow run` → HTTP 500 | GH cache bug'ı, geçici | Workflow dosya adını değiştir + push (re-register). Veya UI'dan "Run workflow" |
| `nginx -t` → "duplicate map directive" | Stock nginx.conf zaten `$connection_upgrade` map'ini tanımlamış | `00-__SHORT__-maps.conf`'u sil veya install.sh otomatik atlasın |
| Vhost 502 Bad Gateway | OCP pod down veya Route hostname yanlış | `oc get pods -n __NAMESPACE__` + `oc get routes -n __NAMESPACE__` |
| Public hostname 522/523 (Cloudflare) | Tunnel target yanlış | Cloudflare tunnel UI → entry → target = bastion IP:80 |
| Path duplication (`/api/v1/api/v1/...`) | NestJS `@Controller('api/v1/foo')` + global prefix | `@Controller('foo')` yap; global prefix `setGlobalPrefix('api/v1')` zaten ekler |
| Self-hosted runner offline | Runner servisi kapalı | `ssh bastion; sudo systemctl status actions-runner.*` |
| Rollout fail, GH log'da hiçbir teşhis yok | `oc rollout status` çıplak çağrılıyor | Aşağıdaki `rollout_with_diag` helper'ı ekle |

### 8.1 Bonus — `deploy-prod.yml` rollout diagnostics

Mevcut bir `deploy-prod.yml`'ye eklenecek helper (rollout başarısız olunca
otomatik `oc describe pod` + 200-line logs + events dökmeli):

```yaml
      - name: Define rollout helpers
        run: |
          cat > /tmp/rollout-helpers.sh <<'BASH'
          set -euo pipefail
          rollout_with_diag() {
            local dep="$1" ns="${NAMESPACE}"
            if oc rollout status deployment/"${dep}" -n "${ns}" --timeout=600s; then
              echo "✅ ${dep} rolled out"
              return 0
            fi
            local exit_code=$?
            echo "❌ Rollout for ${dep} FAILED — diagnostics:"
            oc get deployment/"${dep}" -n "${ns}" -o wide || true
            oc get pods -n "${ns}" -l app="${dep}" -o wide || true
            oc get events -n "${ns}" --sort-by=.lastTimestamp | tail -25 || true
            for p in $(oc get pods -n "${ns}" -l app="${dep}" -o name); do
              echo "── describe ${p} ──"
              oc describe "${p}" -n "${ns}" | tail -60 || true
              echo "── logs ${p} (last 200) ──"
              oc logs "${p}" -n "${ns}" --tail=200 --all-containers=true 2>&1 || true
            done
            return "${exit_code}"
          }
          export -f rollout_with_diag
          BASH

      # Sonraki her deploy step:
      - name: Deploy <service>
        run: |
          source /tmp/rollout-helpers.sh
          oc set image deployment/<svc> <container>=<image>:<tag> -n "$NAMESPACE"
          rollout_with_diag <svc>
```

Timeout 300s → 600s **özellikle önemli**: ilk pod boot'unda DB schema validation
+ ilk cron tick eklenir, 5dk yetmez.

---

## 9. Self-Check (agent için)

Kurulum tamamlandıktan sonra agent şunları doğrulasın:

- [ ] `deploy/nginx/__SHORT__.conf` mevcut, placeholder yok (`grep '__' deploy/nginx/*` boş döner)
- [ ] `deploy/nginx/install.sh` chmod +x
- [ ] `.github/workflows/nginx-bastion.yml` mevcut, yaml syntax valid (`python -c "import yaml; yaml.safe_load(open(...))"`)
- [ ] WS_HOST boşsa: vhost 3 (WS) yok, smoke loop'ta WS host yok, install.sh "vhost live" satırı yok
- [ ] WS_HOST doluysa: tüm 3 vhost var, `$connection_upgrade` map ya stock'ta var ya da `00-...-maps.conf` yazıldı

---

## 10. Bilinen tuzaklar

1. **Yeni workflow ilk push'ta tetiklenmez** — GH cache bug'ı. Workaround:
   - Path filter'a uyan ayrı bir commit at (örn. README bump)
   - veya dosya adını değiştir
   - veya UI'dan manuel "Run workflow"
2. **`actions/checkout@v6` yok** — `v4` veya `v5` kullan (en stabili `v4`).
3. **Türkçe karakterler workflow yaml'da** — bazı GH parser'larda sorun
   çıkarmaz ama ASCII-only kalmak güvenli (yorumları İngilizce yaz).
4. **`paddingBottom: env(safe-area-inset-bottom)`** mobil iOS için kritik —
   bastion nginx'te değil ama eğer frontend BottomNav benzer bir şey
   varsa unutma.
5. **`proxy_ssl_verify off`** mecburi — cluster wildcard cert self-signed
   gözükür nginx için. `proxy_ssl_server_name on` SNI için lazım.
6. **`real_ip_header CF-Connecting-IP`** sadece Cloudflare arkasında
   makul; doğrudan internet expose ediyorsan `set_real_ip_from` aralığını
   sıkılaştır.

---

## 11. Tek satır kullanım (ileri seviye)

Agent context'inde mevcut `tools/scaffold-release-infra.sh` varsa:

```bash
TARGET_DIR=~/work/new-app \
PROJECT=new-app SHORT=newapp NAMESPACE=newapp-prod \
HOST_WEB=newapp.caliptic.com HOST_API=api-newapp.caliptic.com \
HOST_WS= WS_SERVICE= \
CLUSTER_DOMAIN=apps.ocp-sno.caliptic.com \
YES=1 bash tools/scaffold-release-infra.sh
```

---

**Bu dokümanın sonu.** Agent, kullanıcıdan parametre alıp §5'teki 5 dosyayı
hedef projeye yaz, §7'deki smoke test'i çalıştır ve sonucu raporla.
