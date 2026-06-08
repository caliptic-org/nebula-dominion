import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { MatchmakingService, QueueEntry, MatchResult } from './matchmaking.service';
import { JoinQueueDto, GameMode } from './dto/join-queue.dto';
import { ProgressionService } from '../progression/progression.service';
import type { GameCreatedEvent } from '../game/game.service';

@WebSocketGateway({ namespace: '/matchmaking' })
export class MatchmakingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MatchmakingGateway.name);

  constructor(
    private readonly matchmaking: MatchmakingService,
    // ELO-NOT-PERSISTED (cycle 23) — seed the queue from the player's persisted
    // rating, not the JWT (which carries no elo/gamesPlayed).
    private readonly progression: ProgressionService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data?.user;
    if (user?.sub) {
      await this.matchmaking.leaveQueue(user.sub);
      this.logger.debug(`Removed ${user.sub} from all queues on disconnect`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinQueueDto,
  ): Promise<{ success: boolean }> {
    const user = client.data.user;

    if (await this.matchmaking.isInQueue(user.sub, dto.mode)) {
      throw new WsException('Already in queue for this mode');
    }

    // ELO-NOT-PERSISTED (cycle 23) — seed from the player's durable rating
    // (player_levels) instead of the JWT defaults, so matchmaking actually
    // brackets by skill and the K-factor decays as ranked_games accrues.
    // Best-effort: a read hiccup falls back to the 1000/0 baseline rather than
    // blocking the player from queueing.
    const ranking = await this.progression
      .getRanking(user.sub)
      .catch(() => ({ elo: 1000, gamesPlayed: 0 }));

    const entry: QueueEntry = {
      userId: user.sub,
      socketId: client.id,
      elo: ranking.elo,
      gamesPlayed: ranking.gamesPlayed,
      race: dto.race,
      mode: dto.mode,
      queuedAt: Date.now(),
    };

    await this.matchmaking.joinQueue(entry);

    // Attempt immediate match
    await this.matchmaking.processQueue(dto.mode);

    const stats = await this.matchmaking.getQueueStats(dto.mode);
    client.emit('queue_joined', { mode: dto.mode, playersSearching: stats.count });
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_queue')
  async handleLeaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mode: GameMode },
  ): Promise<{ success: boolean }> {
    const user = client.data.user;
    await this.matchmaking.leaveQueue(user.sub, data.mode);
    client.emit('queue_left', { mode: data.mode });
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('queue_status')
  async handleQueueStatus(): Promise<{ stats: { mode: GameMode; count: number }[] }> {
    const stats = await Promise.all(
      Object.values(GameMode).map(async (mode) => ({
        mode,
        count: (await this.matchmaking.getQueueStats(mode)).count,
      })),
    );
    return { stats };
  }

  @OnEvent('matchmaking.matched')
  handleMatchFound(match: MatchResult): void {
    const { matchId, player1, player2 } = match;

    this.server.to(player1.socketId).emit('match_found', {
      matchId,
      side: 'player1',
      opponentElo: player2.elo,
      opponentRace: player2.race,
    });

    this.server.to(player2.socketId).emit('match_found', {
      matchId,
      side: 'player2',
      opponentElo: player1.elo,
      opponentRace: player1.race,
    });
  }

  @OnEvent('matchmaking.timeout')
  handleTimeout({ userId }: { userId: string }): void {
    // Best-effort: notify if still connected
    this.server.fetchSockets().then((sockets) => {
      const socket = sockets.find((s) => (s as any).data?.user?.sub === userId);
      if (socket) {
        socket.emit('queue_timeout', { message: 'No match found, removed from queue' });
      }
    });
  }

  @OnEvent('game.created')
  handleGameCreated(event: GameCreatedEvent): void {
    const { match, room, tokens } = event;
    const { player1, player2 } = match;

    this.server.to(player1.socketId).emit('game_start', {
      roomId: room.id,
      reconnectToken: tokens[player1.userId],
      yourTurn: room.currentPlayerId === player1.userId,
      opponentRace: player2.race,
      opponentElo: player2.elo,
    });

    this.server.to(player2.socketId).emit('game_start', {
      roomId: room.id,
      reconnectToken: tokens[player2.userId],
      yourTurn: room.currentPlayerId === player2.userId,
      opponentRace: player1.race,
      opponentElo: player1.elo,
    });

    this.logger.log(`Sent game_start to ${player1.userId} and ${player2.userId} for room ${room.id}`);
  }
}
