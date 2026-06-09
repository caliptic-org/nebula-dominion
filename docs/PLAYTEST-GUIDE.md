# Playtest Guide — İnsan ırkı

Tam-akış playtest için pratik yol haritası. Hızlı bir tur için
`GAME_SPEED_MULTIPLIER=1000` ile çevir, gerçek oyuncular için `=1`'e
geri al.

> **Otomatik playthrough:** elle gezmek yerine `bash scripts/autoplay-full.sh`
> bir hesabı API üzerinden baştan sona oynatır (level 1 → 54/age 6 → prestige)
> ve yol boyunca battle-XP grant, nüfus cap + disband, prestige birikimi gibi
> sözleşmeleri **assert** eder. `GAME_SPEED_MULTIPLIER` yüksekken build/train
> deadline'ları anında çözülür → tur saniyeler sürer. Auth: seed'li test
> hesabıyla login olur (veya `TOKEN=`/`USER_ID=` ver). Prod için `API=`/`GAME=`
> set et. Çağ-2'ye kadar olan eski/odaklı sürüm: `scripts/autoplay-to-age2.sh`.

---

## 1. Hız çarpanı (parametric)

Tek env değişkeni tüm zaman tabanlı + XP tabanlı mekanikleri ölçekler:

| Çarpan | Etki | Kullanım |
|---|---|---|
| `1` | Canonical pacing — canlı default | Üretim |
| `10` | QA iterasyonu | Geliştirme |
| `100` | Hızlı oyun-tasarım turu | Tasarım kararı |
| `1000` | Tam Çağ 1→6 akışını dakikalar içinde yaşa | Bug avı |

Etkilediği yerler:

| Sistem | Davranış |
|---|---|
| Bina inşaat süresi | `buildTimeSeconds / N` |
| Birim eğitim süresi | `trainTimeSeconds / N` |
| XP kazanımı (her kaynak) | `baseAmount * N` |

Etkilenmeyen yerler (kasti):

- Kaynak üretim hızı (tick interval) — değişmiyor; başka bug kaynağı olmasın diye
- Battle round süresi
- Cooldown'lar / shield duration / matchmaking timeout

### Aktif etme (LXC prod)

```bash
ssh root@10.10.10.40
cd /opt/nebula-dominion
echo 'GAME_SPEED_MULTIPLIER=1000' >> .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d game-server
# 2-3 saat test
# Bittiğinde:
sed -i '/GAME_SPEED_MULTIPLIER/d' .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d game-server
```

Yalnız `game-server` restart edilir — frontend etkilenmez, kullanıcı
oturumları kopmaz.

### Doğrulama

Aktif olduğunda `game-server` boot logunda görünür yapıldı (gelecek
PR — şu an env-only). Hızlı doğrulama:

```bash
# Bir bina inşa et, completeAt timestamp'i 30s yerine 30ms olmalı
docker compose ... logs game-server | grep "Complete at:" | tail -3
```

---

## 2. İnsan ırkı Çağ haritası

| Çağ | Lv | İsim | Açılan |
|---|---|---|---|
| **0** | — | Kayıt | race-select, race-confirm |
| **1** | 1-9 | Gezegensel Uyanış | İlk üs, kaynak üretimi, ilk birimler |
| **2** | 10-18 | Yıldız Sistemi Hâkimiyeti | Uydu, ikiz gezegen, üçlü sistem, asteroid mining |
| **3** | 19-27 | Sektör Genişlemesi | **PvP açık**, lonca, yıldız generali |
| **4** | 28-36 | Galaktik Çatışma | İttifak savaşı, elit turnuva |
| **5** | 37-45 | Boyutlar Arası | Subspace yarıkları, çapraz-sunucu PvP |
| **6** | 46-54 | Kozmik Üstünlük | Legend ligi, Kozmik Konsey, Tier 9 Yutucu Yıldız Varisi |

XP eşikleri (Lv 1→9):

```
Lv 1 → 2:   359 XP    (tier 1, 1.0× çarpan)
Lv 2 → 3:   423 XP
Lv 3 → 4:   500 XP
Lv 4 → 5:   590 XP    (tier 2, 1.1× çarpan)
Lv 5 → 6:   696 XP
Lv 6 → 7:   821 XP
Lv 7 → 8:   969 XP    (tier 3, 1.25× çarpan)
Lv 8 → 9:  1143 XP
Lv 9 → 10: ÇAĞ 2 GEÇİŞİ (cinematic + catch-up paketi)
```

