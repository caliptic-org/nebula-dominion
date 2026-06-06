# Nebula Dominion — Öncelikli Düzeltme Listesi

## 🔴 BLOCKER (oyun-bozucu, hemen)

### Güvenlik / Auth

1. **daily-engagement/claim'de client-supplied reward'ı kaldır** — `apps/api/src/modules/daily-engagement/daily-engagement.controller.ts` — İstemcinin gönderdiği `reward.xp/gold/gems` doğrudan kabul ediliyor; rastgele `missionId` stringleriyle sınırsız XP bankacılığı yapılabiliyor (lv1 → lv14, Tohum → İç Sistem, 31 çağrıda). — DTO'dan `reward` alanını çıkar, server-side mission kataloğundan kanonik ödülü çöz, bilinmeyen missionId'leri reddet, per-day ceiling + audit log ekle.

2. **game-server progression IDOR — dist src ile uyumsuz** — `apps/game-server/dist/progression/progression.controller.js:29-43` — Source'taki `assertOwn(userId, currentUserId)` derlenmiş dist'te yok; herhangi bir authed kullanıcı `GET /api/progression/<otherUuid>` ile başkasının progression'ını okuyabiliyor, `advance-age` de etkilenir. — `pnpm --filter game-server build` çalıştır + container'ı yeniden deploy et; CI'a `dist diff src` adımı ekle.

3. **CommandersModule deploy edilmemiş** — `apps/game-server/src/commanders/commanders.controller.ts` — `dist/commanders/` klasörü yok; `GET /api/commanders`, `POST /api/commanders/:id/activate` hep 404. Komutan roster + aktif etme akışı tamamen kırık. — `CommandersModule`'ü `apps/game-server/src/app.module.ts` imports'una ekle, rebuild + redeploy, boot loglarında "Mapped {/commanders}" satırlarını doğrula.

4. **Tier 4. komutan unlock akışı yok** — `apps/game-server/src/progression/gates.config.ts:112` + `apps/game-server/src/commanders/commanders.service.ts:265` — Gate (`age min: 4`) tanımlı, `unlock()` metodu mevcut, ama hiçbir yerden çağrılmıyor. Tier 4-5 komutanlar (kovacs, morgath, lokhode, azurath, kthala, korova) `unlockedAt=NULL` olarak ebediyen kilitli kalıyor; formation ekranı kilitli olanları filtreliyor → asla deploy edilemiyorlar. — `ProgressionGateway`'de `era_transition` olayını dinleyerek `newAge >= 4` için ilgili tier-4 komutanı `CommandersService.unlock(userId, commanderId)` ile aç. Tier 5 için de aynısı.

### Çoklu-Irk Kit Eksikliği

5. **AUTOMATON/BEAST/DEMON ırklarının hiç birimi yok** — `apps/game-server/src/units/constants/race-configs.constants.ts:74-101` — `RACE_BONUSES` ve `Race` enum'da bu üç ırk var, oyuncu seçebiliyor; ama `UnitType` enum'unda otomat/canavar/seytan girişi sıfır. `getUnitConfigsByRace()` `[]` dönüyor → POST `/units/train` "Unknown unit type" 400 atıyor. Oyuncu hiç birim eğitemiyor, PvP'ye çıkarsa 1.0 nötr çarpanla insan/zerg/otomat'a karşı çıkıyor. — `nd-tokens.ts:279-286,333-340,380-387` referansıyla 3×6 birimi (`SENTINEL`, `DRONE_OPERATOR`, ..., `HOWLER`, `IMP`, vs.) `UnitType` + `UNIT_CONFIGS`'a ekle, `MERGE_RECIPES`'a promosyon zincirlerini koy, alternatif olarak balans tamamlanana dek bu ırkları `/users/select-race` whitelist'inden çıkar.

### Ekonomi Sömürüleri

