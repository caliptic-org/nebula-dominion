<!-- v1: initial drop-in deploy via self-hosted bastion runner -->
# Nebula Dominion — bastion nginx config

Drop-in nginx reverse proxy config for the **Caliptic bastion VM** that
sits between the Cloudflare tunnel and the OpenShift cluster.

## Why this exists

The bastion runs **one shared nginx** that proxies traffic for multiple
projects (Caliptic, Nebula, etc.).  Previously the project deploy script
overwrote `/etc/nginx/nginx.conf` wholesale, which stomped on every other
project's config the next time anything reloaded.  This module isolates
Nebula's reverse-proxy entries into their own files under
`/etc/nginx/conf.d/`, leaving the shared `nginx.conf` untouched.

## Files

| File | What it does |
|---|---|
| `nebula-dominion.conf` | 3 server blocks (web / api / game-server) + 3 upstreams. The whole Nebula footprint. |
| `00-nebula-maps.conf` | The `$connection_upgrade` map for socket.io WebSockets. Optional — only install if stock nginx.conf doesn't already define it. |
| `install.sh` | Idempotent installer — copies the files, runs `nginx -t`, reloads. |

## Install

### Otomatik (önerilen) — GitHub Actions

`deploy/nginx/**` altında bir değişiklik `main`'e push edilirse
`.github/workflows/deploy-nginx.yml` workflow'u **bastion'daki
self-hosted runner üzerinde** çalışır ve config'i otomatik kurar.
Manuel tetikleme: repo → Actions → "Deploy Nginx Config (bastion)" →
Run workflow.  `dry_run: true` ile sadece `nginx -t` çalıştırılır,
bastion'a dokunulmaz (güvenli ön kontrol).

### Manuel (acil durum)

```bash
# Bastion VM'sinde
git -C ~/nebula-dominion pull
sudo bash ~/nebula-dominion/deploy/nginx/install.sh
```

Her iki yol da aynı `install.sh`'ı kullanır:

1. `$connection_upgrade` map'i başka yerde tanımlı mı kontrol eder.
   - **Tanımlıysa**: sadece `nebula-dominion.conf`'u copy'ler (stock'ı
     ikiye katlamaz, "duplicate map directive" hatasından kaçınır).
   - **Tanımlı değilse**: `00-nebula-maps.conf`'u da koyar.
2. `nginx -t` (syntax check). Başarısızsa abort eder — nginx reload edilmez.
3. `systemctl reload nginx` — zero-downtime reload.

### Self-hosted runner sudo izni

Runner kullanıcısının (genellikle `gh-runner` veya `actions`) **sudoers
kuralı** olmalı.  `/etc/sudoers.d/nebula-nginx-deploy` dosyasına:

```sudoers
# Allow GitHub Actions runner to install Nebula's nginx config + reload.
# Scope: only the install.sh script and its direct effects.  Other sudo
# powers are NOT granted.
gh-runner ALL=(root) NOPASSWD: /usr/bin/bash /home/gh-runner/_work/nebula-dominion/nebula-dominion/deploy/nginx/install.sh
gh-runner ALL=(root) NOPASSWD: /usr/sbin/nginx -t
gh-runner ALL=(root) NOPASSWD: /bin/systemctl reload nginx
```

> `gh-runner` ve repo path'i kendi kurulumunuza göre değiştirin —
> `whoami` + `pwd` ile runner'ın gerçek user + working dir'ini bulun.

## Uninstall

```bash
sudo rm /etc/nginx/conf.d/nebula-dominion.conf
sudo rm -f /etc/nginx/conf.d/00-nebula-maps.conf
sudo nginx -t && sudo systemctl reload nginx
```

The bastion's other projects are unaffected — the only thing removed is
Nebula's own reverse-proxy entries.

## Sanity checks

```bash
# Verify the 3 vhosts are accepting connections
curl -sI -H 'Host: nebula.caliptic.com'     http://localhost/        | head -1
curl -sI -H 'Host: api-nebula.caliptic.com' http://localhost/        | head -1
curl -sI -H 'Host: game-nebula.caliptic.com' http://localhost/socket.io/ | head -1
```

Each should return `HTTP/1.1 200` (or a redirect from the upstream — not
`502 Bad Gateway` or `404`).

## Wildcard cert / TLS notes

- Cloudflare tunnel terminates the public TLS for `*.caliptic.com`.
- Bastion nginx listens on HTTP (port 80) — internal network, fronted by
  the tunnel, so plaintext between CF and nginx is acceptable.
- nginx → OpenShift HAProxy is HTTPS using the cluster's `*.apps.ocp-sno`
  wildcard cert.  `proxy_ssl_verify off` because the cert is self-signed
  from the bastion's perspective (no public CA chain).

## File-isolation guarantees

Every directive in `nebula-dominion.conf` is scoped:

- **Server blocks** use explicit `server_name nebula.caliptic.com` /
  `api-nebula.caliptic.com` / `game-nebula.caliptic.com`. No `default_server`
  flag, no catch-all `_`. Other projects' hostnames pass through untouched.
- **Upstreams** prefixed `nebula_*` so they don't shadow another project's
  `upstream web { ... }` block.
- **Log files** under `/var/log/nginx/nebula-*.log` — easy to grep, rotate,
  or wipe without touching other apps' logs.

## Updating

Edit `nebula-dominion.conf` in this repo, commit + push, then on bastion:

```bash
git -C ~/nebula-dominion pull
sudo bash ~/nebula-dominion/deploy/nginx/install.sh   # re-runs nginx -t + reload
```

The installer always overwrites Nebula's two files — but **only** those two.
Anything else under `/etc/nginx/` is untouched.
