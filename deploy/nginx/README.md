<!-- v2: rewrite to match the existing bastion ocp-proxy.conf shape -->
# Nebula Dominion — bastion nginx vhost

Mirrors the layout of `/etc/nginx/sites-available/ocp-proxy.conf` already
deployed on the bastion VM — sites-available + sites-enabled symlink,
`listen 443 ssl`, Let's Encrypt cert, SNI-based proxying through the
shared `ocp_ingress` upstream (defined in ocp-proxy.conf, NOT
redefined here).

## Why not conf.d/

The first revision drop-shipped into `/etc/nginx/conf.d/` (Red-Hat
style).  The bastion is Debian-style — `sites-available` + a symlink
into `sites-enabled` is the existing pattern.  Mixing both means a
listen-80 nebula vhost ends up shadowing the listen-443 ocp-proxy
vhost on the same hostname, breaking redirects.  `install.sh` deletes
the legacy `conf.d/` files on first run so you can re-deploy without
touching the bastion manually.

## Install

### Automatic — GitHub Actions
Push to `main` with any change under `deploy/nginx/**`; the
`Deploy Nginx Config` workflow runs `install.sh` on the bastion
self-hosted runner.  Manual trigger via Actions → "Run workflow".

### Manual
```bash
ssh bastion
git -C ~/nebula-dominion pull
sudo bash ~/nebula-dominion/deploy/nginx/install.sh
```

`install.sh` is idempotent:

1. Removes any leftover `/etc/nginx/conf.d/{nebula-dominion,00-nebula-maps}.conf`
   from the old revision (no manual cleanup needed).
2. Copies `nebula-dominion.conf` to `/etc/nginx/sites-available/`.
3. Symlinks it into `/etc/nginx/sites-enabled/`.
4. `nginx -t` — aborts before reload if anything is broken.
5. `systemctl reload nginx` — zero-downtime.

## Cloudflare tunnel

The bastion sits behind a Cloudflare tunnel.  The Service field for each
Nebula public hostname must point at **the bastion's :443**, identical
to how `ocp.caliptic.com` / `app.caliptic.com` are configured:

| Public Hostname | Service |
|---|---|
| `nebula.caliptic.com` | `https://<BASTION_IP>:443` |
| `api-nebula.caliptic.com` | `https://<BASTION_IP>:443` |
| `game-nebula.caliptic.com` | `https://<BASTION_IP>:443` |

> ⚠ `https://10.10.10.50:443` (OCP API IP) is **wrong** — that target
> sends traffic into OCP HAProxy, which only knows the route hostnames
> like `nebula-web-nebula-prod.apps.ocp-sno.caliptic.com` and redirects
> the unknown public Host to the console.

## SSL certificate

The vhost reuses `/etc/letsencrypt/live/caliptic-bastion/{fullchain,privkey}.pem`
— the same cert ocp-proxy.conf uses.  It must already have SANs for the
three Nebula hostnames.  Renewal (or initial SAN addition) is outside
this repo's scope — handle it with certbot on the bastion.

## Self-hosted runner sudoers

`/etc/sudoers.d/nebula-nginx-deploy`:

```
gh-runner ALL=(root) NOPASSWD: /usr/bin/bash /home/gh-runner/_work/nebula-dominion/nebula-dominion/deploy/nginx/install.sh
gh-runner ALL=(root) NOPASSWD: /usr/sbin/nginx -t
gh-runner ALL=(root) NOPASSWD: /bin/systemctl reload nginx
```

Replace `gh-runner` and the `_work` path with your runner's username
and clone location.

## Smoke test

After deploy:

```bash
# Inside bastion — exercise the local listener directly
curl -sk --resolve "nebula.caliptic.com:443:127.0.0.1" \
     https://nebula.caliptic.com/ | head

# From your laptop — exercise the full Cloudflare → tunnel → bastion path
curl -sI https://nebula.caliptic.com/
```

`2xx`, `3xx` (Next.js redirects to `/base`), `401` (api auth) all
count as healthy.  `5xx` → OCP route or upstream pod is unhealthy.
Tunnel routing problem → you'll see a redirect to `ocp.caliptic.com`
(the OCP console catch-all).

## Uninstall

```bash
sudo rm /etc/nginx/sites-enabled/nebula-dominion.conf
sudo rm /etc/nginx/sites-available/nebula-dominion.conf
sudo nginx -t && sudo systemctl reload nginx
```

`ocp-proxy.conf` and any other project's vhost are untouched.
