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

## P2 — Çağ 2'ye tırmanış (Lv 3-10, ilk saat)  ✓ TAMAMLANDI

Oyuncu XP ekonomisini öğrenir, ilk büyük seviye atlamasını yapar.

- [x] **P2.1 Daily mission claim XP**. `DailyEngagementService.creditXp`
  helper'ı eklendi; mission claim'i game-server'ın
  `POST /api/progression/award-xp` endpoint'ine fan-out yapıyor.
  MissionType → XpSource haritası: daily/weekly → DAILY_MISSION (200),
  achievement → ACHIEVEMENT (500), story → EVENT (300).
  *Dosya: `apps/api/src/modules/daily-engagement/daily-engagement.service.ts`*

- [x] **P2.2 Research complete XP**. `ResearchStubController.me()` lazy
  state promotion path'inde, ilk completion'da awardXp fan-out fires.
  XpSource: QUEST_MEDIUM (150). Per-entry `xpGranted` flag idempotency
  guard. *Dosya: `apps/api/src/meta/research-stub.controller.ts`*

- [x] **P2.3 Achievement claim wiring** (minimal). AchievementCard'a
  Claim button eklendi — `unlocked && !persistedClaims.has(id)` ise
  "+500 XP Al" çıkıyor, claim sonrası "Alındı" ghost button gösteriliyor.
  /daily-engagement/claim endpoint missionType='achievement' → P2.1
  wiring +500 XP grant'i tetikliyor. (Static unlock flag derivation —
  battles_won / counter'a göre — gelecek iterasyona kaldı.)
  *Dosya: `apps/web/src/app/missions/page.tsx`*

- [x] **P2.4 PvE/PvP XP source routing**. `game.service.ts:awardBattleXp`
  helper'a refactor edildi. Bot vs human filtresi + Çağ 3+ PvP guard:
  age >= 3 → PVP_WIN/LOSS (200/50), aksi halde PVE_WIN/LOSS (150/30).
  Bot user_id'leri (`bot:*` prefix) skip ediliyor.
  *Dosya: `apps/game-server/src/game/game.service.ts`*

- [x] **P2.5 Level-up celebration animasyonu**. LevelUpModal'a 12-particle
  radial burst (CSS-only, `--angle` per-index) + "Lv N → Lv N+1" ribbon
  eklendi. `previousLevel` prop optional, default `newLevel - 1`.
  prefers-reduced-motion guard. *Dosya: `apps/web/src/components/progression/LevelUpModal.tsx`*

---

## P3 — Çağ 2 features (Lv 10-18)  ✓ TAMAMLANDI

İlk büyük çağ geçişi. Story-bible cinematic'leri burada başlar.

- [x] **P3.1 Çağ geçiş cinematic'i** (yapılı + canlı wiring). Mevcut
  `AgeTransitionScreen` component'i `/dev/age-transition`'da
  preview-only idi. `AgeTransitionListener` + `useProgression.onAgeTransition`
  ile gerçek `age_transition` socket event'ine bağlandı. Player Çağ
  ilerlettiğinde otomatik full-screen cinematic + auto-advance 10s.
  RaceThemeProvider içine mount edildi (useNDRace bağımlılığı için).
  Hikaye Kitabı Çağ 1-6 başlık + lore zaten içeride.
  (Story Bible Bölüm 5-9 ırk-spesifik 5-sahne anlatı setleri gelecek
  iterasyona kaldı — şu an genel çağ metinleri kullanılıyor.)
  *Dosya: `apps/web/src/components/progression/AgeTransitionListener.tsx`*

- [x] **P3.2 /shop tab unlock UI**. `TAB_GATE` map'i shop tab'larını
  gates.config.ts entry'lerine bağlıyor: genel→null, etkinlik→shop.cosmetics
  (Lv 5+), vip→shop.premium_skins (Çağ 2+), gecis→shop.race_specific_items
  (Çağ 3+), lonca→guild.create (Çağ 3+). Kilitli tab'ta 🔒 prefix +
  opacity 0.55 + tap toast (primaryHint). `useGates()` ile reactive.
  *Dosya: `apps/web/src/app/shop/page.tsx`*

- [x] **P3.3 Commander unlock animation** (P3.1 cinematic içinde).
  AgeTransitionScreen `newUnlocks` listesi yeni komutan tier'larını
  zaten gösteriyor. Dedicated commander-only modal yerine genel çağ
  cinematic'inin bir parçası — daha az fragmentasyon, tek bir epic moment.
  (Dedicated portrait-reveal modal ile genişletme gelecek iterasyona.)

