# Nebula Dominion — Backlog

Oyuncu deneyim sırasına göre fazlandırılmış iş listesi. Her faz, oyuncunun
o anki seviyede etkileşeceği şeyleri kapsar. Sonraki faza geçmeden bir önceki
phase smoke test + verify gereklidir.

Güncel mimari + deploy referansı için bkz: `CLAUDE.md`, `DEPLOYMENT.md`,
`.github/workflows/README.md`.

---

## P1 — Onboarding & ilk 10 dakika (Çağ 1, Lv 1-3)  ✓ TAMAMLANDI

Yeni oyuncunun ilk kayıt-sonrası deneyimi. "Burada ne yapayım, ne tıklayayım,
ne kadar bekleyeyim?" sorularının cevabı.

- [x] **P1.1 Resource overflow uyarısı**. HUD'da mineral/gas/energy cap'in
  %90+ üstüne çıkınca pill rengi kırmızıya döner + ⚠ prefix. (commit 34f6bbb)
  *Dosya: `apps/web/src/components/handoff/atoms.tsx:ResPill`*

- [x] **P1.2 /base scene'de construction progress**. CONSTRUCTING durumdaki
  bina sprite'ı üzerinde "İNŞA · Xd Ys" countdown badge + translucent veil.
  Per-second tick, sadece constructing varken.
  *Dosya: `apps/web/src/components/handoff/RaceWidgets.tsx:BaseField`*

- [x] **P1.3 Wizard adımı: Komuta Üssü Lv 2 yükseltme**. `gates.config.ts`
  barracks/factory/research_lab'i Komuta Üssü Lv 2 ardına koyuyor. Wizard'a
  `upgrade-cmd-center-lv2` adımı eklendi, oyuncu bu bağımlılığı erken görür.
  *Dosya: `apps/web/src/lib/wizard-steps.ts`*

- [x] **P1.4 Kozmik Yankı intro (race-confirm prologue)**. Story bible §1.2
  her ırk için 1 paragraf. `nd-tokens.ts:RaceTheme.kozmikYanki` field +
  `RaceConfirmClient` buildScenes ilk sahne olarak ekledi.
  PROLOGUE_HEADER per ırk (Zerg→GENETİK SIÇRAMA, Otomat→VERİ YENİLENMESİ vs).
  *Dosya: `apps/web/src/lib/nd-tokens.ts`, `apps/web/src/app/race-confirm/RaceConfirmClient.tsx`*

- [x] **P1.5 Bina yükseltme XP grant'i**. (commit 34f6bbb)
  *Dosya: `apps/game-server/src/buildings/buildings.service.ts`*

---

## P2 — Çağ 2'ye tırmanış (Lv 3-10, ilk saat)

Oyuncu XP ekonomisini öğrenir, ilk büyük seviye atlamasını yapar.

- [ ] **P2.1 Daily mission claim XP**. `XP_BASE_AMOUNTS.DAILY_MISSION = 200`
  ama `apps/web/src/app/missions/page.tsx` claim flow'unun backend handler'ı
  awardXp çağırmıyor. Mission ödülüne ek olarak XP grant'i ekle.

- [ ] **P2.2 Research complete XP**. Research nodes complete olunca XP
  almıyor. Research timer + completion handler'ında awardXp çağrısı.
  *Dosya: `apps/game-server/src/research` (varsa) veya yeni endpoint*

- [ ] **P2.3 Achievement system + XP**. `XP_BASE_AMOUNTS.ACHIEVEMENT = 500`
  en yüksek tek tetik. Şu an achievement tracking yok. Önemli milestone'lar
  (Lv 10 first age-up, 5 bina, 10 unit, ilk zafer, vs.) achievement
  table'ına yazılmalı + XP grant'i.

- [ ] **P2.4 PvE/PvP XP source routing**. `game.service.ts:475` zaten
  BATTLE_WIN/LOSS award ediyor ama yeni PVP_WIN/LOSS source'lar var ve
  Çağ 3+ gate'li. Game-end sırasında çağa göre doğru XpSource'a route et.

- [ ] **P2.5 Level-up celebration animasyonu**. Şu an sadece toast.
  Full-screen race-tinted particle burst + level number scale-up + "+1 LVL"
  ribbon. `LevelUpModal.tsx` var ama mature değil.

---

## P3 — Çağ 2 features (Lv 10-18)

İlk büyük çağ geçişi. Story-bible cinematic'leri burada başlar.

- [ ] **P3.1 Çağ geçiş cinematic'i**. Hikaye Kitabı Bölüm 5-9 her ırk için
  her çağ geçişinde 5 sahnelik anlatı set'i tanımlıyor. Şu an `ScrStoryScene`
  iskeleti var, gerçek metinler eksik. Çağ 1→2 ile başla (Zerg: Kovan
  Bilincinin Doğuşu).

- [ ] **P3.2 /shop tab unlock UI**. `shop.consumables` her zaman açık,
  `shop.cosmetics` Lv 5, `shop.premium_skins` Çağ 2, `shop.race_specific_items`
  Çağ 3. Tab başlığında 🔒 + tab içine girince GatedButton modal.

- [ ] **P3.3 Commander unlock animation**. `commander.tier2/3/4` gate'leri
  zaten var. Çağ geçişi anında otomatik unlock modal + portrait reveal,
  story bible §4'teki karakter tanıtım metniyle.

---

## P4 — Çağ 3+ multiplayer layer (Lv 19+)

PvP / lonca / endgame içerikleri buradan başlar.

