# Source-of-Truth Ownership Matrix

This doc closes the strategic finding from punch list 2026-06-06 (workflow
`wf_cea4d7f7-3f1`) — **"api ↔ game-server arasında dağınık olan progression,
resources, race, buildings, units endpoint'leri için sahiplenme matrisi
çıkar"**. Use it as the contract for what each service owns, what it
should NEVER write, and where the live read happens.

> When you find code disagreeing with this matrix, the matrix wins
> unless the change is explicitly cross-listed in the **Pending
> reconciliation** section at the bottom.

## Services

- **api** — `apps/api/` (NestJS, port 4000) — REST gateway; player
  identity, payments, social, content metadata, retention systems.
- **game-server** — `apps/game-server/` (NestJS + Socket.io, port 3001)
  — Authoritative game state; resources, progression, combat,
  matchmaking. Everything time-sensitive or balance-relevant lives here.
- **postgres** — shared DB. Both services read/write the same physical
  tables; ownership is a code-side convention, not a permission boundary.

## Ownership table

| Concern | Owner | Tables (write) | Tables (read-only) | Notes |
|---|---|---|---|---|
| **Authentication** | api | `users`, `password_reset_tokens` | — | JWT minted here with shared secret. game-server verifies, never mints. |
| **Race selection** | api | `users.race` | — | Whitelist enforced in `UserService.selectRace` (A5). Game-server reads `users.race` for unit/building seed branches. |
| **Player profile** | api | `users.handle/avatar/title` | — | Profile metadata, cosmetic. |
| **Resources (mineral/gas/energy/science)** | game-server | `player_resources` | — | api MUST NOT write. yopmail backfill in `auth.service.ts` is a documented one-off; see `isYopmail` for delete marker. |
| **Buildings** | game-server | `player_buildings` (canonical type list `BuildingType` enum in `apps/game-server/src/buildings/entities/building.entity.ts`) | — | api's legacy `Building` entity / `PATCH /buildings/:id/upgrade` was removed in A6. api may seed starter buildings via raw SQL on select-race (see `UserService.seedStarterBuildings`) but does not own the schema. |
| **Units / Training** | game-server | `player_units`, `training_queue` | — | UnitType enum in `apps/game-server/src/units/constants/race-configs.constants.ts`. UNIT_CONFIGS is the SoT for cost / stats / requiredBuilding. |
| **Merge / Promotion** | game-server | `player_units` (delete sources + insert result) | — | `MERGE_RECIPES` in race-configs.constants.ts. |
| **XP + Level + Age** | game-server | `player_levels`, `xp_transactions` | `users` (race) | **A9**: api's `tier_progression` is a READ-ONLY mirror, pulled on each `ensureProgress`. `POST /tier/level-up` is a sync, not a write. There is no other XP source on api. |
| **Commanders** | game-server | `player_commanders` | `users` (race) | Catalog: `commanders.constants.ts`. Bonus engine, XP grants on battle, age-transition unlocks (A4 listener) all here. |
| **Battles / Matchmaking** | game-server | `battles_history`, `matchmaking_queue` | `player_units`, `player_commanders` | api has an in-memory stub controller; will deprecate when content traffic moves. |
| **Quests / Mission claims** | api | `mission_claims`, `quest_progress` | — | Mission *catalog* server-side (`missions.catalog.ts`, A1). Quest *increment* via `/quest-progress/increment` with internal-service token (B1). Progress check on claim (B2). |
| **Daily mission catalog** | api | `daily_quests` (when persisted) | — | Live progress counters keyed via `liveCountQuestId` link to `quest_progress` rows incremented by game-server. |
| **Achievements** | api | `mission_claims` | — | Achievement unlock state — currently FE-driven (pending B3 work). |
| **Alliance** | api | `alliances`, `alliance_members`, `alliance_donations`, `alliance_wars`, `alliance_applications`, `alliance_chat_messages`, etc. | — | All alliance state lives on api. game-server has no alliance domain. |
| **Shop / Inventory** | api | `shop_items`, `user_inventory`, `user_currency` | — | shop_items catalog seeded via migrations (A7 added VIP SKUs). `purchaseWithInGameCurrency` debits `user_currency`. Real-money path: separate `/payment` module. |
| **VIP** | api | `user_vip_spending`, `vip_tier_config`, `purchase_telemetry` | — | `recordPurchaseAndUpgradeVip` is the sole tier-bumping entry point. Shop module calls it on `premium_pass` purchase (A7). Wire shape: snake_case on `GET /vip/status` (A8). |
| **Missions UI catalog** | api | — | — | Pure FE display. `apps/web/src/app/missions/page.tsx` + `apps/web/src/lib/achievements.ts`. |
| **Map / PvE nodes** | game-server | `galaxy_nodes` (deterministic seed) | — | api's `target/[id]` page reads via game-server proxy. |
| **Research** | game-server | `player_research`, research timers | — | XP grants on research complete (#166). |
| **Story / Lore** | api | `story_scenes_seen` | — | Race-aware metadata. Static lex on FE (`nd-tokens.ts`). |
| **Events catalog** | api (stub) | — | — | Currently static FE-only (`apps/web/src/app/events/page.tsx`). Will move to api when wired. |

## Cross-service contracts

### JWT (cross-service)

- Both services share `JWT_SECRET` (env). `GAME_SERVER_JWT_SECRET` is
  the production explicit mirror; dev defaults to the same value.
- api MINTS; game-server VERIFIES. Both standardise on the `sub` claim
  (P5.4 / task #174).
- Internal-service-to-service calls (game-server → api `/quest-progress/
  increment`) use the `X-Internal-Service: Bearer <secret>` header.
  Secret comes from `INTERNAL_SERVICE_SECRET` (preferred) or
  `JWT_SECRET` (fallback). InternalServiceGuard, B1.

### Race enum

- Canonical Turkish set: `insan / zerg / otomat / canavar / seytan` on
  the FE lex (`nd-tokens.ts`) and game-server commanders catalog
  (`commanders.constants.ts`).
- Game-server combat / matchmaking uses English `human / zerg /
  automaton / beast / demon` (`Race` enum in
  `matchmaking/dto/join-queue.dto.ts`).
- api persists English (`users.race` = `Race` enum in
  `apps/api/src/user/entities/race.enum.ts`).
- Conversion via `toFrontendRace()` in `apps/web/src/lib/race-api.ts`
  and `RACE_ALIAS` map in `CommandersService.unlockAgeGatedCommanders`.
- **Selectable** ⊂ **defined**: API whitelists `[HUMAN, ZERG]` until the
  otomat/canavar/şeytan kits ship (A5).

### Cross-service writes (rule)

When a feature in service X needs to mutate state owned by service Y:

- Y exposes an HTTP endpoint guarded by InternalServiceGuard (or
  signed-JWT with the shared secret).
- X calls it fire-and-forget where possible (game-server →
  quest-progress notifier pattern).
- Synchronous return values are only for primary HTTP flows the user
  is waiting on (purchase, level-up confirmation).

## Pending reconciliation

These don't fit cleanly into the matrix yet. They're being kept on
this list deliberately:

1. **In-memory stub endpoints on api** — battles, buffs, chat,
   commanders meta, formations, missions stubs. Each needs to either
   move to game-server (combat events) or pick a DB-backed implementation
   (alliance chat). Tracked as task #200.

2. **Achievement unlock tracking** (audit B3) — needs a
   `user_achievements` table on api owned by api, with event hooks from
   game-server (battle_won, mineral_collected_N) over the internal-
   service channel.

3. **3-race trainable kits** (audit A5) — units + costs + balance + DB
   enum migration. Whitelist (A5) is a placeholder; reconciliation =
   real catalog.

4. **CI `dist == src` check** (audit strategic #2) — pipeline addition.
   Not a code change in the matrix sense.

5. **OpenAPI / contract test pipeline** (audit strategic #4) — would
   surface wire-format drift automatically. Add to `.github/workflows/`.

## When in doubt

If a finding has the shape "service X writes a column owned by service
Y" or "two services maintain parallel curves of the same balance
table" — re-read this matrix. If the conflict isn't already on the
**Pending reconciliation** list, it's a real bug. Open a follow-up.
