# Nebula Dominion

Nebula Dominion, self-hosted altyapı üzerinde çalışan, çok oyunculu uzay strateji oyunudur. 5 ırk, 54 seviye (6 çağ × 9 seviye) ve gerçek zamanlı PvP eşleştirme sistemi içerir.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 + Phaser.js 3.80 + TypeScript + Tailwind CSS |
| Backend | NestJS + Socket.io |
| Veritabanı | PostgreSQL 16 + Patroni (HA) |
| Cache | Redis 7 + Sentinel |
| Object Storage | MinIO (S3 uyumlu) |
| Container | Docker + Docker Swarm |
| Load Balancer | HAProxy + Caddy |
| CDN / DDoS | Cloudflare |
| Monitoring | Prometheus + Grafana + Loki + Alertmanager |
| Hata Takibi | GlitchTip (self-hosted Sentry) |
| CI/CD | Gitea + Drone CI |
| Otomasyon | Ansible |
| Yedekleme | pgBackRest + Restic + Hetzner Storage Box |

## Altyapı

İki sunucudan oluşan Active-Active HA cluster:

| Sunucu | CPU | RAM | Rol |
|--------|-----|-----|-----|
| Server-1 (Primary) | 48 Core | 256 GB | Aktif primary |
| Server-2 (Secondary) | 48 Core | 256 GB | Aktif replica |

- Eşzamanlı kullanıcı kapasitesi: **100.000+**
- Uptime hedefi: **%99.9+**
- Tahmini aylık maliyet: **~$286** (cloud eşdeğeri $5.000–$50.000/ay)

## Oyun Özellikleri

- **5 Irk:** İnsan, Zerg, Otomatlar, Canavarlar, Şeytanlar
- **54 Seviye:** 6 çağ × 9 seviye ilerleme sistemi
- **PvP:** Gerçek zamanlı Socket.io tabanlı eşleştirme (ELO/MMR)
- **Birim Birleştirme:** Benzersiz birleştirme ve mutasyon mekaniği
- **Sektör Savaşları:** Çok oyunculu bölge kontrolü (Çağ 4+)
- **Premium Mağaza:** Kozmetik itemler, premium pass (Çağ 5+)
- **Mobile:** Capacitor ile iOS & Android (Çağ 6)

## Proje Yapısı

```
nebula-dominion/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   ├── api/          # NestJS backend
│   └── game/         # Phaser.js oyun motoru
├── packages/
│   └── shared/       # Ortak tip ve yardımcılar
├── infra/
│   ├── ansible/      # Sunucu otomasyon playbook'ları
│   ├── docker/       # Docker Swarm stack tanımları
│   └── monitoring/   # Prometheus / Grafana config
└── .drone.yml        # CI/CD pipeline
```

## Kurulum

```bash
pnpm install
pnpm dev
```

### Gereksinimler

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

## Başarı Kriterleri (MVP)

| Metrik | Hedef |
|--------|-------|
| Crash rate | < %1 |
| Ortalama oturum süresi | > 20 dakika |
| D1 retention | > %35 |
| D7 retention | > %18 |
| Sunucu uptime | > %99.9 |
| Kapalı beta oyuncusu | 50+ |

## Geliştirme Planı

- **Hafta 1–2:** Monorepo kurulumu, auth sistemi, temel UI, veritabanı altyapısı
- **Hafta 3:** Birim sistemleri (İnsan + Zerg), birleştirme/mutasyon mekaniği
- **Hafta 4:** Savaş sistemi, BattleScene, tier sistemi (Çağ 1)
- **Hafta 5:** Socket.io PvP, hikaye seti, ilk deploy
- **Hafta 6:** Kapalı beta, load test, performans optimizasyonu
- **Ay 2–6:** Çağ 2–6 içerikleri, ittifak sistemi, premium mağaza, mobile uygulama

## Lisans

MIT
