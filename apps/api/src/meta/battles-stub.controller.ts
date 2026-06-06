import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestProgressService } from '../modules/quest-progress/quest-progress.service';

/**
 * Battle + battle-prep controller (production-active, name kept for history).
 *
 * Wraps the deterministic logic the /battle-prep, /battle and /battle-result
 * screens need. Until a real `BattleModule` lands with persistent battle
 * tables, this controller IS the production battles surface — the "Stub"
 * suffix is misleading and kept only to avoid a churny rename. State is
 * in-memory only; battles vanish on container restart, but the wallet
 * grants they fan out to game-server are persistent (server-authoritative).
 *
 * ## Security history (S2 + F8 fix)
 *
 * Before the cycle-3 fix the controller had **two critical vulnerabilities**:
 *
 * 1. **Client-controlled `outcome`** — POST /battles accepted
 *    `{ outcome: 'won' }` from the body and immediately returned a 'won'
 *    BattleState with full rewards (gold: 2500, gems: 50, xp: 320,
 *    mineral: 1000, gas: 320, science: 35). The frontend then forwarded
 *    those rewards to the battle-reward endpoint, letting any client mint
 *    arbitrary currency by POSTing a single JSON body.
 *
 * 2. **Device-global state leak** — the in-memory `BATTLES` Map was keyed by
 *    battle id with no user scoping. GET /battles/me/last returned
 *    `[...BATTLES.values()].pop()` — i.e. whichever battle was most
 *    recently created by **any** caller on the server, leaking arbitrary
 *    users' battle outcomes / rewards to anyone. GET /battles/:id and
 *    /battles/history had the same scoping gap.
 *
 * ## Cycle-3-03 + DRIFT-1 fix (this revision)
 *
 * After cycle 3 a third bug emerged: POST /battles returned
 * `status="in-progress"` with `rewards={0,…,0}` and only `advance()` (on
 * GET /battles/:id, rolled forward turn-by-turn) ever wrote real rewards.
 * BattleScreen calls `claim-reward` immediately after POST — so the battle
 * was never resolved, `claim-reward` 404'd on `status !== 'won' | 'lost'`,
 * and every battle credited 0 to the wallet. Additionally, the module-level
 * gate in `meta.module.ts` removed the controller in production entirely,
 * so production 404'd outright. Net: zero-credit battles everywhere.
 *
 * Fix:
 * - POST /battles now **resolves the battle synchronously**: outcome is
 *   computed from `attacker.power vs defender.power + small mulberry32
 *   jitter`, rewards are rolled from the existing victory/defeat tables,
 *   and the returned `BattleState` has terminal `status="won"|"lost"` plus
 *   non-zero rewards. `claim-reward` succeeds on the first call.
 * - `assertNonProd()` is removed from every handler. The module-level gate
 *   in `meta.module.ts` is loosened to always register the controller. This
 *   IS the production battles module until a real one ships.
 *
 * ## New contract
 *
 * - Every endpoint requires a valid JWT (`@UseGuards(JwtAuthGuard)` at the
 *   class level). Anonymous requests get 401.
 * - The `outcome` field in the POST body is **ignored**. The server
 *   computes the outcome from per-race power values plus a mulberry32 jitter
 *   seeded off the new battle id. A future real PvE/PvP battle module will
 *   replace this with deterministic simulation against actual unit data.
 * - Battles are stored keyed by `${userId}:${battleId}` so one user can
 *   never read or roll forward another user's battle. GET /battles/:id
 *   returns 404 if the battle was created by a different user; GET
 *   /battles/me/last and /battles/history only look at the caller's own
 *   battles.
 * - Production-active: no `NODE_ENV` short-circuit. The cross-user scoping
 *   + server-randomized outcome from S2/F8 still hold; only the "dev-only"
 *   404 wrapper is dropped.
 *
 * Routes:
 * - POST /battles               → create + immediately resolve battle (outcome server-computed)
 * - GET  /battles/:id           → battle state (owner-scoped; resolves lazily if first read)
 * - GET  /battles/me/last       → most-recent battle for the caller
 * - GET  /battles/history       → caller's last 20 battles
 * - POST /battles/:id/claim-reward → credit caller's wallet, idempotent
 * - GET  /battle-prep/formation → returns the saved formation (stub default)
 * - POST /battle-prep/formation → echo back (no persistence in stub)
 */

