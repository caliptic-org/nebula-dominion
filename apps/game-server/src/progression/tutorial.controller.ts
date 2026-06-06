import { BadRequestException, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResourcesService } from '../resources/resources.service';
import { ProgressionService } from './progression.service';
import { XpSource } from './config/level-config';
import { XpTransaction } from './entities/xp-transaction.entity';

/**
 * One-shot tutorial completion grant.
 *
 * The /tutorial UI promises "BAŞLANGIÇ HEDİYESİ +500 mineral / +25 kristal /
 * +200 XP" on the final step.  Without this endpoint that promise was
 * cosmetic — `handleAdvance` in the page just routed to /base and nothing
 * landed in the wallet.  Players completed the 6-step flow, saw the gift
 * panel, hit /base, and the HUD showed the same 500/200/250 starter — felt
 * like the game was lying on its very first interaction.
 *
 * Idempotency (DB-backed): previously tracked in a module-scope
 * `Set<userId>` — fine for the stub *until* container restart wiped the
 * Set and every redeemed player could re-claim, gaining +500 mineral /
 * +25 energy / +200 XP per restart.  Now anchored on the xp_transactions
 * table: each call attempts to insert a row keyed by
 * `(user_id, source, reference_id)` with `referenceId = TUTORIAL_REF_ID`.
 * A partial UNIQUE index added by migration
 * `AddXpTransactionsUnique1779840000000` rejects the second insert with
 * Postgres SQLSTATE 23505 — we catch that and return
 * `{ redeemed: false, reason: 'already_claimed' }` without granting any
 * resources.  The XP row is the single idempotency token guarding BOTH
 * the XP grant and the resource grant.
 *
 * Versioned referenceId (`tutorial_complete_v1`): the legacy in-memory
 * flow used `tutorial_complete` (no suffix).  Bumping to `_v1` means any
 * older xp_transaction rows with the bare key won't block re-issuing the
 * gift to the rare player who already had the unversioned row but never
 * received the resource grant due to a partial-failure window.  Future
 * one-shot resends bump to `_v2`, `_v3`, ...
 */
const TUTORIAL_REF_ID = 'tutorial_complete_v1';
const TUTORIAL_XP_SOURCE = XpSource.ACHIEVEMENT;
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Resolve the api base URL the same way QuestProgressNotifier does — env var
 * with a localhost fallback that matches the api's default port (see
 * apps/api/src/main.ts). Trailing slashes stripped so the join is clean.
 */
function getApiBaseUrl(): string {
  const raw = process.env.API_BASE_URL || 'http://localhost:4000';
  return raw.replace(/\/+$/, '');
}

/**
 * Shared internal-service secret used to authenticate game-server → api
 * calls (audit B1, see InternalServiceGuard in api). Falls back to
 * JWT_SECRET to match the api guard's own fallback so production envs
 * that only set JWT_SECRET continue to work.
 */
function getInternalSecret(): string {
  return process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET || '';
}

interface OnboardingSummary {
  userId: string;
  isCompleted: boolean;
  skipped?: boolean;
  completedSteps?: string[];
  completedCount?: number;
  totalSteps?: number;
}

@UseGuards(HttpJwtGuard)
@Controller('players/me')
export class TutorialController {
  private readonly logger = new Logger(TutorialController.name);

  constructor(
    private readonly resources: ResourcesService,
    private readonly progression: ProgressionService,
    @InjectRepository(XpTransaction)
    private readonly xpTxRepo: Repository<XpTransaction>,
  ) {}

