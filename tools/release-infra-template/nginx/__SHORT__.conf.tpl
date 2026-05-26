# /etc/nginx/conf.d/__SHORT__.conf
#
# __PROJECT__ — bastion nginx reverse proxy config (drop-in).
#
# This file is the ONLY nginx config __PROJECT__ owns on the bastion VM.
# It does NOT modify nginx.conf, the default server block, or any other
# project's config — drop it into /etc/nginx/conf.d/ and reload, no
# conflicts.
#
# Architecture:
#
#   Cloudflare tunnel  →  bastion nginx  →  OpenShift HAProxy
#   ─────────────────     ─────────────     ────────────────
#   __HOST_WEB__         :443 here         __SHORT__-web-__NAMESPACE__
#                                              .__CLUSTER_DOMAIN__
#
# ── Deploy ─────────────────────────────────────────────────────────────────
#
#   sudo cp deploy/nginx/__SHORT__.conf /etc/nginx/conf.d/
#   sudo nginx -t
#   sudo systemctl reload nginx
#
# ── Isolation guarantees ───────────────────────────────────────────────────
#
# 1. Every server block uses an explicit `server_name` — no catch-all
#    or default-server flag — so this file CANNOT swallow traffic destined
#    for another project's hostname.
# 2. Upstreams have a unique `__SHORT___*` prefix.
# 3. Log files live under /var/log/nginx/__SHORT__-*.log.

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

# ── __HOST_WEB__ — web app ─────────────────────────────────────────────────

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

        proxy_set_header   Host            __SHORT__-web-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_set_header   X-Forwarded-Host   $host;
        proxy_set_header   X-Forwarded-Proto  https;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   Connection         "";

        proxy_buffering    off;
        proxy_read_timeout 90s;
    }
}

# ── __HOST_API__ — REST API ────────────────────────────────────────────────

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

        proxy_set_header   Host            __SHORT__-api-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_set_header   X-Forwarded-Host   $host;
        proxy_set_header   X-Forwarded-Proto  https;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   Connection         "";

        proxy_read_timeout 60s;
    }
}

# __WS_SERVER_BEGIN__
# ── __HOST_WS__ — WebSocket / realtime service ─────────────────────────────

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

        proxy_set_header   Host            __SHORT__-__WS_SERVICE__-__NAMESPACE__.__CLUSTER_DOMAIN__;
        proxy_set_header   X-Forwarded-Host   $host;
        proxy_set_header   X-Forwarded-Proto  https;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Real-IP          $remote_addr;

        proxy_read_timeout  5m;
        proxy_send_timeout  5m;
    }
}
# __WS_SERVER_END__
