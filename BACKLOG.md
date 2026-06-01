# Nebula Dominion — Backlog

Yapılacak iş listesi. Etki / efor / risk düzeyine göre sıralanmış, her madde
**neden** ve **nereden başlanır** notuyla birlikte. Tamamlananlar
`CHANGELOG.md` veya commit history'sinde — burada sadece açık iş.

Güncel mimari + deploy referansı için bkz: `CLAUDE.md`, `DEPLOYMENT.md`,
`.github/workflows/README.md`.

---

## A — Gameplay loop kapatma (yüksek etki, orta efor)

Şu anki XP ekonomisinin tutarsız tarafları. Player aksiyon → XP → seviye
döngüsü her aksiyon için aynı kalmalı.

- [ ] **Bina yükseltme XP grant'i**. `BuildingsService.completeOverdueConstructions`
  hem yeni inşaata hem yükseltmeye XP veriyor (status `CONSTRUCTING → ACTIVE` aynı path).
  Ama UPGRADE flow'unun ayrı bir path'i (`/buildings/:id/upgrade` direkt POST)
  status değiştirmiyor — `level += 1` yapıp anında ACTIVE bırakıyor. Direkt
  `progression.awardXp({source: CONSTRUCTION})` çağrısı upgrade endpoint'ine de
  konulmalı. *Dosya: `apps/game-server/src/buildings/buildings.service.ts:upgradeBuilding`*

- [ ] **Daily mission claim XP**. `XP_BASE_AMOUNTS.DAILY_MISSION = 200` ama
  hangi endpoint bunu fire ediyor belirsiz. `apps/web/src/app/missions/page.tsx`
  claim flow'unu trace edip game-server'ın eşleşen handler'ında `awardXp` çağrısı
  var mı doğrula; yoksa ekle.

- [ ] **Achievement system XP**. `XP_BASE_AMOUNTS.ACHIEVEMENT = 500` (en yüksek
  tek tetik). Şu an achievement tracking sistemi yok — sadece config var.
  Önemli milestone'larda (Lv 10, Lv 19, Lv 28, 5 bina inşa, 10 birim eğit, ilk
  PvE zafer) achievement kaydı + XP grant'i.

- [ ] **Research complete XP**. Research nodes complete olunca XP almalı.
  `apps/web/src/app/research/page.tsx` `onResearch` çağrılıyor ama backend tarafı
  net değil — research timer + completion handler nerede?

- [ ] **PvP zafer/yenilgi XP**. Backend `game.service.ts:475` zaten `BATTLE_WIN/LOSS`
  XpSource ile award ediyor — ama yeni `PVP_WIN/LOSS` sources var ve Çağ 3+ gate'li.
  Game-end sırasında çağ kontrol edip doğru XpSource seç.

---

## B — Story-bible alignment (orta etki, orta efor)

`Hikaye Kitabı v1.0` 54-level lore'unu UI'a daha sadık taşımak. Şu an level
isimleri (`Tohum / Filiz / Çekirdek...`) backend `TIER_LEVELS_BY_LEVEL`'de var
ama race-spesifik final unvanlar eksik.

- [ ] **Race-spesifik Tier 9 (Lv 54) unvanları**. `2.8` bölümde belirtilmiş:
  *Zerg → Yutucu Kraliçe, Otomat → Sonsuz Mantık Demiurge, Canavar → Primordial
  Canavar Tanrı, İnsan → Yutucu Yıldız Varisi, Şeytan → Sonsuz Karanlık Hükümdar*.
  `resolveTierName(54, race)` zaten parametre kabul ediyor ama mapping'i wire
  etmek lazım. *Dosya: `apps/api/src/modules/tier/tier-table.ts`*

- [ ] **Çağ geçiş cinematic'ler**. `Bölüm 5-9` her ırk için her çağ geçişinde
  5 sahnelik anlatı set'i tanımlıyor. Şu an sadece `ScrStoryScene` boilerplate
  var — gerçek metinleri (`5.1 Çağ 1→2 Kovan Bilincinin Doğuşu` vb.) story
  bible'dan ekle.

