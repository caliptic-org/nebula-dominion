import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { RoomService, GameRoom, GameStatus } from '../game/room.service';
import { GameService, ActionResult } from '../game/game.service';
import { BotService } from './bot.service';
import { Race } from '../matchmaking/dto/join-queue.dto';

export const BOT_USER_ID_PREFIX = 'bot:';

function makeBotId(): string {
  return `${BOT_USER_ID_PREFIX}${uuidv4()}`;
}

@Injectable()
export class PveService {
  private readonly logger = new Logger(PveService.name);
  private readonly botTurnDelayMs = 600;

  constructor(
    private readonly rooms: RoomService,
    private readonly gameService: GameService,
    private readonly bot: BotService,
    private readonly emitter: EventEmitter2,
  ) {}

  async createPveGame(
    playerId: string,
    playerSocketId: string,
    playerRace: Race,
    playerElo: number,
    playerGamesPlayed: number,
    botRace?: Race,
  ): Promise<{ room: GameRoom; botId: string }> {
    const botId = makeBotId();
    const selectedBotRace = botRace ?? this.pickBotRace(playerRace);

    const matchId = uuidv4();
    const room = await this.rooms.create(
      matchId,
      { userId: playerId, socketId: playerSocketId, race: playerRace, elo: playerElo, gamesPlayed: playerGamesPlayed },
      { userId: botId, socketId: '', race: selectedBotRace, elo: playerElo, gamesPlayed: 10 },
      'pve',
    );

    room.status = GameStatus.IN_PROGRESS;
    await this.rooms.save(room);
    await this.rooms.setUserRoom(playerId, room.id);

    this.logger.log(`PvE game created: room=${room.id} player=${playerId} bot=${botId}`);

    // If bot goes first, schedule its turn
    if (room.currentPlayerId === botId) {
      setTimeout(() => this.runBotTurn(room.id, botId), this.botTurnDelayMs);
    }

    return { room, botId };
  }

  async onPlayerActionProcessed(room: GameRoom, botId: string): Promise<void> {
    if (room.status !== GameStatus.IN_PROGRESS) return;
    if (room.currentPlayerId !== botId) return;

    setTimeout(() => this.runBotTurn(room.id, botId), this.botTurnDelayMs);
  }

  private async runBotTurn(roomId: string, botId: string): Promise<void> {
    const room = await this.rooms.get(roomId);
    if (!room || room.status !== GameStatus.IN_PROGRESS) return;
    if (room.currentPlayerId !== botId) return;

    let seq = (room.players[botId]?.lastActionSequence ?? 0) + 1;
    let iterations = 0;
    const MAX_ITER = 20;

    while (iterations < MAX_ITER) {
      iterations++;
      const freshRoom = await this.rooms.get(roomId);
      if (!freshRoom || freshRoom.status !== GameStatus.IN_PROGRESS) break;
      if (freshRoom.currentPlayerId !== botId) break;

      const action = this.bot.decideAction(freshRoom, botId, seq);
      if (!action) break;

      const result: ActionResult = await this.gameService.processAction(botId, action);
      if (!result.success) {
        this.logger.warn(`Bot action rejected: ${result.error}`);
        break;
      }

      this.emitter.emit('pve.bot_action', { roomId, result });
      seq++;

      if (!result.room || result.room.currentPlayerId !== botId) break;

      // Small delay between bot actions for realism
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  private pickBotRace(playerRace: Race): Race {
    const others = Object.values(Race).filter((r) => r !== playerRace);
    return others[Math.floor(Math.random() * others.length)];
  }
}
