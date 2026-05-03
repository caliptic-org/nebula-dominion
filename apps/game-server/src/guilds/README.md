# Guilds (Loncalar) — Backend API Reference

CAL-235 / Faz 1. This module owns the guild data model, membership, event log,
and the Çağ 3 onboarding tutorial state machine. Frontend issue tracking this
contract: CAL-238.

## Base URL

All endpoints are mounted under the game-server REST root: `/guilds`.
JWT auth is expected via the standard `Authorization: Bearer <token>` header
once the global `JwtAuthGuard` is wired up at the app level.

## Database tables

| Table                 | Purpose                                        |
|-----------------------|------------------------------------------------|
| `guilds`              | One row per guild (name, tag, leader, score)   |
| `guild_members`       | Membership + role + contribution_pts per user  |
| `guild_events`        | Append-only activity log (join/donate/raid/…)  |
| `guild_tutorial_states` | Per-user state machine for Çağ 3 onboarding |

Migration: `apps/game-server/migrations/002_create_guild_tables.sql`.

## Endpoints

### Guild lifecycle

#### `POST /guilds`
Create a new guild. Leader becomes the first member.

```json
// Request
{ "leaderId": "uuid", "name": "Yıldız Loncası", "tag": "YLDZ" }

// 201 Created
{
  "id": "uuid",
  "name": "Yıldız Loncası",
  "tag": "YLDZ",
  "leaderId": "uuid",
  "memberCount": 1,
  "tierScore": 0,
  "ageUnlockedAt": null,
  "createdAt": "2026-05-03T18:00:00Z",
  "updatedAt": "2026-05-03T18:00:00Z"
}
```

**Errors**
- `409` if user already belongs to a guild
- `409` if name or tag is taken (tag is uppercased server-side)
- `400` if tag is not 3-5 alphanumeric characters

#### `GET /guilds?limit=50&offset=0`
List guilds ordered by `tier_score DESC, created_at DESC`. Max `limit=100`.

#### `GET /guilds/:id`
Get a guild by UUID. `404` if not found.

#### `GET /guilds/tag/:tag`
Lookup by tag (case-insensitive). `404` if not found.

#### `GET /guilds/:id/members`
List all members of a guild, ordered by role then `contribution_pts` desc.

```json
[
  {
    "guildId": "uuid",
    "userId": "uuid",
    "role": "leader",
    "joinedAt": "2026-05-03T18:00:00Z",
    "contributionPts": 0,
    "lastActiveAt": "2026-05-03T18:00:00Z"
  }
]
```

#### `GET /guilds/:id/events?limit=50`
Recent event log (descending). Max `limit=200`.

```json
[
  {
    "id": "uuid",
    "guildId": "uuid",
    "userId": "uuid",
    "type": "donate",
    "payload": { "amount": 250 },
    "createdAt": "2026-05-03T18:00:00Z"
  }
]
```

Event types: `join`, `leave`, `donate`, `raid_attend`, `chat_message`,
`research_contrib`.

#### `POST /guilds/:id/join`
Adds the user as a `member`.

```json
// Request
{ "userId": "uuid" }
```

Side effect: if the player has `tutorial_required = true` and state is
`not_started`, advances tutorial to `guild_chosen` automatically.

**Errors**
- `404` if guild not found
- `409` if user already in any guild

#### `POST /guilds/:id/leave`
Removes the user. Leaders cannot leave (`403`) — they must transfer leadership
or disband. Returns `{ "ok": true }`.

#### `POST /guilds/:id/donate`
Records a contribution. Increments `contribution_pts` and emits a `donate`
event. Side effect: advances tutorial `guild_chosen → first_donation`.

```json
// Request
{ "userId": "uuid", "amount": 250, "resource": "mineral" }
```

#### `GET /guilds/users/:userId/membership`
Returns the user's current `GuildMember` row, or `null` if not in a guild.

### Tutorial state machine

The state machine is gated by `tutorial_required = true`, which is set
automatically when a player's `total_xp` crosses **18,000** (Çağ 3 unlock
threshold — see CAL-230). Backend listens for `guild.tutorial_required`
internally; frontend does not need to set this flag.

State graph (forward-only, one step at a time):