6. **Bina upgrade'in max level/cost/duration'ı yok — sınırsız bedava upgrade** — `apps/api/src/building/building.controller.ts` upgrade method — `PATCH /api/v1/buildings/:id/upgrade` 68 kez peş peşe çalıştırıldığında 36 saniyede Lv 68'e ulaşıldı, hiç kaynak düşmedi, queue yok, cap yok. — Bu legacy api endpoint'ini ya kaldır (game-server'a yönlendir) ya da max-level sabiti + scale eden kaynak maliyeti + UpgradeQueue entity'si ekle.

### Wire-Format Kırıklıkları

7. **VIP plan satın alma 422 — `vip_vip-monthly` SKU'su yok** — `apps/web/src/app/shop/page.tsx:609` + `migration 004_shop_and_premium.sql` — Frontend `sku: vip_${p.id}` üretiyor (`vip_vip-monthly` vb.); shop_items tablosunda bu SKU'lar seed edilmemiş → tüm VIP yükseltme tıklamaları "İtem bulunamadı" ile düşüyor. — Ya migration ekleyip premium_pass kategorisinde bu SKU'ları seed et (`{vip_days: 30}` content'iyle) + shop.service'te `premium_pass` kategorisini VIP upgrade handler'ına yönlendir, ya da `POST /api/v1/vip/upgrade` ayrı endpoint aç.

8. **`/api/v1/vip/status` response wire-format mismatch** — `apps/api/src/modules/vip/vip.controller.ts:19` + `apps/web/src/hooks/useVip.ts` — Backend `{vipLevel, cumulativeSpendUsd}` (camelCase) dönüyor, FE `{vip_level, current_xp, next_level_xp, ...}` (snake_case) bekliyor; tüm VIP progress bar'lar `currentXp = undefined` ile çalışıyor. — Controller'da DTO mapper kur: spend threshold'larından XP eşdeğeri hesapla, snake_case'e çevir, `daily_claimed_at` için `lastDailyClaimAt` kullan.

### Progresyon XP Curve Çatallanması

9. **api ve game-server XP curve'leri farklı** — `apps/api/src/modules/tier/tier-table.ts:102` (`100*L²`) vs `apps/game-server/src/progression/config/level-config.ts` (per-level `xpToNext`: 359, 423, 500, ...) — Aynı oyuncu için `/tier/progress` 400 XP gerekli derken `/progression/:id` 359 diyor. `POST /api/v1/tier/level-up` doğrudan tier_progression'a yazıyor, HQ gate / age gate / `XP_SOURCE_MIN_AGE` kontrol etmiyor → stale XP varsa level-jump mümkün. — `POST /tier/level-up`'ı kaldır, tier.service'i game-server `player_levels`'tan read-only yap; tek source-of-truth game-server `ProgressionService.awardXp()`.

---

## 🟠 HIGH (önemli, hızlı kaza riski)

### Combat Subsystem

10. **Birim ability'leri tanımlı ama uygulanmıyor** — `apps/game-server/src/game/game.service.ts:263` — `handleAbility()` sadece mana/cooldown güncelliyor; `stimpack`, `cloak`, `siege_mode`, `rampage`, `heal`, `repair` hiçbir stat modifikasyonu / AoE / buff uygulamıyor. Ability'ler dekoratif string. — Switch ile ability adına göre efekti uygula (stimpack → attack×1.5 N tur, rampage → komşu enemy'lere damage, vs.). `abilities.constants.ts` ile stat delta'larını dışarı al.

11. **Commander damage/defense uygulanıyor ama HP multiplier ölü kod** — `apps/game-server/src/game/game.service.ts:159` — `damageMultiplier`, `defenseMultiplier` çalışıyor; `hpMultiplier` sadece spawn anında uygulanıyor, savaş sırasında aktif komutan değişse stat güncellenmiyor. — `handleAttack`'te effectiveHp hesaplarken `target.hp * (1 + targetCmd.hpMultiplier)` kullan **veya** spawn-time freeze contract'ını koda yorum olarak yaz.

### Yarış / Veri Bütünlüğü

12. **Alliance join() ve inviteMember() TOCTOU — kapasite aşımı** — `apps/api/src/modules/alliance/alliance.service.ts:81` + `apps/api/src/modules/alliance/alliance-player.service.ts:129-130,187-189` — `memberCount` kontrolleri lock'suz; iki eş zamanlı join `maxMembers`'ı aşıyor. — `dataSource.transaction()` içine al, `setLock('pessimistic_write')` ile alliance satırını kilitle (donate metodunda zaten doğru pattern var, mirror et). Aynı fix `processApplication()` için.

13. **Alliance chat WebSocket asla broadcast yapmıyor** — `apps/api/src/modules/alliance/alliance-player.service.ts:246` + `alliance-chat.gateway.ts:4` — Mesajlar DB'ye yazılıyor ama `AllianceChatGateway.broadcastMessage()` hiç çağrılmıyor; `@SubscribeMessage` handler da yok. Realtime sohbet REST polling'e indirgenmiş. — `sendChatMessage` + `addReaction` sonrasında gateway'i inject edip `broadcastMessage(allianceId, message)` çağır, bonus: `@SubscribeMessage('send_message')` handler ekle.

### Çoklu-İrk Senkron Sorunu

14. **api zerg seçiyor, game-server insan starter veriyor, merge race-mismatch'i kabul ediyor** — `apps/api/src/modules/users/users.service.ts` (select-race) + `apps/game-server/src/bases/bases.service.ts` (seed) + `apps/api/src/unit/merge-preview.service.ts` — `auth/me` ırk zerg ama `GET /api/buildings` barracks Lv1 (terran), marine eğitilebiliyor. `POST /units/merge-preview` `race:'canavar'` ile zerg üretmiş marine UUID'lerini consume edip "canMerge:true" dönüyor. — Race-sync hook: `select-race` event yayınla, game-server starter base/units'i seçilen ırka göre tohumlasın. Merge-preview'de auth user race + slot units race eşitliğini doğrula.

15. **Zerg T1 Larva ↔ ZERGLING isim çakışması** — `apps/game-server/src/units/constants/race-configs.constants.ts:19` + `apps/web/src/lib/nd-tokens.ts:233` — FE display "Larva", BE enum `ZERGLING`. Merge ekranında `unitPortrait('zerg', 'zergling')` asset bulamıyor → fallback Sigil; tier resolver de fallback'e düşüyor. — `ZERGLING` → `LARVA` rename (RACE_BONUSES, UNIT_CONFIGS, MERGE_RECIPES key'leri dahil).

