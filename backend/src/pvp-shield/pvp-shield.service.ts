import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerShield } from './entities/player-shield.entity';

const SHIELD_DURATION_DAYS = 7;
const SHIELD_REMOVAL_BONUS = {
  mineral: 100,
  gas: 0,
  description: '100 Mineral bonus for entering real PvP early',
};

export interface ShieldStatus {
  playerId: string;
  isActive: boolean;
  registeredAt: Date;
  expiresAt: Date;
  remainingSeconds: number;
  shieldRemovedAt: Date | null;
}

export interface RemoveShieldResult {
  shield: ShieldStatus;
  bonusGranted: SHIELD_REMOVAL_BONUS_TYPE;
}

type SHIELD_REMOVAL_BONUS_TYPE = typeof SHIELD_REMOVAL_BONUS;

@Injectable()
export class PvpShieldService {
  private readonly logger = new Logger(PvpShieldService.name);

  constructor(
    @InjectRepository(PlayerShield)
    private readonly shieldRepo: Repository<PlayerShield>,
  ) {}

  async registerPlayer(playerId: string, registeredAt?: Date): Promise<ShieldStatus> {
    const existing = await this.shieldRepo.findOne({ where: { playerId } });
    if (existing) {
      return this.buildStatus(existing);
    }

    const shield = this.shieldRepo.create({
      playerId,
      registeredAt: registeredAt ?? new Date(),
    });
    const saved = await this.shieldRepo.save(shield);
    this.logger.log(`PvP shield registered for player ${playerId}`);
    return this.buildStatus(saved);
  }

  async getShieldStatus(playerId: string): Promise<ShieldStatus> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) {
      throw new NotFoundException(`No shield record found for player ${playerId}`);
    }
    return this.buildStatus(shield);
  }

  async isShieldActive(playerId: string): Promise<boolean> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) return false;
    return this.computeIsActive(shield);
  }

  async removeShield(playerId: string): Promise<RemoveShieldResult> {
    const shield = await this.shieldRepo.findOne({ where: { playerId } });
    if (!shield) {
      throw new NotFoundException(`No shield record found for player ${playerId}`);
    }
    if (!this.computeIsActive(shield)) {
      throw new ConflictException('Shield is not active — it has already expired or been removed');
    }

    shield.shieldRemovedAt = new Date();
    shield.shieldRemovalBonusGranted = true;
    const saved = await this.shieldRepo.save(shield);

    this.logger.log(`Player ${playerId} voluntarily removed PvP shield — bonus granted`);

    return {
      shield: this.buildStatus(saved),
      bonusGranted: SHIELD_REMOVAL_BONUS,
    };
  }

  private computeIsActive(shield: PlayerShield): boolean {
    if (shield.shieldRemovedAt !== null) return false;
    const expiresAt = this.computeExpiresAt(shield.registeredAt);
    return expiresAt > new Date();
  }

  private computeExpiresAt(registeredAt: Date): Date {
    const expires = new Date(registeredAt);
    expires.setDate(expires.getDate() + SHIELD_DURATION_DAYS);
    return expires;
  }

  private buildStatus(shield: PlayerShield): ShieldStatus {
    const expiresAt = this.computeExpiresAt(shield.registeredAt);
    const now = new Date();
    const isActive = shield.shieldRemovedAt === null && expiresAt > now;
    const remainingMs = isActive ? expiresAt.getTime() - now.getTime() : 0;

    return {
      playerId: shield.playerId,
      isActive,
      registeredAt: shield.registeredAt,
      expiresAt,
      remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
      shieldRemovedAt: shield.shieldRemovedAt,
    };
  }
}