```
not_started → guild_chosen → first_donation → first_quest → completed
```

#### `GET /guilds/tutorial/:userId`
Get or create the tutorial state row for a player.

```json
{
  "id": "uuid",
  "userId": "uuid",
  "tutorialRequired": true,
  "state": "guild_chosen",
  "rewardGranted": false,
  "completedAt": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Frontend gating logic**: show the tutorial UI when
`tutorialRequired === true && state !== "completed"`.

#### `POST /guilds/tutorial/:userId/advance`
Advances to the next state. Validates one-step-at-a-time forward transitions
only.

```json
// Request
{ "toStep": "first_quest" }
```

**Errors**
- `400` `tutorialRequired === false` — threshold not yet crossed
- `400` skipping steps or moving backward

> Note: `not_started → guild_chosen` and `guild_chosen → first_donation`
> are also advanced **automatically** by `POST /guilds/:id/join` and
> `POST /guilds/:id/donate` respectively. The frontend only needs to call
> `advance` for the `first_donation → first_quest` and `first_quest → completed`
> transitions.

#### `POST /guilds/tutorial/:userId/reward`
Grants the completion reward: **+500 Energy + `guild_starter_emblem`**
(starter cosmetic). Idempotent — fails with `409` if already granted.

```json
// 200 OK
{
  "state": { "...": "GuildTutorialState row" },
  "reward": { "energy": 500, "cosmetic": "guild_starter_emblem" }
}
```

**Errors**
- `400` if state is not `completed`
- `409` if reward already granted

## Telemetry events

Emitted on the in-process EventEmitter bus (consumed by analytics fan-out).

### `guild_lifecycle`
`{ created, joined, left, kicked, disbanded }`

### `guild_progression`
`{ tutorial_step_complete, first_donation, first_raid, rank_threshold_crossed,
   tutorial_reward_granted }`

### Envelope

Every emitted event has the shape:

```ts
{
  user_id: string;
  guild_id: string | null;
  age: number | null;
  tier_badge: number | null;
  timestamp: string;        // ISO-8601
  server_shard: string;     // env: SERVER_SHARD
  payload: { kind: string; ...event-specific }
}
```

## Cross-issue coordination

- **CAL-228** (resource cap): the `tier_score` field will be incremented from
  the guild aid pool which contributes 2% of each member's storage cap. Hook
  point: `GuildsService.recordDonation` when CAL-228 lands.
- **CAL-230** (XP curve): the 18,000 total-XP threshold is defined in
  `apps/game-server/src/guilds/guilds.constants.ts` as
  `GUILD_TUTORIAL_XP_THRESHOLD`. Update there if the curve is rebalanced.
- **CAL-238** (frontend tutorial): consume the endpoints documented above.

## Acceptance criteria checklist (CAL-235)

- [x] `guilds`, `guild_members`, `guild_events` tables created via migration
- [x] Çağ 3 XP threshold (18,000) → `tutorial_required = true` trigger
- [x] Tutorial state machine endpoints (transitions + reward grant)
- [x] Frontend API endpoints documented (this file)

---

# Lonca Raid + Tech Ağacı (CAL-240) — Faz 3

CAL-232 roadmap Faz 3 backend. Three new sub-systems plug into the same
GuildsModule and reuse the `guild_events` audit log + telemetry envelope.

## Database tables (migration `003_create_guild_raid_tech_tables.sql`)

| Table                              | Purpose                                                              |
|------------------------------------|----------------------------------------------------------------------|
| `guild_raids`                      | One row per `(guild, ISO week)` — boss HP, tier, status              |
| `guild_raid_contributions`         | Per-user damage dealt within a raid (top-5 ranking source)           |
| `guild_raid_drops`                 | Mutation essence drops awarded after raid completion (audit trail)   |
| `mutation_essence_balances`        | Per-player essence wallet (consumer: merge T4+ in CAL-233)           |
| `mutation_essence_weekly_grants`   | Per-`(user, ISO week)` grant counter — enforces 4 essence/week cap   |
| `guild_research_states`            | Active and completed tech-tree research instances per guild          |
| `guild_research_contributions`     | Per-user XP contribution to a specific research state                |

## Configuration

Hot-reloadable game-balance constants live in:
- `apps/game-server/src/guilds/raid.config.ts`  — base HP, tier multipliers,
  drop tables, weekly cap, cron expressions.
- `apps/game-server/src/guilds/research.config.ts` — three branches with
  per-level XP requirements + buff effects.

### Weekly raid

- **Schedule:** `0 0 * * 1` UTC (Pazartesi 00:00 UTC) → expires Sunday 23:59 UTC
- **Boss HP:** `RAID_BASE_HP × tier_multiplier × √(max(member_count, 3))`
  - Floor of 3 means a 1- or 2-üyeli lonca still faces the minimum baseline
    (CAL-240 acceptance criterion).
  - Tier multipliers: Normal × 1.0, Hard × 2.5, Elite × 6.0
  - Default tier picked from `guilds.tier_score`: <1K → Normal, ≥1K → Hard,
    ≥5K → Elite.
- **Drop tablosu:** Normal 1 öz / Hard 2 öz / Elite 3-4 öz
  - Top-5 katkıcıya **+1 öz** bonus.
  - **Haftalık tavan: 4 öz / oyuncu / hafta** (anti-inflation per CAL-233).
    Excess is recorded in `guild_raid_drops` with `source='capped_excess'` for
    audit and refunded as 0 essence (no carryover).
- **Tier-score reward** (`RAID_TIER_SCORE_REWARD`): Normal 50, Hard 150, Elite 400.

### Tech ağacı

- **3 dal × 3 seviye** per default catalog:
  - **Üretim** (`production_boost`): +%5 / +%10 / +%15 production buff
  - **Raid** (`raid_damage`): +%10 / +%20 / +%35 raid damage buff
  - **Genişleme** (`member_capacity`): üye kapasitesi 25 → 35 → 50 → 70
- **Haftalık 3 araştırma slotu** per guild (Pazartesi UTC ile resetlenir).
- **Süre:** 7 gün; eğer XP eşiği o sürede karşılanmazsa research `cancelled`
  durumuna düşer (`05 0 * * *` UTC sweep).
- **XP eşiği:** 100K-500K (`xp_required`), `guild_research_states` tablo CHECK.
- **Buff uygulama:** `GuildResearchService.getGuildBuffs(guildId)` tamamlanmış
  araştırmaları compose eder. `production_pct` ve `raid_damage_pct` toplanır;
  `member_capacity` en yüksek seviyeyi kullanır (additive değil).
- **Raid hasarı buff'ı** otomatik uygulanır: `GuildRaidsService.attack()` raw
  damage'ı `(1 + raid_damage_pct/100)` ile çarpar.

## Endpoints

### Raids

| Method | Path                                | Purpose                                           |
|--------|-------------------------------------|---------------------------------------------------|
| GET    | `/guilds/:id/raids/current`         | Active raid for this guild (or `null`)            |
| GET    | `/guilds/:id/raids?limit=12`        | Recent raid history (max 52)                      |
| GET    | `/guilds/raids/:raidId`             | Single raid detail                                |
| GET    | `/guilds/raids/:raidId/contributions` | Damage leaderboard for a raid                   |
| GET    | `/guilds/raids/:raidId/drops`       | Drop ledger for a completed raid                  |
| POST   | `/guilds/raids/:raidId/attack`      | `{ userId, damage }` — apply damage; auto-completes on kill |
| POST   | `/guilds/raids/:raidId/resolve-drops` | Idempotent drop-grant trigger (also runs every 5 min via cron) |
| GET    | `/guilds/users/:userId/essence`     | `{ balance }` — mutation essence wallet           |
| GET    | `/guilds/users/:userId/essence/weekly` | `{ weekStart, granted, remaining }` — current ISO week cap usage |

#### Attack response

```json
{
  "raidId": "uuid",
  "guildId": "uuid",
  "bossCurrentHp": 0,
  "bossMaxHp": 250000,
  "damageDealt": 12500,
  "totalUserDamage": 50000,
  "killedThisAttack": true,
  "status": "completed"
}
```

**Errors**: `400` if not active or zero damage; `403` if not a member; `404` if
raid id is unknown.

#### Drop resolution

`POST /guilds/raids/:raidId/resolve-drops` is **idempotent**. The first call
rolls drops, persists `guild_raid_drops` rows, and increments
`mutation_essence_balances` + `mutation_essence_weekly_grants`. Subsequent
calls return the previously-rolled awards with no balance change.

A periodic cron (`*/5 * * * *`) sweeps any completed-but-unresolved raid so
drops always flow even if the killing-blow request never explicitly hit
`/resolve-drops`.

### Research

| Method | Path                                       | Purpose                                                |
|--------|--------------------------------------------|--------------------------------------------------------|
| GET    | `/guilds/research/catalog`                 | Static catalog of research definitions (3 branches)    |
| GET    | `/guilds/:id/research`                     | All research states (active + historical) for a guild  |
| GET    | `/guilds/:id/research/active`              | Slots used in the current ISO week (max 3)             |
| GET    | `/guilds/:id/research/buffs`               | Composed `GuildBuffsSnapshot` for the guild            |
| POST   | `/guilds/:id/research/start`               | `{ researchId, level, selectedBy }` — leader/officer only |
| GET    | `/guilds/research/:stateId`                | Single research state detail                           |
| GET    | `/guilds/research/:stateId/contributions`  | Per-user XP contribution leaderboard                   |
| POST   | `/guilds/research/:stateId/contribute`     | `{ userId, xp }` — auto-completes when xp_required hit |

#### Start-research errors

- `400` Unknown `researchId` or invalid `level` for that catalog entry.
- `400` Trying to start `level > 1` before `level - 1` is `completed`.
- `403` Selector is not a `leader` or `officer` of the guild.
- `409` Same `researchId` is already active, or this `(researchId, level)`
  has already been completed by the guild, or the 3-slot weekly cap is full.

#### Buffs snapshot

```json
{
  "productionPct": 15,
  "raidDamagePct": 30,
  "memberCapacity": 50,
  "completedResearchIds": ["production_boost@1", "production_boost@2", "raid_damage@1", "member_capacity@2"]
}
```

`memberCapacity` is the **maximum** completed expansion-tier value, not a
sum (capacity tiers are replacements: 25 → 35 → 50 → 70). Production and
raid-damage percentages are additive.

## Telemetry

A new channel `guild_activity` covers raid + research with the shared
envelope (`user_id`, `guild_id`, `age`, `tier_badge`, `timestamp`,
`server_shard`, `payload.kind`, …). Event kinds:

- `raid_scheduled` — cron spawned a new raid for this guild
- `raid_join` — a player attacked the boss
- `raid_finish` — boss reached 0 HP (one event per raid)
- `raid_drop_awarded` — drop resolution granted essence (per user)
- `raid_expired` — Sunday 23:59 UTC sweep marked an undefeated raid expired
- `research_started` — leader/officer started a research instance
- `research_contrib` — XP contributed to a research state
- `research_complete` — research reached `xp_required` and unlocked its buff
- `research_cancelled` — 7-day deadline elapsed without completion

## Cron jobs (UTC)

| Cron expr     | Handler                                      | Purpose                                |
|---------------|----------------------------------------------|----------------------------------------|
| `0 0 * * 1`   | `GuildRaidsService.spawnWeeklyRaids`         | Spawn one raid per guild on Mon 00:00  |
| `59 23 * * 0` | `GuildRaidsService.expireOverdueRaids`       | Mark unfinished raids expired Sun 23:59|
| `*/5 * * * *` | `GuildRaidsService.resolveCompletedRaidDrops`| Resolve drops for completed raids      |
| `5 0 * * *`   | `GuildResearchService.cancelOverdueResearch` | Cancel research that missed the deadline|

## Acceptance criteria checklist (CAL-240)

- [x] Haftalık raid scheduler (cron) aktif, boss HP scale formülü çalışıyor
- [x] Drop tablosu implement edildi, haftalık tavan (4 öz/oyuncu) enforce ediliyor
- [x] Tech ağacı: 3 dal × araştırma seçim sistemi aktif
- [x] Buff uygulama (araştırma tamamlanınca lonca geneli) çalışıyor
- [ ] İlk 2 raid haftasında %60+ katılım, raid finish rate %85+ — telemetry
      hazır (`raid_join` / `raid_finish` events), live data ile takip edilecek