### Auth / IDOR

16. **`quest-progress/increment` body'sindeki userId güveniliyor — IDOR + sınırsız XP** — `apps/api/src/modules/quest-progress/quest-progress.controller.ts` — Herhangi bir authed kullanıcı başka birinin `questId` progress'ini istediği `amount`'la (cap'siz, loop'lu) artırabiliyor; boş questId de kabul ediliyor. — JWT.sub'tan userId al, body field'ı yok say veya 403'le; questId'yi server catalog'a karşı whitelist'le; idempotency key/rate-limit ekle.

17. **`/daily/quests/{id}/claim` progress kontrolü yok** — `apps/api/src/modules/daily/daily.controller.ts` — Day 1'de 0/N progress'le tüm günlük quest'ler claim edilebiliyor; sadece `alreadyClaimed` flag'i koruyor. — Claim'de server-side `progress >= target` kontrolü yap, client'ın render'ına güvenme.

### Endpoint Ölü/404

18. **Game-server'da iki `@Controller('units')` çakışması — merge-roster/merge/recipes/mutate 404** — `apps/game-server/src/units/units.controller.ts` + `apps/game-server/src/game/merge/merge.controller.ts` — Aynı prefix → sadece biri register oluyor; "Promosyon Töreni" merge ritüeli oyuncuya tamamen ulaşılmaz. — `MergeController`'a `@Controller('units/ritual')` (veya benzer) farklı prefix ver, modüle de düzgün register edildiğini doğrula.

### UI ↔ Backend Maliyet Tutarsızlığı

19. **Komutan buildCostMultiplier UI'de uygulanmıyor** — `apps/web/src/app/base/building/[slug]/page.tsx:568` + `apps/web/src/app/base/build/page.tsx:188-190` — Backend `upgradeCostMul` ile maliyeti düşürüyor (Aurelius Lv14 ile -22%), FE base maliyeti gösteriyor → oyuncu "250M" görüyor, "12M" ödeniyor (veya tersine). Tutarsız feedback. — `useCommanders`'tan `buildCostMultiplier` çek, `costMul = max(0.05, 1 + multiplier)` ile mineral/gas/science maliyetlerini çarp.

### Ekonomi / DB Seeding

20. **`economy_storage_configs` tablosu seed edilmemiş** — `apps/game-server/src/economy/economy.service.ts:142` — Tablo create ediliyor ama tek satır insert yok; `computeStorageCap` `NotFoundException` atıyor → çağ geçişinde `updateStorageCapsForAge` 500 veriyor. — Yeni migration (`1779840000000-SeedEconomyConfigs.ts`) ekle: mineral/gas/energy=10T, population=5000, `age_multipliers=[1.0, 1.5, 2.5, 4.0, 6.0, 9.0]`. Legacy SQL `007_resource_economy_config.sql` referans olarak hazır.

