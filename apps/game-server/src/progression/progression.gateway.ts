import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { LevelUpEvent, XpGainedEvent } from './dto/player-progress.dto';

@WebSocketGateway({ namespace: '/game', cors: { origin: process.env.WEBSOCKET_CORS_ORIGIN || '*' } })
export class ProgressionGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressionGateway.name);

  @OnEvent('progression.level_up')
  handleLevelUp(event: LevelUpEvent): void {
    // Emit to the specific user's room
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
