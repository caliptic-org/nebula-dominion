import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AgeTransitionEvent, LevelUpEvent, XpGainedEvent } from './dto/player-progress.dto';

@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class ProgressionGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressionGateway.name);

  @OnEvent('progression.level_up')
  handleLevelUp(event: LevelUpEvent): void {
    this.server.to(`user:${event.userId}`).emit('level_up', {
      previousLevel: event.previousLevel,
      newLevel: event.newLevel,
      age: event.age,
      tier: event.tier,
      newUnlocks: event.newUnlocks,
      rewards: event.rewards,
    });
    this.logger.log(`Emitted level_up to user=${event.userId} level=${event.newLevel}`);
  }

  @OnEvent('progression.age_transition')
  handleAgeTransition(event: AgeTransitionEvent): void {
    // badge_upgrade payload delivered to frontend for UI animations / badge display
    this.server.to(`user:${event.userId}`).emit('age_transition', {
      previousAge: event.previousAge,
      newAge: event.newAge,
      totalXpAtTransition: event.totalXpAtTransition,
      badge_upgrade: event.badge_upgrade,
    });
    this.logger.log(
      `Emitted age_transition to user=${event.userId} age=${event.previousAge}→${event.newAge} badge=${event.badge_upgrade.newBadgeTier}`,
    );
  }

  @OnEvent('progression.xp_gained')
  handleXpGained(event: XpGainedEvent): void {
    this.server.to(`user:${event.userId}`).emit('xp_gained', {
      xpGained: event.xpGained,
      source: event.source,
      currentXp: event.currentXp,
      xpToNext: event.xpToNext,
      currentLevel: event.currentLevel,
      age: event.age,
    });
  }
}