21. **Production yield scaling formülü kopuk: legacy 1.18 vs DB default 1.25** — `apps/game-server/src/buildings/buildings.service.ts:427-433` — `EconomyBuildingConfig` tablosu hiç seed edilmemiş; fallback path 1.18^(level-1) kullanırken DB-driven path 1.25 dönüyor. Lv 10'da 1.68× üretim farkı. — `economy_building_configs` tablosunu 14 bina için seed eden migration ekle (önerilen `levelScaleExponent: 1.25`), tablo dolana kadar fallback'i de 1.25'e güncelle.

### Listing / Catalog 404

22. **Catalog endpoint'leri (`buildings/types`, `units/configs`, `commanders/catalog`) api gateway'inde yok** — `apps/api/src/app.module.ts` (proxy module yok) — Bunlar game-server'da yaşıyor ama FE/docs api adresini söylüyor; tek Swagger sadece :4000'i gösteriyor. — Ya api'de proxy route'ları ekle ya FE'yi doğrudan game-server'a yönlendir + Swagger'larda tek surface dokümante et.

23. **GET `/api/v1/units`, `/buildings`, `/resources` — route ordering bug** — `apps/api/src/unit/unit.controller.ts` + `building.controller.ts` + `resource.controller.ts` — `@Get(':id')` UUID-pipe'i bare-collection isteklerini yakalıyor → 400 "UUID is not a string". — `@Get()` handler'ı `@Get(':id')`'den önce tanımla, ya da `/units/me` gibi explicit route ekle. JWT'den userId'ye fallback yap.

24. **Achievement claim unlock doğrulaması yok** — `apps/web/src/app/missions/page.tsx:516` + `apps/api/src/modules/daily-engagement/daily-engagement.service.ts` — FE `a.unlocked && !alreadyClaimed` kontrol ediyor ama backend sadece duplicate'i engelleyen UNIQUE constraint'e güveniyor; herhangi bir achievementId ile `POST /daily-engagement/claim` 500 XP veriyor. — `AchievementService.isUnlocked(userId, missionId)` ekle, claim handler'da `missionType='achievement'` için bu kontrolü yap, kilitliyse 403.

---

## 🟡 MED (mid-game polish + scale)

### Komutanlar

25. **Commander XP `GAME_SPEED_MULTIPLIER` ile ölçeklenmiyor** — `apps/game-server/src/game/game.service.ts:572` — Battle XP `100`/`30` sabit; speed=1000 testinde 1.5 maçta komutan level-up oluyor, oyuncu progression'ı düzinelerce maç ister. — `scaledXp(isWinner ? 100 : 30)` ile `common/game-speed`'i kullan.

26. **Commander level-up için toast/event yok** — `apps/game-server/src/game/game.service.ts:572` — `CommandersService.awardXp()` return değeri swallow'lanıyor; FE `commanders.level_up` event'ini hiç almıyor. — Return değerini yakala, `levelAfter > levelBefore` ise `emitter.emitAsync('commanders.level_up', ...)`; gateway'den client socket'e bas.

### Ekonomi Polish

27. **VIP daily reward gem'leri cüzdana yazılmıyor** — `apps/api/src/modules/vip/vip.service.ts:158` — TODO; response `+50 Kristal` diyor ama `user_currency.premium_gems` artmıyor. — `dataSource.transaction()` içine al, `lastDailyClaimAt` save + `INSERT INTO user_currency ... ON CONFLICT DO UPDATE` ekle.

28. **Loot box award idempotency DB-level değil** — `apps/game-server/src/daily-rewards/daily-rewards.service.ts:234` — `count > 0` + `save` arasında race var, eş zamanlı son quest tamamlamalar duplicate award yazabilir. — `LootBoxAward` entity'sine `@Unique(['userId', 'source'])` ekle + INSERT...ON CONFLICT veya `try/catch QueryFailedError 23505`.

29. **Daily mission reset timezone-aware değil** — `apps/game-server/src/daily-rewards/daily-rewards.service.ts:23` — `utcDateString()` her zaman UTC döndürüyor; UTC+9 oyuncusu için reset sabah 9'da gerçekleşiyor. — `SERVER_TIMEZONE` env veya per-player tz, `toLocaleString('en-CA', {timeZone: tz})` ile date hesapla.

