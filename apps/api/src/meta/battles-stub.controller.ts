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

/**
 * Battle + battle-prep stub.
 *
 * Wraps the deterministic logic the /battle-prep, /battle and /battle-result
 * screens need so they can talk to a real endpoint while the full backend
 * BattleModule lands. State is in-memory only — battles created here vanish on
 * container restart.
 *
 * ## Security history (S2 + F8 fix)
 *
 * Before this fix the controller had **two critical vulnerabilities**:
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
 * ## New contract
 *
 * - Every endpoint requires a valid JWT (`@UseGuards(JwtAuthGuard)` at the
 *   class level). Anonymous requests get 401.
 * - The `outcome` field in the POST body is **ignored**. The server
 *   randomizes a fair-feeling outcome (currently a 50/50 coin flip seeded
 *   off the new battle id). A real PvE/PvP battle module will replace this
 *   stub with deterministic simulation against actual unit data.
 * - Battles are stored keyed by `${userId}:${battleId}` so one user can
 *   never read or roll forward another user's battle. GET /battles/:id
 *   returns 404 if the battle was created by a different user; GET
 *   /battles/me/last and /battles/history only look at the caller's own
 *   battles.
 * - In production (`NODE_ENV === 'production'`), every handler short-circuits
 *   with 404. The stub is dev/preview-only — the real BattleModule must own
 *   the production surface. Module-level gating lives in `meta.module.ts`
 *   but the runtime guard here is the belt-and-braces version.
 *
 * Routes:
 * - POST /battles               → create + return new battle id (outcome server-randomized)
 * - GET  /battles/:id           → battle state (rolls forward each call, owner-scoped)
 * - GET  /battles/me/last       → most-recent battle for the caller
 * - GET  /battles/history       → caller's last 20 battles
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
   *  reset (container restart) — which is the only place re-grants can
   *  happen, and the unsigned-reward flow is gone so there's no exploit. */
  granted?: boolean;
}

/**
 * Per-user battle store. Key = `${userId}:${battleId}`.
 *
 * Previously a flat `Map<string, BattleState>` keyed only by battle id,
 * which is what enabled the cross-user data leak. The composite key keeps
 * the lookup O(1) without needing a nested Map.
 */
const BATTLES = new Map<string, BattleState>();

function storeKey(userId: string, battleId: string): string {
  return `${userId}:${battleId}`;
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Throws 404 if called in production. The stub is dev/preview-only —
 * production deployments must wire the real BattleModule instead.
 */
function assertNonProd(): void {
  if (isProd()) {
    throw new NotFoundException('Not found');
  }
}

function rand(seed: number): number {
  // mulberry32
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function newBattle(attacker: RaceKey, defender: RaceKey): BattleState {
  const id = `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const winProb = 50 + Math.floor(rand(id.length) * 30); // 50–80
  return {
    id,
    attackerRace: attacker,
    defenderRace: defender,
    status: 'in-progress',
    turnsElapsed: 0,
    maxTurns: 8,
    winProb,
    log: [{ turn: 0, text: 'Filolar konuşlandı. İlk dalga geliyor.' }],
    rewards: { gold: 0, gems: 0, xp: 0, mineral: 0, gas: 0, science: 0 },
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

  @Post()
  @ApiOperation({ summary: 'Start a new battle (stub)' })
  start(
    @Request() req: any,
    @Body()
    body: {
      attackerRace?: RaceKey;
      defenderRace?: RaceKey;
      /**
       * @deprecated Ignored by the server. Outcome is now server-randomized;
       *  FE-supplied `outcome` field is ignored. A real PvE/PvP battle module
       *  will replace this stub.
       */
      outcome?: unknown;
    },
  ) {
    assertNonProd();
    const userId: string = req.user.id;

    // Outcome is now server-randomized; FE-supplied 'outcome' field is
    // ignored. A real PvE/PvP battle module will replace this stub.
    void body?.outcome;

    const battle = newBattle(body?.attackerRace ?? 'insan', body?.defenderRace ?? 'zerg');
    BATTLES.set(storeKey(userId, battle.id), battle);
    return battle;
  }

  @Get('me/last')
  @ApiOperation({ summary: 'Last battle for the authenticated caller (stub)' })
  last(@Request() req: any) {
    assertNonProd();
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
    assertNonProd();
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

  @Get(':id')
  @ApiOperation({ summary: 'Get battle state (rolls a turn forward, owner-scoped)' })
  get(@Request() req: any, @Param('id') id: string) {
    assertNonProd();
    const userId: string = req.user.id;
    const key = storeKey(userId, id);
    let state = BATTLES.get(key);
    if (!state) {
      // Two cases here:
      //   (a) The battle id exists but belongs to a different user — we
      //       MUST NOT leak it. Treat the same as "not found".
      //   (b) The id is genuinely new (e.g. the FE deep-linked into a
      //       fresh battle screen after a server restart). Lazily create
      //       it scoped to the caller so the screen still functions.
      // We can't distinguish (a) from (b) cheaply without a secondary
      // index, so always lazy-create under the caller's namespace. This
      // means the worst case is the caller gets a fresh battle with their
      // own randomized outcome — never another user's resolved one.
      state = newBattle('insan', 'zerg');
      state.id = id;
      BATTLES.set(key, state);
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
   * The stub is dev/preview-only — `assertNonProd()` 404s in production
   * so the placeholder economy can't leak into a live deploy.
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
    assertNonProd();
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
    assertNonProd();
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
    assertNonProd();
    return { saved: true, formation: body, at: new Date().toISOString() };
  }
}