- [ ] **P4.1 Race-specific Tier 9 (Lv 54) unvanları**. Story bible §2.8:
  Zerg → Yutucu Kraliçe, Otomat → Sonsuz Mantık Demiurge, Canavar →
  Primordial Canavar Tanrı, İnsan → Yutucu Yıldız Varisi, Şeytan → Sonsuz
  Karanlık Hükümdar. `resolveTierName(54, race)` zaten parametre kabul
  ediyor; mapping'i wire et.

- [ ] **P4.2 Battle replay sistemi**. `battle_history` tablosu var ama
  replay yolu yok. /battle-result log dump'tan replay'e dönüşmeli.

- [ ] **P4.3 Achievement gallery**. /profile'a "Başarımlar" tab — kazanılan
  500 XP'lik tetikler görünür hale gelmeli.

---

## P5 — Schema & architecture cleanup (oyuncuya görünmez, kritik)

Geliştirme hızı + sistem stabilitesi için.

- [ ] **P5.1 `tier_progression` ↔ `player_levels` birleştir**. Şu an api
  lazy-sync hack'iyle game-server tablosundan okuyor (`tier.service.ts:
  ensureProgress`). Doğru çözüm: tier_progression'ı view'a çevir
  (`CREATE VIEW ... AS SELECT FROM player_levels`).

- [ ] **P5.2 `buildings_type_enum` source-of-truth**. api 8 değer,
  game-server 12 değer, üretim 20. Game-server domain owner — api'nin
  enum'unu game-server set'iyle re-create.

- [ ] **P5.3 Race enum normalize**. FE 'insan/zerg/otomat/canavar/seytan',
  BE 'human/zerg/automaton/beast/demon'. `FE_TO_BE` çeviri tablosu sıkıntıyı
  saklıyor. Tek normalizeli set'e geç.

- [ ] **P5.4 JWT shape standardize**. api `sub` claim mint ediyor,
  game-server `HttpJwtGuard` `id`/`userId` arıyor. Halihazırda guard'da
  normalize (commit e93c10a) defansif hack. Tüm services'i `sub` okumaya geç.

- [ ] **P5.5 Single-source-of-truth migration runner**. Şu an iki yer:
  `infrastructure/docker/init-db.sql` + game-server typeorm-migrations.
  api migration'ları hiç koşmuyor. Tek runner servisi yaz.

- [ ] **P5.6 Game-server stateful → stateless**. Matchmaking queue Redis'te
  ama in-memory cache de var. Redis'i tek SoT yap.

- [ ] **P5.7 Frontend bundle audit**. Web image 2 GB+ — Next 15 turbo-build,
  RSC payload optimize, dynamic import'larla initial JS küçült.

---

## P6 — CI/CD polish (geliştirme hızı)

- [ ] **P6.1 Disk cleanup cron**. Build cache 6 GB'a yaklaşınca otomatik
  `docker builder prune -af --filter "until=72h"`.

- [ ] **P6.2 Image layer cache export**. BuildKit GitHub Cache backend ya da
  S3 cache. İlk run sonrası tekrar build 1-2 dk.

- [ ] **P6.3 Smoke test paralelize**. Şu an public smoke 3 ardışık curl.

- [ ] **P6.4 PR preview environments**. Her PR için bir preview LXC.
  İleride.

---

## P7 — Production hardening

- [ ] **P7.1 TLS SAN extension** caliptic-bastion cert'ine nebula
  subdomain'lerini ekle. CF Tunnel `noTLSVerify` ile çalışıyor şu an.

- [ ] **P7.2 Promtail + Loki entegrasyonu**. Nebula LXC docker loglarını
  Caliptic monitoring stack'ine ekle.

- [ ] **P7.3 Uptime Kuma probe'ları**. 3 public URL + 1 DB connect.

- [ ] **P7.4 cAdvisor**. Per-container CPU/RAM panel'leri Grafana.

- [ ] **P7.5 MinIO replication / Hetzner Storage Box sync**. README mimari
  hedefi.

- [ ] **P7.6 Backup retention rule (Nebula-specific)**.

- [ ] **P7.7 Sentry release tracking**. Her CI deploy'da Sentry release
  marker + source map upload.

---

## P8 — Test coverage

- [ ] **P8.1 E2E happy path** real-backend. `apps/web/e2e/progression.spec.ts`
  mocked — paralel suite gerçek backend'le.

- [ ] **P8.2 gates.service.ts unit/integration testleri**. Player snapshot
  inject + her gate doğru çözümleniyor mu doğrula.

- [ ] **P8.3 Visual regression**. /base, /base/build, /tier-up, /dev/gates
  ekranları için Playwright screenshot snapshot.

- [ ] **P8.4 Load testing**. game-server tick 1000+ player ölçeklenebilirlik.
  k6 ya da Artillery + 10k user simülasyonu.

---

## P9 — Long-term features

Base game çalıştıktan sonra, en uzun vade:

- [ ] **P9.1 Galaktik harita 3D render**. /map şu an 2D grid; Phaser veya
  Three.js ile 3D.

- [ ] **P9.2 Alliance war sistemi**. Çağ 4+ feature. Lonca üyelerinin
  koordineli sektör savaşı.

- [ ] **P9.3 Sezon mekanikleri**. Story bible §11 "Sezon sonu olayı" — her
  sezon Kozmik Konsey rekabeti, leaderboard reset.

- [ ] **P9.4 Sosyal feature'lar**. Chat global/system/private channel
  mature'leşmesi.

- [ ] **P9.5 VIP / Premium sistem aktivasyonu**. `vip_tiers` zaten DB'de.

---

## İlerleme yöntemi

Her faz tamamlandığında:
1. Local stack'te smoke (curl + browser sanity)
2. Commit + push → CI deploy
3. Prod URL'de eski sorun var mı doğrula
4. BACKLOG'da maddeleri **✓** ile işaretle
5. Sonraki faza geç

Şu an: **P1**.