30. **TRY↔USD kuru hardcoded stale** — `apps/api/src/modules/vip/vip.service.ts:310` — Fallback `0.0285` (~35 TRY/USD) güncel kura uymuyor; VIP threshold geçişleri bölgesel olarak tutarsızlaşıyor. — `CurrencyService` ile live rate (ECB / 1 saat cache) çek; audit için hem `amountTry` hem `amountUsd` logla.

31. **Daily quest reward'ları (xp/gold/gems) krediliyor görünüp aslında yazılmıyor** — `apps/api/src/modules/daily/daily.service.ts` claim handler — Response 260 XP + 40 gems diyor, sonrasında `tier/progress` xp='0', balance gems=0. — Daily-engagement'in kullandığı tier-XP + balance grant servislerine bağla; "claim sonrası balance == önceki + reward" e2e testi ekle.

### Build Ranges / Caps

32. **Frontend `MAX_BUILDING_LEVEL` (54) kontrolü yok** — `apps/web/src/lib/upgrade-requirements.ts:122` + `apps/web/src/app/base/building/[slug]/page.tsx:388-393` — Lv54'te YÜKSELT butonu aktif görünüyor, tıklayan oyuncu backend hatası alıyor. — `computeUpgradeRequirements`'a `targetLevel > 54 → level_cap` kuralı ekle, `UpgradeRequirement.kind` union'ı genişlet.

33. **Max-tier level-up çağrısı temiz response dönmüyor** — `apps/api/src/modules/tier/tier.service.ts` `levelUp` — Lv54'te level-up çağrısı "Insufficient XP" 400 dönüyor, `isMaxLevel:true` short-circuit yok. — `levelUp`'ın başında max kontrolü ekle, 409 veya 200 `{isMaxLevel:true}` döndür.

### Tier / Progression Polish

34. **Tier service stale XP — backward reset veya XP-only reset sync etmiyor** — `apps/api/src/modules/tier/tier.service.ts:170` — `ensureProgress` koşulu `live.current_level > progress.currentLevel`; backward reset veya XP-only reset'te sync atlanıyor. — Koşulu kaldır (`if (live)` unconditional sync), uzun vadede tier_progression'ı deprecate edip player_levels'tan read-through compute yap.

### UX / Discovery

35. **PvE node'ları başlangıçtan görünür, discovery progression'ı yok** — `apps/web/src/components/nd/screens/GalaxyMapScreen.tsx:279` + `galaxy-data.ts:18` — 18 sabit node hep görünüyor; Brood-1 Lv10 capital oyun açılır açılmaz görünür. — `GalaxyNode`'a `discoveredByDefault?: boolean` ekle, `POST /galaxy/nodes/:id/discover` endpoint'i + player discovered set'i ile filtrele.

36. **Onboarding tracker race seçimini görmüyor** — `apps/api/src/onboarding/*` + `users.controller.ts` select-race handler — `selectedRace` hep null, `currentStep='welcome'` kalıyor. — `select-race` handler'ında `onboarding.markStepComplete('race_selection')` çağır veya read'te `users.race`'ten compute et.

### Architectural Pain

37. **Gate config starter base ile çelişiyor** — `apps/game-server/src/buildings/buildings.service.ts` (starter) + `progression/gates/*` (config) — Yeni oyuncu Lv1 barracks ve solar_plant'le doğuyor ama gate "Lv 3" / "CC Lv 2" gerektiriyor. — Starter base seed'ini gate kurallarına hizala veya gate gereksinimlerini gevşet.

38. **Formation power formülü tank/HP'yi az ağırlıklandırıyor** — `apps/api/src/modules/formations/formations.service.ts:50` (+ mirror `formation-api.ts:119`) — `attack*2 + defense*1.5 + hp*0.1 + speed*0.5`; Ultralisk (400 HP, 40 atk) Siege Tank'tan sadece %31 daha güçlü gözüküyor. — Önerilen rebalance: `attack*1.5 + defense*2.5 + hp*0.15 + speed*0.3` + tier_bonus; iki dosyada eşle.

### Subsystem Bonusu