type RaceKey = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

interface BattleState {
  id: string;
  attackerRace: RaceKey;
  defenderRace: RaceKey;
  status: 'pending' | 'in-progress' | 'won' | 'lost';
  turnsElapsed: number;
  maxTurns: number;
  /** 0–100 prediction of victory at the current turn. */
  winProb: number;
  log: { turn: number; text: string }[];
  rewards: { gold: number; gems: number; xp: number; mineral: number; gas: number; science: number };
  createdAt: string;
  /** True once `claim-reward` has fanned the wallet grant out to game-server.
   *  Acts as in-memory idempotency until a real BattleModule with a
   *  battle_grants table ships. Cleared whenever the in-memory store is
   *  reset (container restart) — see the BATTLES Map JSDoc below for the
   *  full restart-vs-re-claim analysis (HIGH ECON-C8-02). Short version:
   *  the flag clears together with the battle row that carried it, so a
   *  post-restart claim-reward 404s before the `granted` check matters. */
  granted?: boolean;
}

/**
 * Per-user battle store. Key = `${userId}:${battleId}`.
 *
 * Previously a flat `Map<string, BattleState>` keyed only by battle id,
 * which is what enabled the cross-user data leak. The composite key keeps
 * the lookup O(1) without needing a nested Map.
 *
 * ## Restart semantics (HIGH ECON-C8-02 note)
 *
 * The Map is module-level and in-memory — every entry, including the
 * `granted` idempotency flag, is wiped on container restart. The cycle-8
 * audit asked whether an attacker who recorded an old `battleId` while
 * `granted=true` could replay claim-reward after a restart and re-credit
 * (because `granted` clears to `undefined`).
 *
 * The answer is no, **provided POST /battles is the only mint path**:
 *
 *   1. POST /battles is the only endpoint that calls `newBattle()` with a
 *      fresh server-minted id, scoped under the caller's userId. The
 *      attacker cannot influence that id.
 *   2. GET /battles/:id with an id the caller never POSTed currently
 *      lazy-creates (see `get()` below). Post-A2 strict-no-lazy-create
 *      fix that lazy branch is removed and GET/claim 404 on missing keys.
 *      Until that lands, the lazy branch always produces a *fresh*
 *      `BattleState` with `granted=undefined` — i.e. a fresh battle owned
 *      by the caller, not a re-grant of an old battle.
 *   3. claim-reward only credits when the requested key exists in the
 *      Map AND `granted !== true`. After restart, the old key is gone
 *      entirely, so claim 404s before the `granted` check matters.
 *
 * In short: clearing `granted` on restart is harmless because the
 * battle row that carried it is cleared in the same step. No cross-restart
 * re-claim path exists today; the strict A2 fix forecloses the
 * post-restart "lazy-mint a winning battle" path as defense in depth.
 *
 * A real `battle_grants(battle_id UNIQUE, user_id, granted_at)` table is
 * the long-term answer (survives restart, blocks any future mint path),
 * tracked under the deferred BattleModule work — not needed today.
 */
const BATTLES = new Map<string, BattleState>();

function storeKey(userId: string, battleId: string): string {
  return `${userId}:${battleId}`;
}

