# Nebula Dominion — Monitoring Stack

Full observability stack: Prometheus + Grafana + Loki + Alertmanager + GlitchTip.

## Architecture

```
Internet → Cloudflare → HAProxy
                             ↓
              ┌──────────────────────────────┐
              │  monitoring overlay network  │
              │                              │
              │  Prometheus ← node-exporter  │
              │      ↑       ← cadvisor      │
              │      ↑       ← postgres-exp  │
              │      ↑       ← redis-exp     │
              │      ↑       ← app /metrics  │
              │      ↓                       │
              │  Alertmanager → Slack + SMS  │
              │                              │
              │  Grafana (port 3001)         │
              │      ↑── Prometheus          │
              │      ↑── Loki               │
              │                              │
              │  Loki ← Promtail (global)    │
              └──────────────────────────────┘
              
              GlitchTip (port 8090) — error tracking
```

## Components

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Prometheus | prom/prometheus:v2.51.2 | 9090 | Metrics collection & storage |
| Grafana | grafana/grafana:10.4.2 | 3001 | Visualization & dashboards |
| Loki | grafana/loki:2.9.6 | 3100 | Log aggregation |
| Promtail | grafana/promtail:2.9.6 | — | Log shipping (runs on all nodes) |
| Alertmanager | prom/alertmanager:v0.27.0 | 9093 | Alert routing |
| Node Exporter | prom/node-exporter:v1.7.0 | 9100 | Host metrics |
| cAdvisor | gcr.io/cadvisor/cadvisor:v0.49.1 | 8080 | Container metrics |
| Postgres Exporter | prometheuscommunity/postgres-exporter:v0.15.0 | 9187 | PostgreSQL metrics |
| Redis Exporter | oliver006/redis_exporter:v1.58.0 | 9121 | Redis metrics |
| GlitchTip | glitchtip/glitchtip:v4.0 | 8090 | Error tracking (self-hosted Sentry) |

## Quick Start

### 1. Configure environment

```bash
cd monitoring
cp .env.example .env
# Edit .env with your values (Slack webhook, passwords, etc.)
```

### 2. Deploy monitoring stack

```bash
# Deploy on Docker Swarm
docker stack deploy -c docker-compose.yml monitoring --with-registry-auth

# Verify all services are up
docker stack services monitoring
```

### 3. Deploy GlitchTip

```bash
# First run: apply migrations
docker stack deploy -c glitchtip/docker-compose.yml glitchtip

# Create superuser (run once)
docker exec -it $(docker ps -q -f name=glitchtip_glitchtip-web) python manage.py createsuperuser
```

### 4. Access services

| Service | URL | Default credentials |
|---------|-----|---------------------|
| Grafana | http://SERVER_IP:3001 | admin / (set in .env) |
| Alertmanager | http://SERVER_IP:9093 | — |
| GlitchTip | http://SERVER_IP:8090 | (created via createsuperuser) |
| Prometheus | http://SERVER_IP:9090 | — |

## Dashboards

Five dashboards are auto-provisioned in the **Nebula Dominion** folder:

| Dashboard | UID | Purpose |
|-----------|-----|---------|
| System Overview | `system-overview` | CPU, memory, disk, network per node |
| Application Performance | `app-performance` | API latency, error rate, throughput, logs |
| Database | `database` | PostgreSQL replica lag, connections, Redis metrics |
| Game Metrics | `game-metrics` | Active players, battles, resource economy, level progression |
| Business Metrics | `business-metrics` | DAU, MAU, retention (D1/D7), conversion funnel |

## Alert Rules

### Node / Infrastructure (`node-alerts.yml`)
- `HighCPUWarning` — CPU > 80% for 5m → Slack warning
- `CriticalCPU` — CPU > 95% for 5m → Slack + SMS
- `DiskUsageWarning` — Disk > 85% → Slack warning
- `DiskUsageCritical` — Disk > 95% → Slack + SMS
- `DiskWillFillIn4Hours` — Predicted full in 4h → warning
- `HighMemoryWarning` / `HighMemoryCritical`
- `NodeDown` — Node exporter unreachable → critical + page

### Application (`app-alerts.yml`)
- `APIErrorRateWarning` — 5xx > 1% for 2m → Slack warning
- `APIErrorRateCritical` — 5xx > 5% for 2m → Slack + SMS + page
- `APIHighLatencyWarning` — p95 > 1s
- `APIHighLatencyCritical` — p99 > 3s
- `ServiceDown` — Service instance unreachable → critical + page
- `AllReplicasDown` — Zero instances up → critical + page

### Database (`database-alerts.yml`)
- `PostgresReplicaLagWarning` — Lag > 10s → DBA Slack warning
- `PostgresReplicaLagCritical` — Lag > 60s → DBA Slack + SMS + page
- `PostgresDown` — pg_up == 0 → critical + page
- `PostgresConnectionsHigh` / `PostgresConnectionsCritical`
- `PostgresLongRunningQuery` — Query running > 5m
- `RedisDown` — critical + page
- `RedisHighMemory` / `RedisHighMemoryCritical`
- `RedisMasterLinkDown` — Replication broken → critical + page

## Alertmanager Routing

| Severity | Receivers | Repeat |
|----------|-----------|--------|
| `page: true` | Slack #nebula-critical + SMS | 15m |
| `critical` | Slack #nebula-critical + SMS | 30m |
| `warning` | Slack #nebula-warnings | 6h |
| `info` | Slack #nebula-info | — |
| `team: dba` | Slack #nebula-dba (+ routes above) | — |

## NestJS Application Metrics

Add `@willsoto/nestjs-prometheus` to your API and game services to expose `/metrics`:

```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
})
export class AppModule {}
```

Custom game metrics to implement in NestJS:
- `nebula_active_players_total` — Gauge
- `nebula_battles_active_total` — Gauge
- `nebula_battles_started_total` / `nebula_battles_completed_total` — Counter
- `nebula_websocket_connections_active` — Gauge
- `nebula_resources_produced_total{resource_type}` — Counter
- `nebula_units_trained_total{unit_type}` — Counter
- `nebula_player_levelups_total` — Counter
- `nebula_daily_active_users` / `nebula_monthly_active_users` — Gauge
- `nebula_user_registrations_total` / `nebula_user_logins_total` — Counter
- `nebula_session_duration_seconds_avg` — Gauge
- `nebula_retention_d1_percent` / `nebula_retention_d7_percent` — Gauge

## GlitchTip Integration

Add to your NestJS apps:

```bash
pnpm add @sentry/node @sentry/tracing
```

```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'http://YOUR_DSN@glitchtip.nebula.internal:8090/1',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

For Next.js frontend, use the Sentry Next.js SDK pointing at your GlitchTip DSN.

## Reload configuration (without restart)

```bash
# Reload Prometheus config
curl -X POST http://SERVER_IP:9090/-/reload

# Reload Alertmanager config
curl -X POST http://SERVER_IP:9093/-/reload
```