  @Post('tutorial-complete')
  @HttpCode(HttpStatus.OK)
  async tutorialComplete(@CurrentUser() userId: string) {
    // Real completion check: the /tutorial page used to gate step
    // transitions only via URL `?step=N` + localStorage. A player could
    // navigate directly to /tutorial?step=6, tap Advance, and trigger this
    // endpoint — XP idempotency stopped re-claims but didn't stop the
    // initial harvest. Now we couple the grant to the api's authoritative
    // TutorialProgress.isCompleted flag, which the api side only flips
    // after every step has been completed in order.
    await this.assertOnboardingComplete(userId);

    // Cheap pre-check: avoid even the "grant resources then fail on XP
    // insert" race for the common case (player taps "Bitir" twice while
    // online). The UNIQUE index is still the authoritative guard against
    // a concurrent double-submit slipping past this read.
    const existing = await this.xpTxRepo.findOne({
      where: {
        userId,
        source: TUTORIAL_XP_SOURCE,
        referenceId: TUTORIAL_REF_ID,
      },
      select: { id: true },
    });
    if (existing) {
      this.logger.log(`Tutorial gift already claimed by ${userId} — no-op`);
      return { redeemed: false, reason: 'already_claimed' as const };
    }

    // Attempt XP grant FIRST — it carries the idempotency token.  If two
    // requests slip past the pre-check (rare double-tap, replayed
    // request), the second awardXp will hit the UNIQUE index on
    // xp_transactions and throw a QueryFailedError with SQLSTATE 23505.
    // We catch that, skip the resource grant, and report
    // already_claimed — matching the pre-check return shape exactly.
    let leveledUp = false;
    try {
      const result = await this.progression.awardXp({
        userId,
        source: TUTORIAL_XP_SOURCE,
        referenceId: TUTORIAL_REF_ID,
      });
      leveledUp = result.leveledUp;
    } catch (err) {
      if (isUniqueViolation(err)) {
        this.logger.log(
          `Tutorial gift race detected for ${userId} — UNIQUE index rejected duplicate insert`,
        );
        return { redeemed: false, reason: 'already_claimed' as const };
      }
      // Non-fatal for other failures — XP is the smaller part of the
      // grant.  Log and proceed to the resource grant so the player at
      // least gets the visible 500/25.
      this.logger.warn(
        `tutorial XP grant failed for ${userId}: ${(err as Error).message}`,
      );
    }

    // XP transaction landed → resource grant is safe to apply exactly
    // once.  Resource grant matches the panel copy in ScrTutorial.
    // `energy: 25` serves as the "kristal" stand-in until energy/crystal
    // split lands.
    await this.resources.grant(userId, { mineral: 500, gas: 0, energy: 25 });

    this.logger.log(`Tutorial gift granted to ${userId} (leveledUp=${leveledUp})`);

    return {
      redeemed: true,
      granted: true,
      resources: { mineral: 500, gas: 0, energy: 25 },
      xp: 200,
      leveledUp,
    };
  }

  /**
   * Block grant if the player hasn't actually finished the tutorial flow on
   * the api side. Calls the internal `GET /api/v1/onboarding/progress/:userId`
   * route signed with the shared `X-Internal-Service` secret (mirrors the
   * pattern used by QuestProgressNotifier).
   *
   * Fail-modes:
   *   - api returns 404 (user has no TutorialProgress row at all) → block
   *     with a player-facing 400. Anyone who hit this without ever starting
   *     the tutorial flow is either a direct-URL exploit or a guest that
   *     somehow obtained an authed token; either way deny.
   *   - api returns 401 (shared secret missing / wrong) → log + block. A
   *     misconfig should fail closed, not silently grant.
   *   - network error → block. We prefer false-negatives (a legit player
   *     sees the gift-failed toast and can retry) over false-positives
   *     (anyone with a valid JWT harvests the gift).
   */
  private async assertOnboardingComplete(userId: string): Promise<void> {
    const baseUrl = getApiBaseUrl();
    const secret = getInternalSecret();
    if (!secret) {
      this.logger.error(
        'No INTERNAL_SERVICE_SECRET / JWT_SECRET set — refusing tutorial grant ' +
          'rather than fail-open.',
      );
      throw new BadRequestException('Önce tüm tutorial adımlarını tamamla');
    }

    const url = `${baseUrl}/api/v1/onboarding/progress/${encodeURIComponent(userId)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Internal-Service': `Bearer ${secret}`,
        },
      });
    } catch (err) {
      this.logger.warn(
        `onboarding progress lookup failed for ${userId}: ${(err as Error).message}`,
      );
      throw new BadRequestException('Önce tüm tutorial adımlarını tamamla');
    }

    if (!res.ok) {
      this.logger.warn(
        `onboarding progress HTTP ${res.status} for ${userId} — refusing tutorial grant`,
      );
      throw new BadRequestException('Önce tüm tutorial adımlarını tamamla');
    }

    let body: OnboardingSummary;
    try {
      body = (await res.json()) as OnboardingSummary;
    } catch {
      this.logger.warn(`onboarding progress body not JSON for ${userId}`);
      throw new BadRequestException('Önce tüm tutorial adımlarını tamamla');
    }

    if (body.isCompleted !== true) {
      throw new BadRequestException('Önce tüm tutorial adımlarını tamamla');
    }
  }
}

/**
 * TypeORM wraps the pg driver error; the SQLSTATE survives on the inner
 * `driverError.code` field. Some pg builds also surface it on the outer
 * error as `.code`. Check both.
 */
function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driverCode = (err as QueryFailedError & { code?: string }).code;
  const innerCode = (err.driverError as { code?: string } | undefined)?.code;
  return driverCode === PG_UNIQUE_VIOLATION || innerCode === PG_UNIQUE_VIOLATION;
}
