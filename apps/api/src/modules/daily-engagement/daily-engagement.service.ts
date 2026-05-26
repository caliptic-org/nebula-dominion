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
}

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

    this.logger.log(
      `Mission claimed user=${userId} mission=${missionId} type=${missionType} ` +
        `reward=${JSON.stringify(record.rewardJson)} walletCredited=${walletCredited}`,
    );

    return {
      claimed: true,
      alreadyClaimed: false,
      rewards: record.rewardJson ?? {},
      walletCredited,
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
}
