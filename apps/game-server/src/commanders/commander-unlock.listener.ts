import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandersService } from './commanders.service';
import { EraTransitionEvent } from '../progression/dto/era-transition.dto';

/**
 * Bridge between `progression.era.transition` and commander unlock.
 *
 * The original audit (workflow run wf_cea4d7f7-3f1) flagged tier 4 + 5
 * commanders as ebediyen kilitli — the gates.config.ts had
 * 'commander.tier4' / 'commander.tier5' age min rules, the
 * CommandersService.unlock() method existed, but nothing wired the two
 * together. This listener closes that gap.
 *
 * The progression service emits `era.transition` (event-emitter, not
 * Socket.io) whenever a player advances ages. We hand the (userId,
 * newAge) tuple to `unlockAgeGatedCommanders()` which:
 *   1. Looks up the player's race
 *   2. Finds catalog commanders matching that race + age-gated tier
 *   3. UPSERTs unlocked_at via player_commanders
 *
 * Stays in the commanders module so the cross-module dependency is
 * inverted correctly (commanders depends on progression types, not the
 * other way around).
 */
@Injectable()
export class CommanderUnlockListener {
  private readonly logger = new Logger(CommanderUnlockListener.name);

  constructor(private readonly commandersService: CommandersService) {}

  @OnEvent('era.transition')
  async handleEraTransition(event: EraTransitionEvent): Promise<void> {
    try {
      await this.commandersService.unlockAgeGatedCommanders(
        event.userId,
        event.toAge,
      );
    } catch (err) {
      // Listener failures must NEVER block the transition emit — the
      // socket toast in progression.gateway.ts goes out independently
      // and the player still sees their age change. Log and swallow.
      this.logger.error(
        `Era transition unlock failed user=${event.userId} ` +
          `age=${event.fromAge}→${event.toAge}: ${
            err instanceof Error ? err.message : String(err)
          }`,
      );
    }
  }
}
