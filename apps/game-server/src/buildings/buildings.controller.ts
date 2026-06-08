import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { ResourcesService } from '../resources/resources.service';
import { StartConstructionDto } from './dto/start-construction.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { InternalServiceGuard } from '../auth/internal-service.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BUILDING_CONFIGS } from './buildings.constants';
import { BuildingType } from './entities/building.entity';
import { ProgressionService } from '../progression/progression.service';
import { XpSource } from '../progression/config/level-config';

@Controller('buildings')
export class BuildingsController {
  private readonly logger = new Logger(BuildingsController.name);

  /**
   * Per-call sanity ceilings for /resources/battle-reward.
   *
   * Even when the caller proves they're an internal service, we clamp
   * each grant to numbers that comfortably exceed any honest battle /
   * mission payout but are nowhere near a wallet cap. This means a
   * compromised internal-secret can't be used to mint to-cap in one
   * shot — the attacker would need thousands of POSTs, which is
   * observable.
   *
   * Values are sized off the battles-stub upper bounds
   * (mineral 1000 + buffer ×~5, gas 320 ×~6, science 35 ×~3) and a
   * generous daily XP cap (150k matches daily-engagement's per-user
   * ceiling).
   */
  private static readonly PER_CALL_MAX = {
    mineral: 5_000,
    gas:     2_000,
    science: 100,
    xp:      150_000,
  } as const;

  constructor(
    private readonly buildings: BuildingsService,
    private readonly resources: ResourcesService,
    private readonly progression: ProgressionService,
  ) {}

  /** GET /api/buildings — list owned buildings for the authenticated player */
  @Get()
  @UseGuards(HttpJwtGuard)
  async listBuildings(@CurrentUser() userId: string) {
    return this.buildings.getBuildings(userId);
  }

  /** GET /api/buildings/types — public: building catalog (costs, times, caps) */
  @Get('types')
  getBuildingTypes() {
    return Object.values(BuildingType).map((type) => ({
      type,
      ...BUILDING_CONFIGS[type],
    }));
  }

  /** POST /api/buildings — start construction of a new building */
  @Post()
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async startConstruction(@CurrentUser() userId: string, @Body() dto: StartConstructionDto) {
    return this.buildings.startConstruction(userId, dto);
  }