function rand(seed: number): number {
  // mulberry32
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Per-race power proxy used by the synchronous outcome resolver. Real
 * BattleModule will compute power from the player's actual fleet/units;
 * for now these are flat balance-targeted values that keep the matchup
 * close enough that the mulberry32 jitter still swings results either way.
 */
const RACE_POWER: Record<RaceKey, number> = {
  insan:    5_280,
  zerg:     5_120,
  otomat:   5_400,
  canavar:  5_360,
  seytan:   5_200,
};

/**
 * Hash the battle id into a stable seed for mulberry32. We can't use the
 * raw string with our numeric rand(), so fold the char codes. The result
 * differs per battle id so two POSTs in the same second still roll
 * independent outcomes / rewards.
 */
function seedFromId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Create + immediately resolve a battle.
 *
 * Cycle-3-03 fix: previously this returned `status="in-progress"` with
 * zero rewards, leaving resolution to `advance()` (which only fires on
 * GET /battles/:id polls). BattleScreen never polls — it claim-rewards
 * straight after POST — so the battle stayed in-progress, claim-reward
 * 404'd, and wallet credit was always 0.
 *
 * Outcome: attacker_power vs defender_power, with a ±15% mulberry32
 * jitter so identical matchups still vary.
 * Rewards: the same victory/defeat reward tables `advance()` used at
 * `turnsElapsed >= maxTurns`. We surface `turnsElapsed = maxTurns` so the
 * `winProb` chip in the UI matches the resolved outcome.
 *
 * ## Cycle-5 / ECON-C8-01 hardening (this revision)
 *
 * `newBattle` is now invoked **only from POST /battles**. The previous
 * lazy-create branch in GET /:id is gone — see the controller's GET
 * handler for the vulnerability writeup. Because the only caller is the
 * POST path, and the POST path is the single place that wires
 * `granted`-flag idempotency + quest-progress notify, every materialized
 * battle goes through the same audit path.
 *
 * The seed source is still the freshly-minted server `id` (not any
 * client-supplied path id), so an attacker cannot massage outcome
 * probability by retrying with hand-picked ids. The new id is the only
 * value subsequently bound to the per-user store key.
 */
function newBattle(attacker: RaceKey, defender: RaceKey): BattleState {
  const id = `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const seed = seedFromId(id);

  const attackerPower = RACE_POWER[attacker] ?? 5_000;
  const defenderPower = RACE_POWER[defender] ?? 5_000;

  // ±15% jitter on each side, sourced from mulberry32 so the outcome is
  // deterministic given the battle id (helps reproducible bug triage).
  const jitterA = 0.85 + rand(seed) * 0.30;
  const jitterD = 0.85 + rand(seed ^ 0x9e3779b9) * 0.30;
  const effectiveA = attackerPower * jitterA;
  const effectiveD = defenderPower * jitterD;

  const won = effectiveA >= effectiveD;
  const winProb = Math.max(
    20,
    Math.min(95, Math.round((effectiveA / (effectiveA + effectiveD)) * 100)),
  );

  // Roll rewards from the same tables `advance()` used at terminal state.
  // Re-seed the roll so it doesn't perfectly correlate with the outcome.
  const roll = rand(seed ^ 0xdeadbeef);

  const rewards = won
    ? {
        gold:    1500 + Math.floor(roll * 1000),
        gems:    50,
        xp:      320,
        mineral: 400 + Math.floor(roll * 600),
        gas:     120 + Math.floor(roll * 200),
        science: 15  + Math.floor(roll * 20),
      }
    : { gold: 250, gems: 0, xp: 80, mineral: 60, gas: 20, science: 3 };

  const log = [
    { turn: 0, text: 'Filolar konuşlandı. İlk dalga geliyor.' },
    {
      turn: 1,
      text: won
        ? 'Düşman filosu yok edildi. Zafer.'
        : 'Filomuz geri çekildi. Yenilgi kabul edildi.',
    },
  ];

  return {
    id,
    attackerRace: attacker,
    defenderRace: defender,
    status: won ? 'won' : 'lost',
    turnsElapsed: 1,
    maxTurns: 8,
    winProb,
    log,
    rewards,
    createdAt: new Date().toISOString(),
  };
}

function advance(state: BattleState): BattleState {
  if (state.status !== 'in-progress') return state;
  state.turnsElapsed += 1;
  const roll = rand(state.turnsElapsed * 13 + state.id.length);
  if (state.turnsElapsed >= state.maxTurns) {
    if (state.winProb >= 60) {
      state.status = 'won';
      state.rewards = {
        gold: 1500 + Math.floor(roll * 1000),
        gems: 50,
        xp: 320,
        mineral: 400 + Math.floor(roll * 600),
        gas: 120 + Math.floor(roll * 200),
        science: 15 + Math.floor(roll * 20),
      };
      state.log.push({ turn: state.turnsElapsed, text: 'Düşman filosu yok edildi. Zafer.' });
    } else {
      state.status = 'lost';
      state.rewards = { gold: 250, gems: 0, xp: 80, mineral: 60, gas: 20, science: 3 };
      state.log.push({ turn: state.turnsElapsed, text: 'Filomuz geri çekildi. Yenilgi kabul edildi.' });
    }
  } else {
    state.winProb = Math.max(20, Math.min(95, state.winProb + Math.round(roll * 10 - 4)));
    state.log.push({
      turn: state.turnsElapsed,
      text:
        roll < 0.25
          ? 'Sniper menzile girdi.'
          : roll < 0.5
            ? 'Genetik Savaşçı stim aktif.'
            : roll < 0.75
              ? 'Düşman flagman hasar aldı.'
              : 'Mecha Walker hattı korudu.',
    });
  }
  return state;
}

@ApiTags('battles (stub)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('battles')
export class BattlesStubController {
  private readonly logger = new Logger(BattlesStubController.name);

  constructor(private readonly questProgress: QuestProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new battle (stub)' })
  start(
    @Request() req: any,
    @Body()
    body: {
      attackerRace?: RaceKey;
      defenderRace?: RaceKey;
      /**
       * @deprecated Ignored by the server. Outcome is now server-computed
       *  (attacker power vs defender power + mulberry32 jitter) and the
       *  battle resolves synchronously inside POST /battles. A real PvE/PvP
       *  battle module will replace this stub.
       */
      outcome?: unknown;
    },
  ) {
    const userId: string = req.user.id;

    // Outcome is now server-randomized; FE-supplied 'outcome' field is
    // ignored. A real PvE/PvP battle module will replace this stub.
    void body?.outcome;

    const battle = newBattle(body?.attackerRace ?? 'insan', body?.defenderRace ?? 'zerg');
    BATTLES.set(storeKey(userId, battle.id), battle);

    // QUEST PROGRESS HOOK — battle.won (HIGH F3 fix)
    //
    // Before this fix BattlesStubController never told the quest-progress
    // service that a battle was won, so:
    //   - q1 "3 PvE savaş kazan" (liveCountQuestId='battles_won') never
    //     ticked
    //   - q5 "1 PvP zafer"        (liveCountQuestId='battles_won') never
    //     ticked
    //   - ach-1 "İlk Kan" precondition (battles.winner_id = $userId) is
    //     unaffected here because the real `battles` table is owned by
    //     game-server's PvP flow; the FE-driven /battle path through this
    //     stub never wrote to it. The precondition still fail-closes on
    //     claim, which is the right behaviour.
    //
    // We bump both 'battles_won' (canonical counter shared by q1/q5) and
    // 'pve_won' (future PvE-only quest selector). The stub does not
    // distinguish PvP from PvE yet — treat every claim through this path
    // as PvE for the FE single-player /battle route.
    //
    // Idempotency: the referenceId derives from the freshly minted
    // battleId, so a retry of POST /battles is naturally a new event;
    // and the api-side QuestProgressService dedupes on the same key so a
    // claim-reward replay (which doesn't re-enter this code path) is
    // covered.
    if (battle.status === 'won') {
      try {
        const refId = `battle:${battle.id}`;
        void this.questProgress
          .incrementProgress(userId, 'battles_won', 1, refId)
          .catch((err) => {
            this.logger.warn(
              `quest-progress battles_won bump failed userId=${userId} battleId=${battle.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        void this.questProgress
          .incrementProgress(userId, 'pve_won', 1, refId)
          .catch((err) => {
            this.logger.warn(
              `quest-progress pve_won bump failed userId=${userId} battleId=${battle.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      } catch (err) {
        // Defensive: never let a quest-progress failure roll back the
        // battle response. The FE has already shown the win.
        this.logger.warn(
          `quest-progress hook threw synchronously userId=${userId} battleId=${battle.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return battle;
  }

  @Get('me/last')
  @ApiOperation({ summary: 'Last battle for the authenticated caller (stub)' })
  last(@Request() req: any) {
    const userId: string = req.user.id;
    const prefix = `${userId}:`;
    let latest: BattleState | null = null;
    for (const [k, v] of BATTLES) {
      if (!k.startsWith(prefix)) continue;
      if (!latest || new Date(v.createdAt).getTime() > new Date(latest.createdAt).getTime()) {
        latest = v;
      }
    }
    return latest;
  }

  @Get('history')
  @ApiOperation({ summary: 'My last 20 battles (stub — caller-scoped)' })
  history(@Request() req: any) {
    const userId: string = req.user.id;
    const prefix = `${userId}:`;
    const mine: BattleState[] = [];
    for (const [k, v] of BATTLES) {
      if (k.startsWith(prefix)) mine.push(v);
    }
    mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const entries = mine.slice(0, 20).map((b) => ({
      id: b.id,
      outcome: b.status,
      opponent: b.defenderRace,
      score: b.rewards.gold + b.rewards.xp * 5,
      mvp: null as string | null,
      when: b.createdAt,
    }));
    return { total: entries.length, entries };
  }

  /**
   * GET /battles/:id
   *
   * Returns the per-user resolved battle state. Strict POST-then-GET
   * contract — see vulnerability writeup below.
   *
   * ## ECON-C8-01 fix (cycle 8)
   *
   * Before this revision, GET /:id had a "lazy create" branch: if
   * `BATTLES.get(${userId}:${id})` was undefined the handler **minted a
   * fresh battle** via `newBattle('insan','zerg')`, overwrote its id with
   * the URL `:id`, and stored it under the caller's namespace. Because
   * `newBattle`'s outcome derives from the auto-generated server id (NOT
   * the URL id), every GET to a previously-unseen id materialized a
   * brand-new battle whose outcome was effectively a fresh ~50% coin
   * flip. An attacker could:
   *
   *   1. Loop GET /battles/<random-uuid> with their JWT until the
   *      response showed `status: "won"` with non-zero rewards;
   *   2. Then POST /battles/<that-uuid>/claim-reward to credit the
   *      server-stored rewards via the internal-service fan-out.
   *
   * There was no POST consent, no per-call rate limit, and the in-memory
   * `granted` idempotency flag only blocks repeated claims on the **same
   * minted battle** — the attacker simply moved to the next random id.
   * The quest-progress notify (cycle-5 F3 fix) also lived in POST only,
   * so this path bypassed quest tracking entirely.
   *
   * Strict contract going forward: battles MUST originate from POST
   * /battles. POST is the single point where (a) outcome is rolled,
   * (b) per-battle `granted` idempotency is bound, and (c) the
   * `battles_won` / `pve_won` quest-progress events fire. If the battle
   * does not exist under the caller's namespace, this handler returns
   * 404 with a Turkish-localized message — no implicit creation, no
   * leakage of cross-user ids (the lookup is owner-scoped and a miss
   * here is indistinguishable from "owned by a different user", which
   * is the desired behaviour).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get battle state (rolls a turn forward, owner-scoped)' })
  get(@Request() req: any, @Param('id') id: string) {
    const userId: string = req.user.id;
    const key = storeKey(userId, id);
    const state = BATTLES.get(key);
    if (!state) {
      // Strict POST-then-GET. Either the id is genuinely unknown, or it
      // belongs to a different user — both surface as 404 so an attacker
      // cannot probe other users' battle ids. The previous lazy-create
      // branch was the ECON-C8-01 vulnerability described in the JSDoc
      // above. Do not reintroduce it without re-auditing the
      // claim-reward flow.
      throw new NotFoundException('Bu savaş bulunamadı');
    }
    return advance(state);
  }

  /**
   * POST /battles/:id/claim-reward
   *
   * Server-authoritative wallet credit for a resolved battle.
   *
   * Replaces the previous flow where `BattleScreen` POSTed the rewards
   * object straight to game-server's `/api/buildings/resources/battle-reward`
   * — that endpoint trusted the body, so anyone with a valid JWT could
   * mint wallet resources arbitrarily. (S3 + F3 audit, 2026-06-06.)
   *
   * Contract:
   *   - Battle must exist in the per-user `BATTLES` store. 404 otherwise
   *     (so callers can't fish for other users' rewards by guessing ids).
   *   - Battle must be **resolved** (`status === 'won' | 'lost'`). 400
   *     if still in-progress — prevents an attacker from claiming on a
   *     freshly-created in-progress battle to "lock in" then re-roll.
   *   - Idempotent per battle: once `granted` is set, subsequent calls
   *     return the recorded amounts without crediting again. This is the
   *     in-memory equivalent of a UNIQUE constraint until a real
   *     BattleModule with a battle_grants table ships.
   *   - The amounts credited come from **the server-stored
   *     `state.rewards`**. The FE has no input into what's granted; if
   *     the body carries anything it's ignored.
   *   - Fan-out to game-server is signed with the
   *     `X-Internal-Service: Bearer <secret>` header that
   *     `InternalServiceGuard` checks. The user JWT never reaches the
   *     wallet endpoint anymore.
   *
   * Production-active (cycle-3-03 fix): this controller is the real
   * production battles surface until a dedicated BattleModule lands. The
   * NODE_ENV gate is gone — server-randomized outcome + per-user scoping +
   * server-stored rewards are sufficient to keep the economy honest.
   */
  @Post(':id/claim-reward')
  @ApiOperation({
    summary:
      "Credit the caller's wallet with this battle's server-stored rewards (idempotent).",
  })
  async claimReward(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{
    battleId: string;
    status: BattleState['status'];
    alreadyClaimed: boolean;
    walletCredited: boolean;
    rewards: BattleState['rewards'];
  }> {
    const userId: string = req.user.id;
    const key = storeKey(userId, id);
    const state = BATTLES.get(key);
    if (!state) {
      // Either nonexistent or owned by a different user — same response
      // shape so callers can't probe the difference.
      throw new NotFoundException('battle not found');
    }
    if (state.status !== 'won' && state.status !== 'lost') {
      throw new NotFoundException('battle not yet resolved');
    }

    if (state.granted) {
      return {
        battleId: state.id,
        status: state.status,
        alreadyClaimed: true,
        walletCredited: false,
        rewards: state.rewards,
      };
    }

    const credited = await this.creditWallet(userId, state);
    if (credited) {
      state.granted = true;
    }
    return {
      battleId: state.id,
      status: state.status,
      alreadyClaimed: false,
      walletCredited: credited,
      rewards: state.rewards,
    };
  }

  /** Sign and fan out the wallet grant to game-server. Mirrors
   *  `daily-engagement.service.ts:creditWallet` so the contract stays
   *  consistent. Never throws — wallet hiccups must not roll back the
   *  battle's `granted` flag here, but a non-2xx leaves `granted` false
   *  so a retry can still succeed. */
  private async creditWallet(userId: string, state: BattleState): Promise<boolean> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/buildings/resources/battle-reward`;

    const serviceSecret =
      process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET;
    if (!serviceSecret) {
      this.logger.warn(
        'battle claim-reward skipped wallet fan-out — INTERNAL_SERVICE_SECRET / JWT_SECRET unset',
      );
      return false;
    }

    const body = {
      userId,
      mineral: state.rewards.mineral ?? 0,
      gas:     state.rewards.gas     ?? 0,
      science: state.rewards.science ?? 0,
      xp:      state.rewards.xp      ?? 0,
      source:  `battle:${state.id}`,
    };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': `Bearer ${serviceSecret}`,
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(
          `battle-reward fan-out non-2xx ${res.status} body=${text.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `battle-reward fan-out failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}

@ApiTags('battle-prep (stub)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('battle-prep')
export class BattlePrepStubController {
  @Get('formation')
  @ApiOperation({ summary: 'Saved formation for this player (stub default)' })
  getFormation() {
    return {
      id: 'fm_default',
      name: 'Saldırı Hattı',
      slots: [
        { idx: 0, unitType: 'marine',        count: 6 },
        { idx: 1, unitType: 'medic',         count: 2 },
        { idx: 2, unitType: 'siege_tank',    count: 2 },
        { idx: 3, unitType: 'mecha_walker',  count: 1 },
        { idx: 4, unitType: 'captain',       count: 1 },
      ],
      power: 5_280,
    };
  }

  @Post('formation')
  @ApiOperation({ summary: 'Save formation (stub — echoes input)' })
  setFormation(@Body() body: unknown) {
    return { saved: true, formation: body, at: new Date().toISOString() };
  }
}