---

## P4 — Çağ 3+ multiplayer layer (Lv 19+)  ✓ TAMAMLANDI

PvP / lonca / endgame içerikleri buradan başlar.

- [x] **P4.1 Race-specific Tier 9 (Lv 54) unvanları** (zaten yapılı).
  `RACE_TIER9_NAMES` (apps/api/src/user/entities/race.enum.ts) tüm 5 ırka
  string mapping veriyor. `resolveTierName(54, race)` → race-specific isim.
  Frontend `/tier-up` zaten `raceSpecificTierName` field'ı kullanıyor
  (`apps/web/src/app/tier-up/page.tsx:18`). API contract'ında da var
  (`lib/tier-api.ts:25`). End-to-end zaten çalışıyor.

- [x] **P4.2 Battle replay sistemi**. Yeni `/replay/[id]` route
  oluşturuldu — `GET /battles/:id` stub'undan log array'ini çekiyor +
  tur-by-tur scrubbable timeline (oynat/duraklat/jump-to-turn).
  Per-turn winProb + reward summary final card. Profile'daki HistoryRow
  artık link, "İZLE ›" CTA gösteriyor.
  Caveat: api battles stub in-memory (container restart → replay 404).
  Persistent BattleModule landıktan sonra DB-backed log'a swap'lanır,
  UI değişmez.
  *Dosya: `apps/web/src/app/replay/[id]/page.tsx`*

- [x] **P4.3 Achievement gallery in /profile**. /profile başarımlar tab'ı
  iki bölüm: **KAZANILMIŞ BAŞARIMLAR** (canlı claim state, +500 XP
  achievement'lar, `lib/achievements.ts` shared catalog, summary chip'ler
  + per-row Alındı/+500 XP/Kilitli durumu, /missions deep-link) ve
  **SEZON MADALYALARI** (legacy dekoratif, gameplay'i etkilemiyor).
  ACHIEVEMENTS array'i `apps/web/src/lib/achievements.ts`'ye taşındı —
  /missions ve /profile aynı source-of-truth'tan beslenir.
  *Dosya: `apps/web/src/lib/achievements.ts`, `apps/web/src/app/profile/page.tsx`*

---

## P5 — Schema & architecture cleanup (oyuncuya görünmez, kritik)

Geliştirme hızı + sistem stabilitesi için.

- [ ] **P5.1 `tier_progression` ↔ `player_levels` birleştir**. Şu an api
  lazy-sync hack'iyle game-server tablosundan okuyor (`tier.service.ts:
  ensureProgress`). Doğru çözüm: tier_progression'ı view'a çevir
  (`CREATE VIEW ... AS SELECT FROM player_levels`).

- [x] **P5.2 `buildings_type_enum` source-of-truth**. api'nin TS
  BuildingType enum'u game-server'in 16-değerli canonical set'iyle
  birleştirildi (mineral_extractor, gas_refinery, solar_plant, academy,
  factory, spawning_pool, hatchery + 5 Çağ 2 building). Legacy api-only
  değerler (mine, refinery, hangar, research_lab) back-compat için
  korundu. DB enum migration `1779635000000` ile zaten geniş — sadece
  TS hizalama yapıldı, schema değişimi yok.
  *Dosya: `apps/api/src/building/entities/building.entity.ts`*

- [x] **P5.3 Race enum normalize (drift fix)**. `formation-api.ts`
  yanlış kanonik isimler kullanıyordu — `droid`/`creature` (backend hiç
  emit etmez), `automaton`/`beast` yerine. Otomat ve canavar unit'leri
  RACE_MAP'te bulunamadığı için tüm formation API responses'ta 'insan'
  fallback'e düşüyordu (sessiz bug). race-api.ts'in canonical
  `BackendRace` type'ı + corrected RACE_MAP entry'leriyle replace edildi.
  *Dosya: `apps/web/src/lib/formation-api.ts`*

- [x] **P5.4 JWT shape standardize**. `HttpJwtGuard`'daki `id`+`userId`
  defensive mirror'ı kaldırıldı. `progression.controller.ts` ve
  `gates.controller.ts`'teki local `CurrentUser`/`CurrentUserId`
  decorator'ları shared `auth/current-user.decorator.ts` (sub-only)
  imp'iyle replace edildi. Şimdi tek bir read path: `request.user.sub`.
  *Dosya: `apps/game-server/src/auth/http-jwt.guard.ts`,
  `apps/game-server/src/progression/{progression,gates}.controller.ts`*

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
