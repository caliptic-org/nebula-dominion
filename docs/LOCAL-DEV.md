# Local Development & Debugging Notes

Bu dosya **local'de stack'i çalıştırma + veri-akışı bug'larını teşhis** için
bir sonraki geliştiriciye/AI agent'a operasyonel context verir. (Prod için
`DEPLOYMENT.md`, mimari/agent context için `CLAUDE.md`.)

Başka bir bilgisayara geçerken: `git fetch && git checkout <branch>` ile bu
doküman + son fix'ler gelir; sonra aşağıdaki "Stack'i çalıştır" adımlarını izle.

---

## 1. Stack'i local'de çalıştır (docker-compose)

Local'de her şey `docker-compose.yml` (dev overlay YOK) ile ayağa kalkar —
postgres + redis + minio + api + game-server + web hepsi container:

```bash
docker compose up -d            # tüm servisler
docker compose ps               # sağlık durumu
docker compose logs -f game-server   # canlı log
```

`.env` (repo'da DEĞİL, gitignore) yoksa compose default'ları devreye girer.
Default değerler `docker-compose.yml` içinde (`${VAR:-default}`).

### Servis → port → ne yapar

| Port | Servis | Not |
|---|---|---|
| 3000 | **web** (Next.js) | `NEXT_PUBLIC_*` **build-time** baked → değiştirirsen `docker compose build web` şart |
| 3001 | **game-server** (NestJS+Socket.io) | prefix `/api`; units/buildings/training/resources burada |
| 4000 | **api** (NestJS REST) | prefix `/api/v1`; auth/login, shop, progression |
| 5432 | **postgres 16** | DB `nebula_dominion` |
| 6379 | **redis 7** | matchmaking + cache |
| 9000/9001 | **minio** | object storage |

### Önemli env default'ları (local)

- `DATABASE_URL = postgresql://nebula:nebula_dev_password@postgres:5432/nebula_dominion`
  (container içinden `postgres` host; **host makineden** `localhost:5432`).
- `GAME_SPEED_MULTIPLIER = 1` → **kanonik hız**: training/construction GERÇEK
  süre alır (saniyeler–dakikalar). QA için `GAME_SPEED_MULTIPLIER=10` (veya 1000)
  ile collapse eder. `apps/game-server/src/common/game-speed.ts`.
- `NEXT_PUBLIC_GAME_SERVER_URL = http://localhost:3001`, `NEXT_PUBLIC_API_URL = http://localhost:4000`.

### Web FE değişikliğini local'de görmek

Web bir **built Next.js standalone image** — kaynak değişikliği canlıya
yansımaz, container'ı yeniden build etmek gerekir:

```bash
docker compose build web
docker compose up -d --force-recreate web
docker inspect --format '{{.State.Health.Status}}' nebula-dominion-web-1   # healthy bekle
```

Built bundle'ın gerçekten yeni kodu içerdiğini doğrulamak (stale build kontrolü):
```bash
docker exec nebula-dominion-web-1 sh -c "grep -rl '<yeni-string>' /app/apps/web/.next/static"
```
(Türkçe karakterler Windows→bash→alpine encoding'inde bozulabilir → grep için
ASCII alt-string seç, örn. "aktif bir".)

---

## 2. DB'ye doğrudan bağlanıp teşhis (host makineden)

`psql` PATH'te olmayabilir; repo'da `pg` modülü VAR → hızlı node script:

```js
// node ile: host=127.0.0.1, port=5432, user=nebula, pass=nebula_dev_password, db=nebula_dominion
const { Client } = require('pg');
const c = new Client({ host:'127.0.0.1', port:5432, user:'nebula', password:'nebula_dev_password', database:'nebula_dominion' });
await c.connect(); /* ... */ await c.end();
```

### ⚠️ Kolon adları snake_case (camelCase DEĞİL)

TypeORM entity property'leri camelCase ama DB kolonları **snake_case**:
`player_id`, `unit_type`, `is_complete`, `completes_at`, `is_alive`, `max_hp` …
Önce şema bak: `SELECT column_name FROM information_schema.columns WHERE table_name=$1`.

### İki ayrı "buildings" tablosu — karıştırma

- **`player_buildings`** = oyuncunun ÜS binaları (`player_id`, `type`, `status`,
  `construction_*`). Training bina kontrolü (barracks/academy) BUNA bakar.
- **`buildings`** = PvP MAÇ içi RTS binaları (`gameId`, `position`, `health`).
  Tamamen ayrı; training ile alakasız.

### Aktif kullanıcı kim? (kim oynuyor)

api loglarında JWT-guard her istekte user lookup yapar → en sık görünen id =
aktif oturum: `docker compose logs --since 30m api | grep -i 'FROM "users"'`.
Veya `SELECT id,email,race,last_login_at FROM users ORDER BY last_login_at DESC`.

---

## 3. Training → Inventory veri akışı (vaka çalışması)

**Semptom:** "Marine/Medic eğittim ama `/inventory`'de 0 görünüyor."

### Pipeline (her halka çalışmalı)

1. FE `/base/production` → `handleAdd` → **gerekli aktif bina varsa**
   `POST /api/units/train {buildingId, unitType, count}` (game-server).
2. `UnitsService.trainUnit` → `training_queue`'ya satır INSERT eder
   (`completes_at = now + süre`). **Birim henüz YOK** — sadece kuyruk satırı.
3. `ResourceTickWorker` `@Cron('*/30 * * * * *')` (30 sn) →
   `UnitsService.completeTraining()` → `completes_at <= now` satırları için
   `player_units`'e satır(lar) spawn eder, `is_complete=true` yapar.
   (`apps/game-server/src/workers/resource-tick.worker.ts`)
4. FE `useGameUnits` → `GET /api/units` (game-server, alive units) → `/inventory`
   bunları tipe göre gruplayıp sayar.

`getUnits`/`getTrainingQueue` **lazy-complete ETMEZ** — materialization tamamen
30 sn'lik worker tick'ine bağlı. Worker `WorkersModule` + `ScheduleModule.forRoot()`
ile bağlı (app.module). GAME_SPEED=1'de Marine ~gerçek süre sonra düşer.

### Birim → gerekli bina (training)

`apps/game-server/src/units/constants/race-configs.constants.ts`:
- **Marine → BARRACKS** (Kışla)
- **Medic → ACADEMY** (Akademi)
- siege_tank → FACTORY, zergling → SPAWNING_POOL, hydralisk → HATCHERY …

Gerekli bina yoksa eğitim **gerçekleşemez** (POST `buildingId` ister).

### Teşhis sırası (doğal kontrol grubu)

1. `training_queue`'da bugüne ait satır VAR MI? Yoksa → POST hiç olmadı/reddedildi.
2. game-server logunda train POST var mı? (Nest 4xx'i loglamaz → yokluk kesin
   kanıt değil.)
3. Oyuncunun `player_buildings`'inde aktif **barracks/academy** var mı? Yoksa →
   FE POST atmıyordu (eski bug: sahte optimistik kuyruk gösteriyordu).
4. Binası OLAN oyuncularda `player_units` gerçekten dolu → pipeline sağlam.

---

## 4. Shipped fix — "honest production gate" (2026-06)

**Bug:** Gerekli bina (Kışla/Akademi) yokken `/base/production` ekranı backend'e
POST atmıyor ama **istemci-tarafı sahte bir kuyruk** gösteriyordu (geri sayım
tikliyor, yumuşak "info" toast). Oyuncu eğitim olmuş sanıyor → `training_queue`'ya
hiçbir şey yazılmıyor → `/inventory` 0 kalıyor.

**Fix** (`apps/web/src/app/base/production/page.tsx`, `handleAdd`): authed bir
oyuncuda aktif gerekli bina yoksa **net hata ile bloke eder** ve hiçbir optimistik
state'e dokunmadan `return` eder:
- `"Marine için önce aktif bir Kışla inşa et."` / `"Medic için … Akademi …"`
- Bina label'ı `trBuildingType()` ile (`apps/web/src/lib/translate-backend-error.ts`,
  artık export edili). Eski sahte-kuyruk dalı silindi.
- Giriş yapmamış/demo modu hâlâ local kuyruğu (POST'suz) kullanır.

### Bilinen ikincil konu (henüz düzeltilmedi)

`GatedButton`'ın `gateId`'si `production.train_${(selectedUnit).type ?? 'unknown'}`
üretiyor ama `UnitDef`'in alanı `type` değil **`backendType`** → her zaman
`production.train_unknown` → kapı tetiklenmiyor. Ayrıca gate registry backend
tipleriyle tam örtüşmüyor (`production.train_tank` vs gerçek `siege_tank`).
Fonksiyonel blok artık `handleAdd`'de garanti olduğu için zararsız; istersen
gate registry'yi backend tipleriyle hizalayıp `backendType` kullanacak şekilde
düzeltilebilir.

---

## 5. Hızlı komut kartı

```bash
# stack
docker compose up -d && docker compose ps
docker compose logs --since 30m game-server | grep -iE "train|error|exception"

# web fix'i canlıya al
docker compose build web && docker compose up -d --force-recreate web

# DB (host'tan): node + pg, creds yukarıda. snake_case kolonlar.
# training_queue / player_units / player_buildings / users en kritik tablolar.
```
