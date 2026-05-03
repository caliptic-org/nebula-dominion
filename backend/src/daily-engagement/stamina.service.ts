import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerStamina } from './entities/player-stamina.entity';
import { MAX_STAMINA, STAMINA_REGEN_MINUTES } from './types/daily-engagement.types';

@Injectable()
export class StaminaService {
  constructor(
    @InjectRepository(PlayerStamina)
    private readonly staminaRepo: Repository<PlayerStamina>,
  ) {}

  // Pure calculation — does NOT persist; caller decides whether to save
  private computeCurrent(stamina: PlayerStamina, now: Date): number {
    const elapsedMs = now.getTime() - new Date(stamina.lastRegenAt).getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const regenned = Math.floor(elapsedMinutes / STAMINA_REGEN_MINUTES);
    return Math.min(stamina.currentStamina + regenned, stamina.maxStamina);
  }

  async getOrCreate(playerId: string): Promise<PlayerStamina> {
    let stamina = await this.staminaRepo.findOne({ where: { playerId } });
    if (!stamina) {
      stamina = this.staminaRepo.create({
        playerId,
        currentStamina: MAX_STAMINA,
        maxStamina: MAX_STAMINA,
        lastRegenAt: new Date(),
      });
      stamina = await this.staminaRepo.save(stamina);
    }
    return stamina;
  }

  async getStamina(playerId: string): Promise<{
    currentStamina: number;
    maxStamina: number;
    nextRegenAt: Date | null;
  }> {
    const stamina = await this.getOrCreate(playerId);
    const now = new Date();
    const current = this.computeCurrent(stamina, now);

    let nextRegenAt: Date | null = null;
    if (current < stamina.maxStamina) {
      const elapsedMs = now.getTime() - new Date(stamina.lastRegenAt).getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);
      const minutesUntilNext = STAMINA_REGEN_MINUTES - (elapsedMinutes % STAMINA_REGEN_MINUTES);
      nextRegenAt = new Date(now.getTime() + minutesUntilNext * 60 * 1000);
    }

    return { currentStamina: current, maxStamina: stamina.maxStamina, nextRegenAt };
  }

  async spend(playerId: string, amount: number): Promise<{ currentStamina: number; maxStamina: number }> {
    const stamina = await this.getOrCreate(playerId);
    const now = new Date();
    const current = this.computeCurrent(stamina, now);

    if (current < amount) {
      throw new BadRequestException(
        `Insufficient stamina: have ${current}, need ${amount}`,
      );
    }

    // Persist regen that happened up to now, subtract spent amount
    const elapsedMs = now.getTime() - new Date(stamina.lastRegenAt).getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const partialMinutes = elapsedMinutes % STAMINA_REGEN_MINUTES;

    stamina.currentStamina = current - amount;
    // Roll back lastRegenAt to the start of the current partial interval so
    // regen resumes correctly from where we left off
    stamina.lastRegenAt = new Date(now.getTime() - partialMinutes * 60 * 1000);

    const saved = await this.staminaRepo.save(stamina);
    return { currentStamina: saved.currentStamina, maxStamina: saved.maxStamina };
  }
}
