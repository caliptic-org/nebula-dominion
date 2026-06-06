import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { MissionClaim, MissionType } from './entities/mission-claim.entity';
import { CanonicalReward } from './dto/claim-mission.dto';
import {
  resolveMissionReward,
  PER_USER_DAILY_XP_CAP,
} from './missions.catalog';

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

@Injectable()
export class DailyEngagementService {
  private readonly logger = new Logger(DailyEngagementService.name);

  constructor(
    @InjectRepository(MissionClaim)
    private readonly claimRepo: Repository<MissionClaim>,
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
      this.logger.warn(
        `Mission claim with unknown id user=${userId} mission=${missionId} type=${missionType} — accepting with zero reward`,
      );
    }

    const existing = await this.claimRepo.findOne({
      where: { userId, missionId },
    });
    if (existing) {
      return {
        claimed: false,
        alreadyClaimed: true,
        rewards: existing.rewardJson ?? {},
        walletCredited: false,
        xpGranted: false,
      };
    }

    // Per-user daily XP ceiling — defensive against ID enumeration or
    // catalog drift. The previous claim handler had no cap at all; a
    // live playtest farmed lv1→14 in 31 calls before the structural
    // fix (catalog lookup) landed. Now there's both a structural cap
    // (the catalog can only mint defined values) AND a behavioural cap
    // (a single user can't claim past PER_USER_DAILY_XP_CAP in a day).
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const todaysClaims = await this.claimRepo.find({
      where: { userId },
    });
    const todaysXp = todaysClaims
      .filter((c) => c.claimedAt >= dayStart)
      .reduce((sum, c) => sum + (c.rewardJson?.xp ?? 0), 0);
    let cappedReward: CanonicalReward = { ...reward };
    if ((cappedReward.xp ?? 0) > 0 && todaysXp + (cappedReward.xp ?? 0) > PER_USER_DAILY_XP_CAP) {
      const remaining = Math.max(0, PER_USER_DAILY_XP_CAP - todaysXp);
      this.logger.warn(
        `Mission claim XP capped user=${userId} mission=${missionId} ` +
          `attempted=${cappedReward.xp} todaysXp=${todaysXp} remaining=${remaining}`,
      );
      cappedReward = { ...cappedReward, xp: remaining };
    }

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
          const existingRow = await this.claimRepo.findOne({
            where: { userId, missionId },
          });
          return {
            claimed: false,
            alreadyClaimed: true,
            rewards: existingRow?.rewardJson ?? {},
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
      walletCredited = await this.creditWallet(authorization, cappedReward);
    }

    // Progression XP grant — fires the +XP / level_up socket toast and
    // counts toward Lv/Çağ progression on game-server. Independent of the
    // wallet credit above (which writes raw resource numbers); this writes
    // an xp_transactions row and recomputes player_level.
    //
    // GATED on `recognised`: unknown mission ids no longer trigger the
    // progression grant. Without this an attacker could rotate fake
    // mission ids (each one bypasses the UNIQUE constraint) and farm
    // the per-mission-type base XP from game-server forever. Now they
    // get the wallet zero AND the XP zero — the claim row still persists
    // (idempotent contract) but the grant is suppressed.
    let xpGranted = false;
    if (authorization && recognised) {
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
   * Returns true on 2xx; never throws — a wallet hiccup must not roll
   * back the DB claim (the claim row is the audit source).
   */
  private async creditWallet(
    authorization: string,
    reward: CanonicalReward,
  ): Promise<boolean> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/buildings/resources/battle-reward`;

    const body = {
      mineral: reward.gold ?? 0,
      science: reward.gems ?? 0,
      xp: reward.xp ?? 0,
    };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
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

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
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