**1000× ile**: Lv 1→9 toplam ~5530 XP. Bir build event (`CONSTRUCTION
80 base × 1000 = 80 000 XP`) tek başına Lv 1→6'yı geçirir.

---

## 3. Bina inşa sırası (İnsan)

Bağımlılık zinciri — komuta üssü (Lv 1) önce hazır, geri kalanı sıralı
açılır:

```
[Lv 1] komuta_ussu (Cmd Center) — pre-built, ücretsiz
   │
   ├─ [cmd Lv 1] mineral_extractor   50M / 0G / 20E,  30s,  max 5
   │
   └─ [cmd Lv 2]
       ├─ gas_refinery                75M / 0G / 30E,  45s,  max 3
       ├─ solar_plant                 60M / 20G / 0E,  40s,  max 4
       │
       └─ [player Lv 3]
           barracks                   150M / 50G / 40E,  60s,  max 3
              │
              └─ [player Lv 4] turret  100M / 25G / 20E,  35s,  max 6
   │
   └─ [cmd Lv 3] research_lab          (kaynak: TBD)
       │
       └─ [research_lab Lv 1] academy  200M / 75G / 50E,  80s,  max 2
   │
   └─ [cmd Lv 4 + player Lv 6] factory 250M / 100G / 60E, 100s, max 2

[player Lv 5] shield_generator         125M / 75G / 50E,  55s,  max 2
[player Lv 7] hangar                   (Çağ 1.8 "Şehir")
```

**1000× ile inşa süreleri**: 30s → 0.03s, 100s → 0.1s — anında.

### Önerilen ilk-saat sırası (canlı)

1. **Komuta Üssü Lv 2** (upgrade) — gas/solar/barracks gate'lerini açar
2. **Mineral Extractor** × 2 — mineral tabanı kurulur
3. **Solar Plant** — enerji tüketimi başlamadan önce
4. **Gas Refinery** — barracks maliyet için
5. **Barracks** — ilk Marine eğitimi
6. **Komuta Üssü Lv 3** — research_lab açar
7. **Research Lab** → **Academy** — Medic + Ghost
8. **Komuta Üssü Lv 4** + Lv 6 → **Factory** — Siege Tank
9. **Shield Generator** (Lv 5) — savunma katmanı
10. Lv 9 sonu → **Çağ 2 cinematic**

---

## 4. Birim üretim sırası (İnsan)

| Birim | Bina | M / G / E | Süre | HP / Atak / Sav | Yetenek |
|---|---|---|---|---|---|
| **Marine** | barracks | 50 / 0 / 10 | 20s | 45 / 10 / 6 | stimpack |
| **Medic** | academy | 50 / 25 / 15 | 25s | 30 / 4 / 4 | heal, restoration |
| **Siege Tank** | factory | 150 / 100 / 40 | 60s | 150 / 35 / 12 | siege_mode, tank_fire |
| **Ghost** | academy | 100 / 75 / 50 | 45s | 25 / 28 / 3 | cloak, nuclear_strike, emp_round |

**Irk bonusu (İnsan)**:
- Defense × 1.15
- HP × 1.10
- Attack / Speed / Training: 1.0× (nötr)

Yani bir Marine: HP 45 × 1.10 = ~50 efektif, Defense 6 × 1.15 = ~7.

### Önerilen ilk filo

