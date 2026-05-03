import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PvpBotProfile, BotDifficulty } from './entities/pvp-bot-profile.entity';
import { PvpShieldService } from './pvp-shield.service';
import { UnitSnapshot } from '../battle/types/battle.types';

const POWER_RANGE_PCT = 0.15;

export interface MatchResult {
  isBotMatch: boolean;
  opponentId: string;
  opponentUnits: UnitSnapshot[];
  powerScore: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(
    @InjectRepository(PvpBotProfile)
    private readonly botProfileRepo: Repository<PvpBotProfile>,
    private readonly shieldService: PvpShieldService,
  ) {}

  computePowerScore(units: UnitSnapshot[]): number {
    return units.reduce((sum, u) => sum + u.attack + u.defense + Math.floor(u.maxHp / 10), 0);
  }

  async findBotOpponent(playerPowerScore: number): Promise<PvpBotProfile | null> {
    const minPower = Math.floor(playerPowerScore * (1 - POWER_RANGE_PCT));
    const maxPower = Math.ceil(playerPowerScore * (1 + POWER_RANGE_PCT));

    // Pick closest bot by power score within range
    const bot = await this.botProfileRepo
      .createQueryBuilder('bot')
      .where('bot.is_active = true')
      .andWhere('bot.power_score BETWEEN :minPower AND :maxPower', { minPower, maxPower })
      .orderBy(`ABS(bot.power_score - ${playerPowerScore})`, 'ASC')
      .getOne();

    return bot ?? null;
  }

  async findMatch(
    attackerId: string,
    attackerUnits: UnitSnapshot[],
    candidateDefenderIds: string[] = [],
  ): Promise<MatchResult> {
    const playerPowerScore = this.computePowerScore(attackerUnits);
    const useBotMatch = await this.shieldService.shouldUseBotMatch(attackerId);

    if (useBotMatch) {
      const bot = await this.findBotOpponent(playerPowerScore);
      if (bot) {
        this.logger.debug(`Bot match for player ${attackerId} (power: ${playerPowerScore})`);
        return {
          isBotMatch: true,
          opponentId: bot.id,
          opponentUnits: bot.units as unknown as UnitSnapshot[],
          powerScore: playerPowerScore,
        };
      }
    }

    // Real-player matchmaking: filter by shield and power range
    const minPower = Math.floor(playerPowerScore * (1 - POWER_RANGE_PCT));
    const maxPower = Math.ceil(playerPowerScore * (1 + POWER_RANGE_PCT));

    for (const defenderId of candidateDefenderIds) {
      if (defenderId === attackerId) continue;
      const shieldActive = await this.shieldService.isShieldActive(defenderId);
      if (shieldActive) continue;
      // Power filtering is enforced by caller passing pre-filtered candidates,
      // but we also log the range for observability
      this.logger.debug(`Real match: ${attackerId} vs ${defenderId} (power range ${minPower}-${maxPower})`);
      return {
        isBotMatch: false,
        opponentId: defenderId,
        opponentUnits: [],
        powerScore: playerPowerScore,
      };
    }

    throw new NotFoundException(
      `No suitable opponent found for power score ${playerPowerScore} (range ${minPower}-${maxPower}). Try again later.`,
    );
  }

  async getActiveBotProfiles(limit = 50): Promise<PvpBotProfile[]> {
    return this.botProfileRepo.find({ where: { isActive: true }, take: limit, order: { powerScore: 'ASC' } });
  }

  async createBotProfile(
    name: string,
    race: string,
    units: UnitSnapshot[],
    difficulty: BotDifficulty = BotDifficulty.MEDIUM,
  ): Promise<PvpBotProfile> {
    const powerScore = this.computePowerScore(units);
    const bot = this.botProfileRepo.create({
      name,
      race,
      powerScore,
      units: units as unknown as object,
      difficulty,
      isActive: true,
    });
    const saved = await this.botProfileRepo.save(bot);
    this.logger.log(`Bot profile created: ${saved.id} (${name}, power: ${powerScore})`);
    return saved;
  }

  async deactivateBotProfile(id: string): Promise<void> {
    await this.botProfileRepo.update(id, { isActive: false });
  }

  /** Returns true if the given ID belongs to an active bot profile.
   *  Used by BattleService to determine isBotOpponent server-side. */
  async isBotProfile(id: string): Promise<boolean> {
    const count = await this.botProfileRepo.count({ where: { id, isActive: true } });
    return count > 0;
  }
}