  /** POST /api/buildings/:id/upgrade — upgrade an existing building */
  @Post(':id/upgrade')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeBuilding(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) buildingId: string,
  ) {
    return this.buildings.upgradeBuilding(userId, buildingId);
  }

  /** DELETE /api/buildings/:id — destroy a building */
  @Delete(':id')
  @UseGuards(HttpJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroyBuilding(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) buildingId: string,
  ) {
    await this.buildings.destroyBuilding(userId, buildingId);
  }

  /** GET /api/buildings/resources — live resource snapshot */
  @Get('/resources')
  @UseGuards(HttpJwtGuard)
  async getResources(@CurrentUser() userId: string) {
    return this.resources.getSnapshot(userId);
  }

  /**
   * POST /api/buildings/resources/battle-reward
   *
   * Credits battle / mission rewards (mineral, gas, science, xp) to a
   * player's wallet.
   *
   * ## Security history (S3 + F3 fix — audit 2026-06-06)
   *
   * Previously gated by `HttpJwtGuard` and trusted the caller's body
   * verbatim. Any logged-in player could:
   *
   *   curl -X POST $GAME/api/buildings/resources/battle-reward \
   *     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
   *     -d '{"mineral":9999999999,"gas":9999999999,"science":9999999999,"xp":9999999999}'
   *
   * and the service would clamp to their storage caps — instant wallet
   * cap-out + max-out XP / level. There was zero rate limit and the
   * userId came from the JWT (`@CurrentUser()`) which the player owns,
   * so even with idempotency keys they could grant to themselves all
   * day.
   *
   * The fix swaps the guard to `InternalServiceGuard` — the same one
   * `/progression/award-xp` already uses (S4 + F4-econ). The endpoint
   * is now **callable only by another backend service** signing
   * requests with `X-Internal-Service: Bearer <secret>` where
   * `<secret>` matches the shared `INTERNAL_SERVICE_SECRET` / `JWT_SECRET`.
   *
   * Concretely:
   *   - `BattleScreen` no longer calls this endpoint directly. Instead
   *     it calls `POST /battles/:id/claim-reward` on api, which looks
   *     up the server-stored rewards (battles-stub never echoes
   *     client-supplied amounts) and fans out here with the internal
   *     header.
   *   - `DailyEngagementService.creditWallet` already centralised the
   *     other call path and now adds the same header.
   *   - Future `BattleModule` (the real one replacing battles-stub)
   *     will call this directly in-process via `ResourcesService.grant`
   *     and probably not via HTTP at all.
   *
   * The body also now carries an explicit `userId` (required) — the
   * internal caller is asserting *which* player to credit, so we can't
   * rely on a JWT `sub` claim anymore.
   *
   * Defense-in-depth: per-call ceilings (see `PER_CALL_MAX`) so even a
   * leaked internal secret can't mint to-cap in a single POST. Out-of-
   * band amounts return 400 rather than silently clamping — we want
   * such calls to be loud in the logs.
   */
  @Post('/resources/battle-reward')
  @UseGuards(InternalServiceGuard)
  @HttpCode(HttpStatus.OK)
  async grantBattleReward(
    @Body()
    body: {
      userId?: string;
      mineral?: number;
      gas?: number;
      science?: number;
      xp?: number;
      /** Optional opaque source tag for audit logs (e.g. 'battle:<id>',
       *  'mission:<id>'). Not used for idempotency yet; the real
       *  BattleModule will track granted rewards in its own table. */
      source?: string;
    },
  ) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('reward body required');
    }
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      throw new BadRequestException('userId required');
    }

    const cap = BuildingsController.PER_CALL_MAX;
    const exceeds = (field: 'mineral' | 'gas' | 'science' | 'xp'): boolean => {
      const v = body[field];
      return typeof v === 'number' && Number.isFinite(v) && v > cap[field];
    };
    if (exceeds('mineral') || exceeds('gas') || exceeds('science') || exceeds('xp')) {
      this.logger.warn(
        `battle-reward rejected for ${userId}: per-call cap exceeded ` +
          `(mineral=${body.mineral} gas=${body.gas} science=${body.science} xp=${body.xp}, ` +
          `source=${body.source ?? 'unknown'})`,
      );
      throw new BadRequestException(
        'reward amount exceeds per-call ceiling — internal callers must split larger grants',
      );
    }

    // ── Level XP (cycle-28 BATTLE_REWARD_XP) ────────────────────────────
    // The `xp` field used to be cap-checked then SILENTLY DROPPED, so the
    // primary quick-battle (PvE) surface granted zero character progression.
    // Award it through the canonical progression path: the source tag encodes
    // the outcome (pve_win:/pve_loss:) → a real XpSource (amount + level
    // scaling + daily caps live there), and the full tag is the awardXp
    // referenceId so a battles-stub retry is idempotent (UNIQUE(user,source,
    // ref) → 23505 no-ops). Best-effort + fire-and-forget like the commander-XP
    // fan-out: a progression hiccup must not fail the resource grant, and the
    // FE picks up the gain via the xp_gained / level_up socket events awardXp
    // emits.
    const src = typeof body.source === 'string' ? body.source : '';
    const xpSource = src.startsWith('pve_win')
      ? XpSource.PVE_WIN
      : src.startsWith('pve_loss')
        ? XpSource.PVE_LOSS
        : null;
    if (xpSource && typeof body.xp === 'number' && body.xp > 0) {
      void this.progression
        .awardXp({ userId, source: xpSource, referenceId: src })
        .catch((err: unknown) =>
          this.logger.warn(
            `battle-reward awardXp skipped user=${userId} source=${src}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
        );
    }

    const grant: { mineral?: number; gas?: number; science?: number } = {};
    if (body.mineral && body.mineral > 0) grant.mineral = Math.floor(body.mineral);
    if (body.gas     && body.gas     > 0) grant.gas     = Math.floor(body.gas);
    if (body.science && body.science > 0) grant.science = Math.floor(body.science);

    if (Object.keys(grant).length === 0) {
      return this.resources.getSnapshot(userId);
    }

    this.logger.log(
      `battle-reward grant user=${userId} source=${body.source ?? 'unknown'} ` +
        `mineral=${grant.mineral ?? 0} gas=${grant.gas ?? 0} science=${grant.science ?? 0}`,
    );
    return this.resources.grant(userId, grant);
  }

  /**
   * POST /api/buildings/internal/recalculate-rates
   *
   * Force a fresh recompute of `player_resources.{mineral,gas,energy,
   * population}_per_tick` from the player's current set of ACTIVE
   * buildings.
   *
   * ## Why this exists (F2 fix — audit 2026-06-06)
   *
   * `apps/api` seeds a fresh player's starter buildings via raw SQL
   * (`UserService.seedStarterBuildings`) the moment they pick a race.
   * It can't call `BuildingsService.recalculateProductionRates()`
   * directly — that service lives in this `game-server` process.
   *
   * Without a cross-service hook the rates stay at the migration
   * defaults (0 for every resource). `ResourceTickWorker.applyTickBulk`
   * filters its UPDATE on `*_per_tick > 0`, so a brand-new player's
   * wallet never advanced from day 0:
   *
   *   - mineral_per_tick = 0 → no minerals
   *   - gas_per_tick     = 0 → no gas → can't afford gas-cost building
   *   - energy_per_tick  = 0 → grid stays flat
   *
   * Cycle 4's gas_refinery swap fixed the *building* but not the
   * *propagation* — rates only recompute on
   * startConstruction / upgradeBuilding / destroyBuilding / completeOverdueConstructions,
   * none of which `api`'s seed path triggers.
   *
   * ## Contract
   *
   * - Gated by `InternalServiceGuard` (header
   *   `X-Internal-Service: Bearer <INTERNAL_SERVICE_SECRET>`). The FE
   *   never calls this; only sibling backend services do.
   * - Body: `{ userId: string }`. We don't trust the caller's JWT
   *   because there is none — `api` makes this call right after the
   *   player picks their race, asserting *which* player to recompute.
   * - Idempotent: safe to call repeatedly. Each call replays the same
   *   read+write against the player's active buildings.
   * - Returns 200 with a small ack payload so the caller can confirm
   *   the recompute ran (used by smoke tests). If `userId` is bad we
   *   still return 200 — `recalculateProductionRates` is robust to an
   *   empty active-buildings list (yields a zero update) and we don't
   *   want a malformed userId from the caller to surface as a 500 that
   *   rolls back unrelated transactions on their side.
   */
  @Post('/internal/recalculate-rates')
  @UseGuards(InternalServiceGuard)
  @HttpCode(HttpStatus.OK)
  async recalculateRatesInternal(
    @Body() body: { userId?: string },
  ): Promise<{ ok: true; userId: string }> {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('body required');
    }
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      throw new BadRequestException('userId required');
    }

    this.logger.log(`internal recalc rates user=${userId}`);
    await this.buildings.recalculateProductionRates(userId);
    return { ok: true, userId };
  }
}
