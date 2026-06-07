import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  QueryFailedError,
  DataSource,
} from 'typeorm';
import { MissionClaim, MissionType } from './entities/mission-claim.entity';
import { CanonicalReward } from './dto/claim-mission.dto';
import { resolveMissionReward } from './missions.catalog';

interface ClaimInput {
  userId: string;
  missionId: string;
  missionType: MissionType;
  /** Forwarded `Authorization: Bearer <jwt>` header so game-server can
   *  authenticate the wallet grant against the same player. */
  authorization?: string;
}

export interface ClaimResult {
  claimed: boolean;
  alreadyClaimed: boolean;
  rewards: CanonicalReward;
  walletCredited: boolean;
  /** Whether the progression XP grant fired on game-server. False either
   *  because the mission paid no XP, the player's JWT was missing, or the
   *  HTTP call to game-server failed (logged, non-fatal). */
  xpGranted: boolean;
}

/** Map a mission-claim's missionType to the progression XpSource enum used
 *  by game-server. Kept in sync with apps/game-server/src/progression/config/level-config.ts:XpSource.
 *  This mapping decides which base XP amount + per-day cap the grant uses —
 *  daily/weekly hit the highest-weight bucket (35% target), achievements use
 *  the rare-high-impact bucket (500 XP base), and story missions reuse the
 *  EVENT bucket (300 XP). */
const MISSION_TYPE_TO_XP_SOURCE: Record<MissionType, string> = {
  daily:       'daily_mission',
  weekly:      'daily_mission',
  achievement: 'achievement',
  story:       'event',
};

/**
 * Per-story-mission progression preconditions.
 *
 * Before BLOCKER F2 a fresh account could POST /daily-engagement/claim with
 * `missionId: 'story-1'` and pocket 5000 gold + 1200 XP without ever picking
 * a race, building anything, or even joining a match. The FE missions page
 * was rendering story-1 as `state:'completed'` from a hardcoded array, and
 * the BE accepted whatever the FE said with no progression check at all.
 *
 * Each entry runs a cheap raw SQL probe and returns:
 *   - `met: true`  → story mission is genuinely earned, allow claim
 *   - `met: false` → 400 with a Turkish hint shown via toast in the FE
 *
 * The probes intentionally hit the canonical tables directly (users.race,
 * player_levels.{level,age}) rather than going through service repos —
 * keeps the precondition layer dependency-free of upstream injection
 * shape changes and survives module-graph refactors.
 */
const STORY_PRECONDITIONS: Record<
  string,
  (userId: string, dataSource: DataSource) => Promise<{ met: boolean; hint: string }>
