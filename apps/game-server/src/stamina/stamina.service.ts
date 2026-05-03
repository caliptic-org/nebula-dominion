import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerStamina } from './entities/player-stamina.entity';

export interface StaminaSnapshot {
  currentStamina: number;
  maxStamina: number;
  costPerBattle: number;
  regenIntervalMinutes: number;
  /** Minutes until next stamina point regenerates */
  minutesUntilNextRegen: number | null;
  lastRegenAt: Date;
}

@Injectable()
export class StaminaService {
  private readonly logger = new Logger(StaminaService.name);

  constructor(
    @InjectRepository(PlayerStamina)
    private readonly staminaRepo: Repository<PlayerStamina>,
  ) {}

  async getOrCreate(userId: string): Promise<PlayerStamina> {
    let stamina = await this.staminaRepo.findOne({ where: { userId } });
    if (!stamina) {
      stamina = this.staminaRepo.create({ userId });
      await this.staminaRepo.save(stamina);
    }
    return stamina;
  }

  /** Compute and apply passive regen based on elapsed time, then return current snapshot. */
  async getSnapshot(userId: string): Promise<StaminaSnapshot> {
    const stamina = await this.getOrCreate(userId);
    await this.applyRegen(stamina);
    return this.toSnapshot(stamina);
  }

  async canAffordBattle(userId: string): Promise<boolean> {
    const snap = await this.getSnapshot(userId);
    return snap.currentStamina >= snap.costPerBattle;
  }

  /**
   * Deduct stamina for a battle.
   * Returns the updated snapshot, or throws if not enough stamina.
   */
  async deductForBattle(userId: string): Promise<StaminaSnapshot> {
    const stamina = await this.getOrCreate(userId);
    await this.applyRegen(stamina);

    if (stamina.currentStamina < stamina.costPerBattle) {
      throw new Error(`Not enough stamina for battle. Current: ${stamina.currentStamina}/${stamina.maxStamina}`);
    }

    stamina.currentStamina -= stamina.costPerBattle;
    await this.staminaRepo.save(stamina);

    this.logger.log(`Stamina deducted: userId=${userId} remaining=${stamina.currentStamina}/${stamina.maxStamina}`);
    return this.toSnapshot(stamina);
  }

  /** Refill stamina to max (e.g. premium purchase or admin). */
  async refill(userId: string): Promise<StaminaSnapshot> {
    const stamina = await this.getOrCreate(userId);
    stamina.currentStamina = stamina.maxStamina;
    stamina.lastRegenAt = new Date();
    await this.staminaRepo.save(stamina);
    return this.toSnapshot(stamina);
  }

  /** Apply time-based regen (1 per regenIntervalMinutes) and persist. */
  private async applyRegen(stamina: PlayerStamina): Promise<void> {
    if (stamina.currentStamina >= stamina.maxStamina) return;

    const now = new Date();
    const elapsedMs = now.getTime() - new Date(stamina.lastRegenAt).getTime();
    const intervalMs = stamina.regenIntervalMinutes * 60_000;
    const ticks = Math.floor(elapsedMs / intervalMs);

    if (ticks <= 0) return;

    const gained = Math.min(ticks, stamina.maxStamina - stamina.currentStamina);
    stamina.currentStamina += gained;
    // Advance lastRegenAt by the consumed ticks only (preserve fractional time)
    stamina.lastRegenAt = new Date(stamina.lastRegenAt.getTime() + ticks * intervalMs);

    await this.staminaRepo.save(stamina);
    this.logger.debug(`Stamina regen: userId=${stamina.userId} +${gained} → ${stamina.currentStamina}`);
  }

  private toSnapshot(stamina: PlayerStamina): StaminaSnapshot {
    let minutesUntilNextRegen: number | null = null;

    if (stamina.currentStamina < stamina.maxStamina) {
      const now = Date.now();
      const intervalMs = stamina.regenIntervalMinutes * 60_000;
      const elapsed = now - new Date(stamina.lastRegenAt).getTime();
      const remaining = intervalMs - (elapsed % intervalMs);
      minutesUntilNextRegen = Math.ceil(remaining / 60_000);
    }

    return {
      currentStamina: stamina.currentStamina,
      maxStamina: stamina.maxStamina,
      costPerBattle: stamina.costPerBattle,
      regenIntervalMinutes: stamina.regenIntervalMinutes,
      minutesUntilNextRegen,
      lastRegenAt: stamina.lastRegenAt,
    };
  }
}