39. **Alliance bonus üretime uygulanmıyor (level/xp ölü field)** — `apps/game-server/src/buildings/buildings.service.ts:454` — Alliance entity'de level/xp var ama `recalculateProductionRates` sadece commander bonus uyguluyor; donation/contribute mekanizması kozmetik. — Ya recalculate'e alliance bonusMultiplier ekle ya entity'den level/xp'yi sil (confusion'ı önle).

---

## 🟢 LOW (cila + future-proof)

40. **Travel time formül FE/BE arasında divergent** — `apps/web/src/components/nd/screens/GalaxyMapScreen.tsx:108` (`max(0, L-1)*0.03`) vs `apps/game-server/src/map/galaxy-map.controller.ts:57` (`L*0.03`) — Lv1'de %3, Lv50'de %1 sapma. — FE'yi BE'ye hizala: `1 + playerLevel * 0.03`, yorumu da güncelle.

41. **PvE battle'lar `targetNodeId` ile deterministik seed'lenmiyor** — `apps/api/src/meta/battles-stub.controller.ts:133` — Her çağrı random seed, aynı node iki kez farklı outcome veriyor. — POST body'ye `targetNodeId` ekle, RNG seed'ine kat: `${targetNodeId}_${Date.now()}_...`.

42. **Marine→Sniper stat ramp +60% formülü ihlal ediyor** — `apps/game-server/src/units/constants/race-configs.constants.ts:164` — HP 45→96 (2.13×), Attack 10→28 (2.80×); sonraki tier'lar düzgün 1.60×. — Sniper'ı 72 HP / 16 Attack'a düşür ya da yorumu "front-loaded T1→T2 spike" diye güncelle (Engineer T2 zaten 1.6× ile uyumlu).

43. **Commander formation power heuristik, gerçek bonusla bağsız** — `apps/web/src/components/formation/FormationScreenND.tsx:217` — `level*50 + tier*100/200` linear; Voss Lv30 = 1700 power gözüküyor ama gerçek bonus +12% damage. — Catalog'a `basePower` ekle (`sum(abs(bonuses))*100`), `bonusAtLevel`'i kullanarak skala et; ya da kozmetik olduğunu yorum olarak belirt.

44. **Tier 4+ skill açıklaması gerçek bonus'la uyuşmuyor** — `apps/game-server/src/commanders/commanders.constants.ts:94` — Kovacs `skill: '+15% hasar, suikast +%'` ama `BASE_BONUSES` sadece `damageMultiplier: 0.15 / defenseMultiplier: -0.10`; "suikast" mekaniği yok. Azurath notation `-%20 / -%10` standart değil. — Skill text'lerini gerçek bonus'a hizala: kovacs → "Hasar +15%, Savunma -10%"; azurath → "Eğitim Maliyeti -20%, İnşa Maliyeti -10%".

45. **Race lex EN/TR mismatch (`insan` vs `human`)** — `apps/api/src/.../select-race DTO` IsIn list vs `apps/game-server/src/commanders/commanders.controller.ts:23` ALLOWED_RACES — api yalnız `human` kabul, BE'de `insan/zerg/otomat/canavar/seytan`. — Bir kanonik set seç (öneri: BE Turkish, api boundary'de çevir).

46. **Stale comment'ler ve fallback'ler** — Birden fazla yer:
    - `apps/game-server/src/resources/resources.service.ts:344` — `scienceCap ?? 999999` (entity default 10T)
    - `apps/api/src/auth/auth.service.ts:49` — Cap comment "mineral=24000" diyor, gerçek 10T
    - `apps/game-server/src/commanders/commanders.service.ts` — class-level "tek aktif komutan" doc'u yok
    — Tek PR'la tüm fallback'leri 10T'ye veya tamamen çıkar, comment'leri migration `1779800000000`'a referans ver, `CommandersService`'a "at most one active" JSDoc'u ekle.