> = {
  // story-1 "Nebula'nın Uyanışı": first base + commander pick. Reasonable
  // proxy = onboarding race_selection completed (users.race IS NOT NULL).
  // If the player hasn't even picked a race yet, they definitely haven't
  // built anything either.
  'story-1': async (userId, dataSource) => {
    const rows = await dataSource.query<{ race: string | null }[]>(
      'SELECT race FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    const race = rows?.[0]?.race ?? null;
    return {
      met: race !== null,
      hint: 'Önce yarış seç (komutan seçimi tamamlanmadı).',
    };
  },

  // story-2 "İlk Kan": first PvP win. Proxy = player_levels.level >= 2.
  // Level-up requires XP from any source; a fresh account is locked at 1.
  'story-2': async (userId, dataSource) => {
    const rows = await dataSource.query<
      { current_level: number }[]
    >(
      'SELECT current_level FROM player_levels WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const level = rows?.[0]?.current_level ?? 1;
    return {
      met: level >= 2,
      hint: 'Önce Seviye 2\'ye ulaş.',
    };
  },

  // story-3 "İttifak ya da Kan": diplomatic move. Proxy = age >= 2.
  'story-3': async (userId, dataSource) => {
    const rows = await dataSource.query<{ current_age: number }[]>(
      'SELECT current_age FROM player_levels WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const age = rows?.[0]?.current_age ?? 1;
    return {
      met: age >= 2,
      hint: 'Önce Çağ 2\'ye yüksel.',
    };
  },

  // story-4 "Nebula Hâkimi": galaxy dominance. Proxy = age >= 3.
  'story-4': async (userId, dataSource) => {
    const rows = await dataSource.query<{ current_age: number }[]>(
      'SELECT current_age FROM player_levels WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    const age = rows?.[0]?.current_age ?? 1;
    return {
      met: age >= 3,
      hint: 'Önce Çağ 3\'e yüksel.',
    };
  },
};

/**
 * Per-achievement progression preconditions.
 *
 * HIGH F1-econ: a fresh account used to POST
 *   { missionId: 'ach-6', missionType: 'achievement' }
 * and immediately pocket 20_000 XP + 5 gems (the legendary "Nebula
 * Lordu" payout) without ever touching the game. The FE achievements
 * page renders unlock state from a hardcoded array; the BE accepted
 * whatever it was told.
 *
 * Each probe hits the canonical table directly with raw SQL — same
 * dependency-free design as STORY_PRECONDITIONS above. The probes are
 * deliberately permissive on missing rows (a brand-new user with no
 * player_levels row yet should clearly NOT unlock ach-5/ach-6) and
 * **fail closed** when the underlying table or column has drifted —
 * losing a legitimate claim is recoverable, accidentally minting
 * 20k XP is not.
 *
 * Achievement catalog (apps/web/src/lib/achievements.ts) lists six IDs;
 * we cover all six. Any future ach-* id without a precondition entry
 * is also failed closed by the lookup in claim().
 */
const ACHIEVEMENT_PRECONDITIONS: Record<
  string,
  (userId: string, dataSource: DataSource) => Promise<{ met: boolean; hint: string }>
> = {
  // ach-1 "İlk Adımlar": at least one PvP win. Real schema is `battles`
  // with `winner_id` (not `battles_history.outcome` per the F1-econ
  // ticket — that table never existed in this repo; we use the
  // canonical one). A win = winner_id matches user AND status terminal.
  // Cheap: indexed on attacker_id / defender_id, scan is bounded by the
  // small per-user battle history.
  'ach-1': async (userId, dataSource) => {
    try {
      const rows = await dataSource.query<{ wins: string }[]>(
        'SELECT COUNT(*)::text AS wins FROM battles WHERE winner_id = $1',
        [userId],
      );
      const wins = Number(rows?.[0]?.wins ?? '0');
      return {
        met: wins >= 1,
        hint: 'Önce bir PvP savaşı kazan.',
      };
    } catch {
      return { met: false, hint: 'Bu başarı henüz açılmadı' };
    }
  },

  // ach-2 "Mineral Baronu": cumulative mineral ≥ 10_000. No cumulative
  // log table exists; the best available proxy is the live wallet
  // balance in player_resources.mineral. A player who has held 10k
  // mineral at some point either still holds it or spent it on a
  // building — but spending it doesn't count toward the achievement
  // here, which is a known under-grant. Better under-grant than
  // self-claimed legendary payouts.
  'ach-2': async (userId, dataSource) => {
    try {
      const rows = await dataSource.query<{ mineral: string }[]>(
        'SELECT mineral::text AS mineral FROM player_resources WHERE player_id = $1 LIMIT 1',
        [userId],
      );
      const mineral = Number(rows?.[0]?.mineral ?? '0');
      return {
        met: mineral >= 10_000,
        hint: 'Önce 10.000 mineral biriktir.',
      };
    } catch {
      return { met: false, hint: 'Bu başarı henüz açılmadı' };
    }
  },

  // ach-3 "Düşman Avcısı": ≥ 100 enemies killed. Aggregate over
  // subspace_sessions.enemies_killed (the only enemies_killed column
  // in the schema). The F1-econ ticket asked for battles_history
  // aggregation but that table doesn't exist; subspace is the canonical
  // PvE kill log.
  'ach-3': async (userId, dataSource) => {
    try {
      const rows = await dataSource.query<{ total: string | null }[]>(
        'SELECT COALESCE(SUM(enemies_killed), 0)::text AS total ' +
          'FROM subspace_sessions WHERE user_id = $1',
        [userId],
      );
      const total = Number(rows?.[0]?.total ?? '0');
      return {
        met: total >= 100,
        hint: 'Önce toplam 100 düşman alt et.',
      };
    } catch {
      return { met: false, hint: 'Bu başarı henüz açılmadı' };
    }
  },

  // ach-4 "Rütbe Yükselişi": at least one commander at level ≥ 5.
  // Per-row max over player_commanders.level for the user.
  'ach-4': async (userId, dataSource) => {
    try {
      const rows = await dataSource.query<{ max_level: number | null }[]>(
        'SELECT MAX(level) AS max_level FROM player_commanders WHERE user_id = $1',
        [userId],
      );
      const maxLevel = Number(rows?.[0]?.max_level ?? 0);
      return {
        met: maxLevel >= 5,
        hint: 'Önce bir komutanı Seviye 5\'e ulaştır.',
      };
    } catch {
      return { met: false, hint: 'Bu başarı henüz açılmadı' };
    }
  },

  // ach-5 "Çağ Aşan": current_age ≥ 2.
  'ach-5': async (userId, dataSource) => {
    try {
      const rows = await dataSource.query<{ current_age: number }[]>(
        'SELECT current_age FROM player_levels WHERE user_id = $1 LIMIT 1',
        [userId],
      );
      const age = rows?.[0]?.current_age ?? 1;
      return {
        met: age >= 2,
        hint: 'Önce Çağ 2\'ye yüksel.',
      };
    } catch {
      return { met: false, hint: 'Bu başarı henüz açılmadı' };
    }
  },

  // ach-6 "Efsanevi" (Nebula Lordu): current_age ≥ 4. Legendary tier —
  // 20k XP + 5 gems, the single highest mission payout in the catalog.
  // Pre-fix a fresh account claimed this in one request.
  'ach-6': async (userId, dataSource) => {
    try {
      const rows = await dataSource.query<{ current_age: number }[]>(
        'SELECT current_age FROM player_levels WHERE user_id = $1 LIMIT 1',
        [userId],
      );
      const age = rows?.[0]?.current_age ?? 1;
      return {
        met: age >= 4,
        hint: 'Önce Çağ 4\'e yüksel.',
      };
    } catch {
      return { met: false, hint: 'Bu başarı henüz açılmadı' };
    }
  },
};

@Injectable()
export class DailyEngagementService {
  private readonly logger = new Logger(DailyEngagementService.name);

  constructor(
    @InjectRepository(MissionClaim)
    private readonly claimRepo: Repository<MissionClaim>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Return every persisted claim for a user so the frontend can hydrate
   * the "claimed" state for story / weekly / achievement / daily tabs in
   * one round-trip on mount.
   */
  async listClaims(userId: string): Promise<{
    userId: string;
    claims: Array<{
      missionId: string;
      missionType: MissionType;
      claimedAt: string;
      reward: CanonicalReward;
    }>;
  }> {
    const rows = await this.claimRepo.find({
      where: { userId },
      order: { claimedAt: 'DESC' },
    });
    return {
      userId,
      claims: rows.map((r) => ({
        missionId: r.missionId,
        missionType: r.missionType,
        claimedAt: r.claimedAt.toISOString(),
        reward: r.rewardJson ?? {},
      })),
    };
  }

  /**
   * Persist a claim and fan-out to game-server's wallet endpoint.
   *
   * Idempotent: a duplicate (userId, missionId) returns
   * `alreadyClaimed: true` and SKIPS the wallet grant, so re-tapping
   * "Ödülü Al" can never double-credit. The UNIQUE constraint enforces
   * this at the DB level — the in-memory check is a fast path.
   */
  async claim(input: ClaimInput): Promise<ClaimResult> {
    const { userId, missionId, missionType, authorization } = input;

    // Server-side reward resolution. The DTO no longer carries reward
    // amounts (see dto/claim-mission.dto.ts changelog); we trust the
    // catalog or nothing. Unknown ids accept the claim with a zero
    // reward (for forward-compat) but never grant resources.
    const { reward, recognised } = resolveMissionReward(missionId, missionType);
    if (!recognised) {
      // Unknown mission id — don't persist a junk row. Persisting would
      // both pollute the table and burn the (userId, missionId) UNIQUE
      // slot, blocking a legitimate id with the same string later. Return
      // a no-op claim result; the FE optimistic update sees rewards={}
      // and `claimed:false` so nothing is credited locally either.
      this.logger.warn(
        `Mission claim with unknown id user=${userId} mission=${missionId} type=${missionType} — rejecting (no row persisted)`,
      );
      return {
        claimed: false,
        alreadyClaimed: false,
        rewards: {},
        walletCredited: false,
        xpGranted: false,
      };
    }

    const existing = await this.claimRepo.findOne({
      where: { userId, missionId },
    });
    if (existing) {
      // rewards:{} (not existing.rewardJson) — FE applies an optimistic
      // wallet bump on any non-empty rewards payload, so echoing the
      // already-credited amount here would double-credit on re-tap.
      return {
        claimed: false,
        alreadyClaimed: true,
        rewards: {},
        walletCredited: false,
        xpGranted: false,
      };
    }

    // BLOCKER F2: story-mission progression gate. The FE used to render
    // story-1 as `state:'completed'` from a hardcoded array and POST the
    // claim with no proof of having done anything. The catalog gives
    // 5000 gold + 1200 XP — large enough to skew early economy. The
    // precondition table above is the canonical check; FE-side state is
    // cosmetic and not load-bearing anymore.
    if (missionType === 'story') {
      const precondition = STORY_PRECONDITIONS[missionId];
      if (precondition) {
        try {
          const { met, hint } = await precondition(userId, this.dataSource);
          if (!met) {
            this.logger.log(
              `Story claim blocked by precondition user=${userId} mission=${missionId} hint="${hint}"`,
            );
            throw new BadRequestException(hint);
          }
        } catch (err) {
          // Re-throw the BadRequest so the controller surfaces it as 400.
          // Anything else (probe SQL hiccup) we log and let through —
          // better to occasionally allow a claim than to lock out every
          // player when player_levels has a transient hiccup.
          if (err instanceof BadRequestException) throw err;
          this.logger.warn(
            `Story precondition probe failed user=${userId} mission=${missionId}: ` +
              (err instanceof Error ? err.message : String(err)),
          );
        }
      }
    }

    // HIGH F1-econ: achievement-mission progression gate. Before this
    // gate landed, a freshly-registered user could POST
    //   { missionId: 'ach-6', missionType: 'achievement' }
    // and pocket 20_000 XP + 5 gems instantly — the FE rendered
    // achievement unlock state from a hardcoded array and the BE
    // accepted whatever it was told. The ACHIEVEMENT_PRECONDITIONS
    // table above is the canonical check now.
    //
    // FAIL-CLOSED policy: unlike story missions (which fall through on
    // a probe SQL hiccup so a transient DB blip doesn't lock everyone
    // out of progression), achievements default to BLOCKED on:
    //   - unknown ach-* id (no probe entry)
    //   - probe throws (already converted to {met:false} inside each probe)
    // Achievement payouts are higher-value and lower-frequency than
    // story missions, so the cost of a false negative (one annoyed
    // legitimate player retries) is far less than a false positive
    // (any fresh account farms the legendary tier).
    if (missionType === 'achievement') {
      const precondition = ACHIEVEMENT_PRECONDITIONS[missionId];
      if (!precondition) {
        this.logger.log(
          `Achievement claim blocked — no precondition entry user=${userId} mission=${missionId}`,
        );
        throw new BadRequestException('Bu başarı henüz açılmadı');
      }
      const { met, hint } = await precondition(userId, this.dataSource);
      if (!met) {
        this.logger.log(
          `Achievement claim blocked by precondition user=${userId} mission=${missionId} hint="${hint}"`,
        );
        throw new BadRequestException(hint);
      }
    }

    // ── cycle 17 BAL-4 / BAL-02: dead client-side XP cap removed ──────
    // This used to clamp `reward.xp` against a 150 000/day PER_USER_DAILY_XP_CAP
    // computed by summing rewardJson.xp across today's claim rows. That cap
    // was DEAD CODE: rewardJson.xp is decorative (it feeds the FE display
    // and creditWallet's `xp` resource field) — it is NOT the progression
    // XP that advances Lv/Çağ. The real progression grant flows through
    // creditXp() below, which sends only { source, referenceId } and lets
    // game-server mint XP from its own XP_BASE_AMOUNTS table, completely
    // ignoring this number. So clamping it here never bounded any minted
    // progression XP. The authoritative per-source daily ceiling now lives
    // in game-server level-config.ts XP_DAILY_CAPS (DAILY_MISSION 3000,
    // ACHIEVEMENT 5000, …), enforced where the XP is actually minted.
    // `cappedReward` retains its name for downstream readability but is now
    // just the catalog reward as-is.
    const cappedReward: CanonicalReward = { ...reward };

    const record = this.claimRepo.create({
      userId,
      missionId,
      missionType,
      rewardJson: {
        ...(cappedReward.gold ? { gold: cappedReward.gold } : {}),
        ...(cappedReward.gems ? { gems: cappedReward.gems } : {}),
        ...(cappedReward.xp ? { xp: cappedReward.xp } : {}),
      },
    });

    try {
      await this.claimRepo.save(record);
    } catch (err) {
      // Race: a parallel POST inserted the same (userId, missionId)
      // between our findOne and save. Treat as alreadyClaimed so the
      // client sees a consistent contract.
      if (err instanceof QueryFailedError) {
        const code = (err.driverError as { code?: string } | undefined)?.code;
        if (code === '23505') {
          // rewards:{} — same reasoning as the early `existing` branch:
          // the parallel POST already credited the wallet, echoing the
          // amount here would let the FE optimistic update double it.
          return {
            claimed: false,
            alreadyClaimed: true,
            rewards: {},
            walletCredited: false,
            xpGranted: false,
          };
        }
      }
      this.logger.error(
        `Failed to persist mission claim user=${userId} mission=${missionId}`,
        err instanceof Error ? err.stack : err,
      );
      throw new InternalServerErrorException('Ödül kaydedilemedi');
    }

    let walletCredited = false;
    if ((cappedReward.gold || cappedReward.gems || cappedReward.xp) && authorization) {
      walletCredited = await this.creditWallet(userId, missionId, missionType, cappedReward);
    }

    // Progression XP grant — fires the +XP / level_up socket toast and
    // counts toward Lv/Çağ progression on game-server. Independent of the
    // wallet credit above (which writes raw resource numbers); this writes
    // an xp_transactions row and recomputes player_level.
    //
    // GATED on `recognised && cappedReward.xp > 0`:
    //   - `recognised` — unknown mission ids never trigger a grant (the
    //     early-return above also blocks them, kept here for defense in
    //     depth).
    //   - `cappedReward.xp > 0` — game-server reads its own XP_BASE_AMOUNTS
    //     table per source, so calling award-xp here would credit the full
    //     per-mission-type base ignoring our 150k daily cap and ignoring
    //     reward.xp=0 missions (cosmetic daily-* rows). Only proceed when
    //     the catalog actually intends XP to flow AND the cap left some
    //     headroom.
    let xpGranted = false;
    if (authorization && recognised && (cappedReward.xp ?? 0) > 0) {
      xpGranted = await this.creditXp({
        authorization,
        userId,
        missionId,
        missionType,
      });
    }

    this.logger.log(
      `Mission claimed user=${userId} mission=${missionId} type=${missionType} ` +
        `reward=${JSON.stringify(record.rewardJson)} walletCredited=${walletCredited} xpGranted=${xpGranted}`,
    );

    return {
      claimed: true,
      alreadyClaimed: false,
      rewards: record.rewardJson ?? {},
      walletCredited,
      xpGranted,
    };
  }

  /**
   * POST the claim reward to game-server's battle-reward endpoint so the
   * player's resource wallet (mineral / science / xp) reflects the
   * payout. We re-use battle-reward because it already implements the
   * exact `numeric STRING coercion + cap clamp` pattern needed to avoid
   * the "19130 + 100 = 19130100" string-concat bug.
   *
   * ## Auth (S3 + F3 fix — audit 2026-06-06)
   *
   * `/resources/battle-reward` no longer accepts the user's JWT — it's
   * now `InternalServiceGuard`-only. We sign with the shared
   * `INTERNAL_SERVICE_SECRET` (falling back to `JWT_SECRET`) and pass
   * the target `userId` in the body. The user's `Authorization` header
   * is no longer forwarded for this hop; the audit trail lives in this
   * service's mission-claim row.
   *
   * Returns true on 2xx; never throws — a wallet hiccup must not roll
   * back the DB claim (the claim row is the audit source).
   */
  private async creditWallet(
    userId: string,
    missionId: string,
    missionType: MissionType,
    reward: CanonicalReward,
  ): Promise<boolean> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/buildings/resources/battle-reward`;

    const serviceSecret =
      process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET;
    if (!serviceSecret) {
      this.logger.warn(
        'creditWallet skipped — neither INTERNAL_SERVICE_SECRET nor JWT_SECRET ' +
          'is set; cannot sign request to game-server',
      );
      return false;
    }

    const body = {
      userId,
      mineral: reward.gold ?? 0,
      science: reward.gems ?? 0,
      xp: reward.xp ?? 0,
      source: `mission:${missionType}:${missionId}`,
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
          `game-server battle-reward non-2xx ${res.status} body=${text.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `game-server battle-reward fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST the progression XP grant to game-server. Fires the standard
   * award-xp pipeline (xp_transactions row + player_level recompute +
   * Socket.io `xp_gained` / `level_up` event). The referenceId is the
   * missionId so subsequent re-tries see a duplicate-key on game-server's
   * idempotency check (xp_transactions has UNIQUE(user_id, source,
   * reference_id)).
   *
   * Returns true on 2xx; never throws — XP grant must not roll back the
   * DB claim row, which is the auditable record.
   */
  private async creditXp(args: {
    authorization: string;
    userId: string;
    missionId: string;
    missionType: MissionType;
  }): Promise<boolean> {
    const { authorization, userId, missionId, missionType } = args;
    const source = MISSION_TYPE_TO_XP_SOURCE[missionType];
    if (!source) {
      this.logger.warn(`No XpSource mapping for missionType=${missionType}`);
      return false;
    }

    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/progression/award-xp`;

    const body = {
      userId,
      source,
      referenceId: `mission:${missionId}`,
    };

    // Audit fix (S4 + F4-econ): /progression/award-xp is gated by
    // InternalServiceGuard on game-server — the user's JWT is no
    // longer sufficient. Sign with the shared INTERNAL_SERVICE_SECRET
    // (fallback JWT_SECRET, same approach as creditWallet above and as
    // game-server's quest-progress-notifier in reverse).
    const serviceSecret =
      process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET || '';

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
          ...(serviceSecret
            ? { 'X-Internal-Service': `Bearer ${serviceSecret}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // 409 = already granted (XP transactions are idempotent on
        // (user, source, reference)); treat as benign so re-tap of a
        // claimed mission doesn't surface as an error to the player.
        if (res.status === 409) {
          this.logger.debug(
            `award-xp duplicate (already granted) user=${userId} mission=${missionId}`,
          );
          return true;
        }
        this.logger.warn(
          `game-server award-xp non-2xx ${res.status} body=${text.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `game-server award-xp fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