1. **6× Marine** (300M / 0G / 60E, 1.5dk pure-time, 1000×'te ~0.5s)
2. **2× Medic** (100M / 50G / 30E)
3. **2× Siege Tank** (300M / 200G / 80E, 1000×'te 6 × 0.06s)
4. **1× Ghost** (100M / 75G / 50E)

Toplam filo gücü ~5280 (Formation Power, default değer).

---

## 5. XP kaynakları & miktarları

| Kaynak | Base XP | Çağ kilidi | Açıklama |
|---|---|---|---|
| `daily_mission` | 200 | — | Günlük görev claim |
| `pve_win` | 150 | — | Bot karşı zafer |
| `pve_loss` | 30 | — | Bot karşı yenilgi |
| `pvp_win` | 200 | **Çağ 3+** | Gerçek oyuncu zaferi |
| `pvp_loss` | 50 | **Çağ 3+** | Gerçek oyuncu yenilgi |
| `construction` | 80 | — | Bina inşa VEYA upgrade |
| `guild_activity` | 100 | **Çağ 3+** | Lonca katkısı |
| `achievement` | 500 | — | Başarım claim |
| `event` | 300 | — | Etkinlik tamamlama |

Per-tier çarpan ek olarak uygulanır (Lv 7-9'da 1.25×, Lv 10-12'de 1.5×,
vs.). Speed çarpanı bunun ÜZERİNE biner.

**1000×'te bir construction event**:
`80 × 1.25 (tier 3) × 1000 (speed) = 100 000 XP` → 1 inşa Lv 1'den
Lv 9'a sıçratır.

---

## 6. Hızlı test akışı (1000×)

`GAME_SPEED_MULTIPLIER=1000` aktif iken bir oyuncunun tam akışı:

| Adım | Süre (1000×) | Doğrulama |
|---|---|---|
| Register + race-select (İnsan) | 30s manuel | /race-confirm 5 sahne |
| /tutorial → /base | 10s | HUD pill'ler görünür |
| Mineral Extractor inşa | <1s | İnşa badge tile üzerinde belirir + biter |
| Komuta Üssü Lv 2 | <1s | barracks gate açılır |
| Barracks | <1s | Marine üretimi açılır |
| 6× Marine | ~6s | /base/production queue tamamlanır |
| Daily mission claim | anlık | +200 000 XP toast |
| Çağ 1 → Çağ 2 cinematic | manuel | AgeTransitionListener tetikler |
| /shop "VIP" tab — kilit ekran | manuel | Çağ 2 unlock chip |
| Achievement claim ("İlk Kan") | anlık | +500 000 XP toast |
| Battle (PvE) | manuel | Reward + XP grant |
| /missions → /replay/[id] | manuel | Tur-by-tur izle |
| Çağ 3 → PvP açılır | manuel | matchmaking gate |
| Lonca oluştur (Çağ 3) | manuel | guild.create gate |

**Toplam**: 1-2 saatte Çağ 1→3, 2-3 saatte tüm 6 çağ.

---

## 7. Bug raporu

Test sırasında karşılaşılan her gariplik için BACKLOG.md'ye not düş veya
bir issue aç. Önerilen şablon:

```markdown
### [SEVERITY] /route — kısa başlık
- **Beklenen**: ...
- **Gözlenen**: ...
- **Tekrar**: 1) X yap 2) Y olmalı
- **Çağ / Lv**: ...
- **GAME_SPEED_MULTIPLIER**: 1000
- **Screenshot**: .claude/playtest-runs/...
- **Console**: 401/404/socket warning?
```

**Otonom playtest**: `.claude/playtest-runs/run-N/playtest.py` zaten 11
sayfayı geziyor — yeni bir tur için `cp run-6/playtest.py run-7/` +
düzenle + çalıştır.

---

## 8. Hız çarpanını sıfıra çekme

Test bittiğinde:

```bash
ssh root@10.10.10.40
cd /opt/nebula-dominion
# .env'den GAME_SPEED_MULTIPLIER satırını sil
sed -i '/^GAME_SPEED_MULTIPLIER/d' .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d game-server
docker compose ... logs game-server | head -20  # boot ok mu
```

Eski oyuncuların XP/seviye değerleri korunur — sadece YENİ event'ler
canonical 1× pacing'te işlenir. Test sırasında 1000× XP almış hesaplar
hâlâ o yüksek seviyede olur (Lv 50+ guest hesaplar) ama gerçek
oyuncular sıfırdan başlayacağı için bu bir prod kirliliği değil.

İstenirse 1000× test sırasında oluşturulan test hesapları DB'den
silinir:

```sql
-- LXC postgres VM 10.10.10.20'da:
DELETE FROM users WHERE email LIKE 'playtest+%@example.com';
-- CASCADE ile player_levels, xp_transactions, vs. de temizlenir
```
