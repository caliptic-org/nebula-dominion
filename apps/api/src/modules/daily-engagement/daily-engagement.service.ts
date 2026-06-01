import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { MissionClaim, MissionType } from './entities/mission-claim.entity';
import { ClaimRewardDto } from './dto/claim-mission.dto';

interface ClaimInput {
  userId: string;
  missionId: string;
  missionType: MissionType;
  reward: ClaimRewardDto;
  /** Forwarded `Authorization: Bearer <jwt>` header so game-server can
   *  authenticate the wallet grant against the same player. */
  authorization?: string;
}

export interface ClaimResult {
  claimed: boolean;
  alreadyClaimed: boolean;
  rewards: ClaimRewardDto;
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
      reward: ClaimRewardDto;
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
    const { userId, missionId, missionType, reward, authorization } = input;

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

    const record = this.claimRepo.create({
      userId,
      missionId,
      missionType,
      rewardJson: {
        ...(reward.gold ? { gold: reward.gold } : {}),
        ...(reward.gems ? { gems: reward.gems } : {}),
        ...(reward.xp ? { xp: reward.xp } : {}),
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
    if ((reward.gold || reward.gems || reward.xp) && authorization) {
      walletCredited = await this.creditWallet(authorization, reward);
    }

    // Progression XP grant — fires the +XP / level_up socket toast and
    // counts toward Lv/Çağ progression on game-server. Independent of the
    // wallet credit above (which writes raw resource numbers); this writes
    // an xp_transactions row and recomputes player_level. We grant XP even
    // when the mission's payload.xp is 0 because the *act of completing*
    // the mission is the XP source — the wallet payload is a separate gold
    // / gems concept. Missions with truly no progression value (e.g. a
    // future "free re-roll") should opt out via a new missionType.
    let xpGranted = false;
    if (authorization) {
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
    reward: ClaimRewardDto,
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