47. **Wire-format inkonsistanslıkları**:
    - `GET /api/v1/users/me` → 400 "uuid is expected" (`apps/api/src/users/users.controller.ts`) — `@Get('me')` explicit route ekle, `@Get(':id')`'den önce
    - `GET /api/v1/formations` POST'tan farklı shape dönüyor (`apps/api/src/modules/formations/formations.controller.ts`) — list handler'ı POST'un response builder'ından geçir
    - VIP `/status` camelCase (#8 ile birlikte) — tüm `/vip/*` snake_case'e geç
    - Mixed-language errors: `"Bilinmeyen kanal: recent"` vs `"Building X not found"` — API katmanı için tek dil seç (öneri EN, FE localize etsin)
    - Swagger `/api/v1/api/v1/bosses`, `/content/age2`, `/subspace` çift prefix — Controller decorator'larından `api/v1/` prefix'ini çıkar

48. **Input validation eksikleri**:
    - `GET /api/galaxy/nodes/travel-time` (`galaxy-map.controller.ts:106`) — `playerLevel` ceiling yok, "Unknown node id: X" enumeration leak, rate-limit yok. Clamp `0..500`, generic error message, `@Throttle` ekle.
    - `daily-engagement/claim` negative XP kabul ediyor (`reward.xp=-99999` → claimed:true) — DTO'ya `@Min(0)` ekle
    - `POST /formations` `unitSlots.length` validation yok (`formations.controller.ts:139`) — `@ArrayMaxSize(10)` / `@ArrayMaxSize(2)` ekle
    - `POST /formations/power` unowned/invalid IDs için sessizce 0 dönüyor — warnings array ekle veya 400 at

49. **Research stub durability** — `apps/api/src/meta/research-stub.controller.ts:42,95` — `RESEARCH_DURATION_SEC=300` hardcoded; `xpGranted=true` HTTP call ÖNCE set ediliyor → failure'da kalıcı kayıp, retry yok, audit yok. — Env'e taşı, await + pessimistic flag, `research_xp_grants(user_id, tech_id) UNIQUE` tablosuyla DB-backed idempotency.

50. **Batch merge leftover sessiz handling** — `apps/web/src/app/merge/page.tsx:269` — `[4 Marine, 3 Medic, 2 Ghost]` pool'unda 2 grup mergee'lendiğinde 3 birim sessizce kalıyor, toast "2 groups successful" diyor. — Toast'a leftover count ekle ("2 grup birleşti, 1 Marine, 2 Ghost yetersiz") veya pool grid'inde remainder kartları dim/disabled göster.

51. **Battle log / commander bonus observability** — `apps/game-server/src/game/game.service.ts:159,472` — Damage'a komutan bonus uygulanıyor ama `game_end` event'inde `appliedBonuses` yok, `BattleLogService` instantiate edilmemiş. — `appliedBonuses: { attacker: {...}, defender: {...} }` ekle, `BattleLogService`'i wire et.

52. **User profile resource/progression info yok** — `apps/api/src/users/users.controller.ts` — `/auth/me` ve `/users/profile` ne mineral ne level döndürüyor; yopmail 10T grant'i hiçbir endpoint'le doğrulanamıyor. — `/users/me/summary` ekle (user + resources + tier join) veya profile DTO'sunu genişlet.

---

## Stratejik Öneriler

- **Tek source-of-truth politikası**: `api` ile `game-server` arasında dağınık olan progression (XP, level, tier), resources, race, buildings, units endpoint'leri için sahiplenme matrisi çıkar; ikincil servisler proxy veya read-through olsun. Şu anki çift yazıcı (`tier_progression` vs `player_levels`, api buildings vs game-server buildings) tüm wire-mismatch ve drift hatalarının kök nedeni.

- **CI'a `dist == src` zorunluluğu ekle**: Commanders modülünün dist'te eksik kalması ve progression ownership check'inin compile edilmemiş dist'te yok olması production safety için kabul edilemez. Build adımı zorunlu + container imajı her zaman fresh build'le yayınlansın.

- **Server-authoritative reward catalog**: Daily quest claim, daily-engagement claim, quest-progress increment, achievement claim — hepsi şu an client'tan reward / progress / amount kabul ediyor. Tek bir `MissionCatalogService` kur, missionId → kanonik reward; client sadece missionId yollasın, server kataloğa bakıp gate'leri (age, completion, idempotency) doğrulasın.

- **Çoklu-ırk parity'sini blocker olarak yönet**: Otomat/Canavar/Şeytan için birim, starter base, race-sync, ve PvP balance multiplier'ları (1.0 placeholder) eksik — bu üç ırk şu an "seçilebilir ama oynanamaz" durumda. Ya tam paket olarak tamamla ya `/users/select-race` enum'undan kaldır; aradaki "yarı-açık" durum kötü bir new-user deneyimi.

- **Wire-format kontratını şemaya bağla**: snake_case vs camelCase, çift prefix `api/v1/api/v1/`, route-ordering bug'ları, hata mesajı dili karışıklığı — bir OpenAPI generator + contract test pipeline (örn. Pact veya Zod-based runtime validator) kur. FE/BE shape drift'i compile time'da yakalansın, runtime'da 400 "UUID is not a string" yerine.