- [ ] **Karakter unlock animasyonları**. Tier 2/3/4'te yeni komutanlar
  açılıyor (`commander.tier2/3/4` gate'leri zaten var). Geçiş anında bir
  unlock modal + portrait reveal yok — sadece `/commanders` listede beliriyor.

- [ ] **Kozmik Yankı opening**. `Bölüm 1.2` her ırk için farklı `Kozmik Yankı`
  yorumu (Zerg: Genetik Sıçrama, Otomat: Veri Yenilenmesi, vs.). Race-select
  sonrası bu metin hiç yerde gösterilmiyor — `/race-confirm` veya yeni hesap
  ilk login'inde 1 sahnelik intro fırsatı.

---

## C — Schema drift cleanup (yüksek etki, yüksek efor, yüksek risk)

İki backend (api + game-server) farklı varsayımlarla çalışıyor. Bu sezon
boyunca patch'lendi ama "doğru" çözüm refactor.

- [ ] **`tier_progression` ↔ `player_levels` birleştirilmesi**. Şu an api'nin
  `tier_progression` tablosu lazy-sync ile `player_levels`'tan okuyor
  (`tier.service.ts:ensureProgress`). Doğru çözüm: tek bir kaynak seç.
  Önerilen yaklaşım:
  - `tier_progression`'ı view'a çevir (`CREATE VIEW tier_progression AS SELECT
    user_id, current_level, current_age, ... FROM player_levels`)
  - api'nin `TierProgress` entity'sini view'a map et (`@ViewEntity`)
  - Yazma yolunu game-server'ın `progression.service.awardXp`'ında bırak
  - Lazy-sync hack'ini sök

- [ ] **`buildings_type_enum` source-of-truth**. api InitialSchema 8 değer,
  game-server InitialSchema 12 değer, üretim 20 (overlap dahil). Game-server
  domain owner — api'nin tüm building enum referansları game-server'a göre
  hizalanmalı. Migration: api'nin enum'unu drop + game-server set'iyle
  re-create. **Risk**: mevcut `player_buildings.type` değerleri etkilenir
  (ama hepsi zaten game-server set'inden, no migration data needed).

- [ ] **Race enum normalize**. Frontend `insan/zerg/otomat/canavar/seytan` (TR),
  backend `human/zerg/automaton/beast/demon` (EN). Şu an `lib/race-api.ts`
  `FE_TO_BE` çeviri tablosu sıkıntıyı saklıyor ama tutarsız. Karar:
  - **Seçenek A** (önerilen): Backend enum'u TR'ye çevir. Domain TR; user-
    facing katman tüm uçlarda TR.
  - **Seçenek B**: Frontend tokens'ı EN'e çevir. Daha tipik ama Turkish
    branded UI'ya konsept kayması.

- [ ] **JWT shape standardize**. api `sub` claim'de userId mint ediyor,
  game-server `HttpJwtGuard` `id`/`userId` arıyor. Halihazırda guard'da
  normalize (commit `e93c10a`) ama bu defansif hack. Tüm services'in `sub`
  okumasına geç, normalize katmanını kaldır.

---

## D — Frontend playability (yüksek etki, düşük-orta efor)

UI'da geri bildirim ve detay eksiklikleri.

- [ ] **Level-up animasyonu**. Şu an sadece toast. `LevelUpModal.tsx` var ama
  full-screen celebration animasyonu yok — race-tinted particle burst, level
  number scale-up, "+1 LVL" ribbon.

- [ ] **Resource overflow uyarısı**. `mineral_cap`, `gas_cap`, `energy_cap`
  yaklaşınca (>90%) HUD pill'i kırmızıya çevir + toast. Şu an cap'e değse
  bile uyarı yok, depolama dolu kaynak boşa gidiyor.

- [ ] **Bina inşaat ilerlemesi /base scene'de**. /base ekranında bir bina
  CONSTRUCTING ise üstünde countdown timer / progress bar gösterilmeli.
  Şu an sadece /base/build kartında countdown var, ana scene'de yok.

- [ ] **Battle replay sistemi**. `battle_history` tablosu var ama eski savaşları
  replay etme yolu yok. `/battle-result` log dump'tan replay'e dönüşmeli.

- [ ] **Achievement gallery**. `/profile`'a "Başarımlar" tab — kazanılan
  500 XP'lik tetikler nelerdir görünür hale gelmeli.

- [ ] **/shop tab unlock UI**. `shop.consumables` her zaman açık, `shop.cosmetics`
  Lv 5, `shop.premium_skins` Çağ 2, `shop.race_specific_items` Çağ 3.
  Tab başlığında 🔒 + tıklayınca tab içine girilince GatedButton modal'ı.

- [ ] **Tutorial flow'u gate'lere bağla**. Yeni hesap tutorial'ı (`/tutorial`)
  şu an manuel adımlar — gate state'iyle senkronize değil. `wizard-steps.ts`
  `useGates()`'i okuyup "şu an açık olan ilk gate'in görevini ver"
  pattern'ine geç.

---

## E — Production hardening (orta etki, düşük efor)

`DEPLOYMENT.md §11` "pending" listesinden:

- [ ] **TLS SAN extension** — caliptic-bastion cert'ine `nebula.caliptic.com
  + api-nebula.caliptic.com + game-nebula.caliptic.com` ekle. Şu an CF Tunnel
  `noTLSVerify` ile çalışıyor — origin'de proper TLS yok. Düşük öncelik
  (saldırı yüzeyi yok) ama "doğru" iş.

- [ ] **Promtail + Loki entegrasyonu**. Nebula LXC docker loglarını Caliptic
  monitoring stack'ine ekle. Şu an `docker compose logs` yapmak için SSH gerek.

- [ ] **Uptime Kuma probe'ları**. 3 public URL için HTTP monitor (web/health,
  api/docs-json, game-server/api/health/live). 2 dakikalık iş.

- [ ] **cAdvisor**. Per-container CPU/RAM panel'leri Grafana'ya.

- [ ] **MinIO replication / Hetzner Storage Box sync**. README mimari hedefi
  ama implement edilmemiş — şu an yerel docker volume, replication yok.

- [ ] **Backup retention rule (Nebula-specific)**. pgBackRest global retention
  Nebula DB'yi de kapsıyor ama Nebula-özel retention politikası yok.

- [ ] **Sentry release tracking**. Her CI deploy'da Sentry'e release marker
  gönder + source map upload. Şu an Sentry DSN var ama release context yok.

---

## F — CI/CD polish (düşük etki, düşük efor)

Gate framework + deploy çalışıyor. Daha temizleme:

- [ ] **Disk cleanup workflow**. Build cache 6 GB'a yaklaşınca otomatik
  `docker builder prune -af --filter "until=72h"`. Manuel olarak yapıldı
  bir kez (zincir #2 fail'iyle); cron'a koy.

- [ ] **Image layer cache export**. BuildKit GitHub Cache backend ya da S3
  cache. İlk run sonrası tekrar build edilen image'lar 1-2 dk'da bitmeli.

- [ ] **Smoke test paralelize**. Şu an public smoke 3 ardışık curl —
  paralel job'a çevir.

- [ ] **PR preview environments**. Her PR için bir preview LXC otomatik
  oluşturmak ileride. Şimdilik defer.

---

## G — Architecture & infra debt

Yapı seviyesi temizlikler. Acil değil ama "doğru" iş:

- [ ] **Single-source-of-truth migration runner**. Şu an iki yer:
  `infrastructure/docker/init-db.sql` (postgres init) + `apps/game-server/
  typeorm-migrations/` (game-server boot). api'nin migration'ları hiç koşmuyor.
  Çözüm: tek bir migration runner servisi yaz, init.sql'i kaldır.

- [ ] **Service mesh hazırlığı**. Şu an api + game-server arası HTTP yok —
  ortak DB üzerinden geçiyorlar. PvP'de matchmaking için game-server'ın
  api'ye sorgu atması gerekecek. mTLS / service discovery sistemi planla.

- [ ] **Game-server stateful → stateless migration**. Matchmaking queue
  Redis'te ama in-memory cache de var. Bir game-server pod'unu öldürünce
  state'in tamamı kaybolur. Redis'i tek SoT yap.

- [ ] **Frontend bundle audit**. Web image 2 GB+ — Next.js standalone build
  + assets. Next 15 turbo-build deneyimi, RSC payload'ı optimize, dynamic
  import'larla initial JS'i küçült.

---

## H — Test coverage

Otomatik test'lerin durumu mütevazı. Ekleyebileceklerimiz:

- [ ] **E2E happy path** (login → race-select → build → train → level up
  → /tier-up gösterimi). `apps/web/e2e/progression.spec.ts` mocked — gerçek
  backend'le bir paralel suite yaz.

- [ ] **Backend integration tests**. `gates.service.ts` çıktısı için
  unit/integration test set'i. Player snapshot'lar inject edip her gate
  doğru çözümleniyor mu doğrula.

- [ ] **Visual regression**. /base, /base/build, /tier-up, /dev/gates
  ekranları için Playwright screenshot snapshot — büyük UI değişikliklerinde
  fark görünür.

- [ ] **Load testing**. game-server tick'in 1000+ player için ölçeklenebilirliği.
  k6 ya da Artillery + 10k user simülasyonu.

---

## I — Yeni özellikler (en uzun vade)

Bunlar "nice to have" — base game çalıştıktan sonra:

- [ ] **Galaktik harita gerçek render**. /map şu an 2D grid; Hikaye Kitabı
  §10'da sistemler, sektörler, kozmik konsey detayları var. Phaser veya
  Three.js ile 3D harita.

- [ ] **Alliance war sistem**. Çağ 4+ feature. Lonca üyelerinin koordineli
  sektör savaşı.

- [ ] **Sezon mekanikleri**. Story bible §11 "Sezon sonu olayı" var —
  her sezon Kozmik Konsey rekabeti, leaderboard reset, ödüller.

- [ ] **Sosyal feature'lar**. Chat şu an alliance-only; global, system,
  private channel'lar wire ama UI mature değil.

- [ ] **VIP / Premium sistem**. `vip_tiers` zaten DB'de + Sentry tracking
  var. Wire edilmemiş aksiyonlar mevcut.

---

## Öncelik sıralaması (önerim)

Eğer 1 sprint daha varsa:

1. **A** kategorisindeki XP grant gaplerini kapat (oyunun çekirdek geri
   bildirim döngüsü).
2. **F.disk-cleanup** ve **F.cache** — CI hızlansın.
3. **D.resource-overflow** ve **D.bina-construction-progress** — playability
   for the next 10 minutes of new-player gameplay.
4. **C.schema-drift** — kodun temiz kalması için.
5. **B.story-bible** — UX zenginlik için.

`E`, `G`, `H`, `I` daha uzun vade.
