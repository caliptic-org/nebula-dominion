import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BuildingsService } from './buildings.service';

interface PrestigeUpEvent {
  userId: string;
  prestigeLevel: number;
}

/**
 * Bridge between `progression.prestige_up` and production recalculation
 * (FLOW-004 pt.2).
 *
 * progression.service banks a prestige level (the atomic cascade UPDATE)
 * and emits `progression.prestige_up`. The permanent +2%/level production
 * bonus is read by BuildingsService.recalculateProductionRates via
 * ProgressionService.getPrestigeProductionBonus — but that recalc only ran
 * on build/upgrade. Without this listener a maxed player who prestiges
 * mid-session wouldn't see the higher rate until their next construction.
 *
 * Lives in the buildings module so the dependency direction stays correct
 * (buildings already imports ProgressionModule + injects BuildingsService;
 * progression has no knowledge of buildings).
 */
@Injectable()
export class PrestigeRecalcListener {
  private readonly logger = new Logger(PrestigeRecalcListener.name);

  constructor(private readonly buildings: BuildingsService) {}

  @OnEvent('progression.prestige_up')
  async handlePrestigeUp(event: PrestigeUpEvent): Promise<void> {
    try {
      await this.buildings.recalculateProductionRates(event.userId);
    } catch (err) {
      // A recalc failure must never propagate — the prestige level is
      // already persisted and the bonus will still apply on the player's
      // next build/upgrade. Log and swallow.
      this.logger.error(
        `Prestige recalc failed user=${event.userId} ` +
          `prestige_level=${event.prestigeLevel}: ${
            err instanceof Error ? err.message : String(err)
          }`,
      );
    }
  }
}
