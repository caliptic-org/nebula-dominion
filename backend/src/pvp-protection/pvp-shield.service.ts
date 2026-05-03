import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PvpShield } from './entities/pvp-shield.entity';

const SHIELD_DURATION_DAYS = 7;
export const BOT_MATCH_THRESHOLD = 5;

@Injectable()
export class PvpShieldService {
  private readonly logger = new Logger(PvpShieldService.name);

  constructor(
    @InjectRepository(PvpShield)
    private readonly shieldRepo: Repository<PvpShield>,
  ) {}

  async initShield(playerId: string): Promise<PvpShield> {
    const existing = await this.shieldRepo.findOne({ where: { playerId } });
    if (existing) return existing;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHIELD_DURATION_DAYS);

    const shield = this.shieldRepo.create({
      playerId,
      shieldExpiresAt: expiresAt,
      optedOut: false,
      botMatchesPlayed: 0,
      humanOnlyMatchmaking: false,
    });
    const saved = await this.shieldRepo.save(shield);
    this.logger.log(`PvP shield initialized for player ${playerId}, expires ${expiresAt.toISOString()}`);
    return saved;
  }

  async getShield(playerId: string): Promise<PvpShield | null> {
    return this.shieldRepo.findOne({ where: { playerId } });
  }

  async isShieldActive(playerId: string): Promise<boolean> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) return false;
    if (shield.optedOut) return false;
    return new Date() < shield.shieldExpiresAt;
  }

  async optOut(playerId: string): Promise<PvpShield> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) throw new BadRequestException(`No shield record found for player ${playerId}`);
    if (shield.optedOut) return shield;

    const now = new Date();
    if (now >= shield.shieldExpiresAt) return shield;

    shield.optedOut = true;
    shield.optedOutAt = now;
    const saved = await this.shieldRepo.save(shield);
    this.logger.log(`Player ${playerId} opted out of PvP shield`);
    return saved;
  }

  async setHumanOnlyMatchmaking(playerId: string, enabled: boolean): Promise<PvpShield> {
    let shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) shield = await this.initShield(playerId);
    shield.humanOnlyMatchmaking = enabled;
    return this.shieldRepo.save(shield);
  }

  async incrementBotMatchesPlayed(playerId: string): Promise<void> {
    await this.shieldRepo
      .createQueryBuilder()
      .update(PvpShield)
      .set({ botMatchesPlayed: () => 'bot_matches_played + 1' })
      .where('player_id = :playerId', { playerId })
      .execute();
  }

  async shouldUseBotMatch(playerId: string): Promise<boolean> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) return false;
    if (shield.humanOnlyMatchmaking) return false;
    return shield.botMatchesPlayed < BOT_MATCH_THRESHOLD;
  }

  async getShieldStatus(playerId: string): Promise<{
    hasShield: boolean;
    isActive: boolean;
    expiresAt: Date | null;
    botMatchesPlayed: number;
    botMatchesRemaining: number;
    humanOnlyMatchmaking: boolean;
  }> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) {
      return {
        hasShield: false,
        isActive: false,
        expiresAt: null,
        botMatchesPlayed: 0,
        botMatchesRemaining: BOT_MATCH_THRESHOLD,
        humanOnlyMatchmaking: false,
      };
    }
    const isActive = !shield.optedOut && new Date() < shield.shieldExpiresAt;
    return {
      hasShield: true,
      isActive,
      expiresAt: shield.shieldExpiresAt,
      botMatchesPlayed: shield.botMatchesPlayed,
      botMatchesRemaining: Math.max(0, BOT_MATCH_THRESHOLD - shield.botMatchesPlayed),
      humanOnlyMatchmaking: shield.humanOnlyMatchmaking,
    };
  }
}
