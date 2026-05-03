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
