import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IsEnum, IsOptional } from 'class-validator';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { PveService } from './pve.service';
import { ActionResult } from '../game/game.service';
import { Race } from '../matchmaking/dto/join-queue.dto';

class StartPveDto {
  @IsEnum(Race)
  race: Race;

  @IsOptional()
  @IsEnum(Race)
  botRace?: Race;

  playerElo?: number;
  playerGamesPlayed?: number;
}

@WebSocketGateway({ namespace: '/pve' })
export class PveGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PveGateway.name);

  constructor(private readonly pveService: PveService) {}

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('start_pve')
  async handleStartPve(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: StartPveDto,
  ): Promise<void> {
    const userId = client.data.user.sub;

    const { room, botId } = await this.pveService.createPveGame(
      userId,
      client.id,
      dto.race,
      dto.playerElo ?? 1000,
      dto.playerGamesPlayed ?? 0,
      dto.botRace,
    );

    client.join(room.id);
    client.emit('pve_game_ready', {
      roomId: room.id,
      botId,
      yourTurn: room.currentPlayerId === userId,
      botRace: room.players[botId]?.race,
      playerRace: room.players[userId]?.race,
    });

    this.logger.log(`PvE started: userId=${userId} room=${room.id}`);
  }

  @OnEvent('pve.bot_action')
  handleBotAction(payload: { roomId: string; result: ActionResult }): void {
    const { roomId, result } = payload;
    if (!result.success || !result.room) return;

    for (const event of result.events) {
      this.server.to(roomId).emit(event.type, event.data);
    }

    this.server.to(roomId).emit('state_update', {
      stateHash: result.room.stateHash,
      currentPlayerId: result.room.currentPlayerId,
      turn: result.room.currentTurn,
      phase: result.room.phase,
      status: result.room.status,
      isBotAction: true,
    });
  }
}
