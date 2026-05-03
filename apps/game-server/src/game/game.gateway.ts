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
import { GameService, GameActionResultEvent } from './game.service';
import { RoomService, GameStatus } from './room.service';
import { SessionService } from './session.service';
import { GameActionDto } from './dto/game-action.dto';
import { ReconnectDto } from './dto/reconnect.dto';

@WebSocketGateway({ namespace: '/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly gameService: GameService,
    private readonly rooms: RoomService,
    private readonly sessions: SessionService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Connected to /game: ${client.id}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    const room = await this.rooms.getRoomByUser(userId);
    if (!room || room.status === GameStatus.FINISHED) return;

    await this.rooms.setPlayerConnection(room.id, userId, false);

    this.server.to(room.id).emit('player_disconnected', {
      userId,
      reconnectWindowMs: 30000,
    });

    this.logger.log(`Player ${userId} disconnected from room ${room.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<{ success: boolean; reconnectToken: string }> {
    const userId = client.data.user.sub;
    const room = await this.rooms.get(data.roomId);

    if (!room) throw new WsException('Room not found');
    if (!room.players[userId]) throw new WsException('Not a player in this room');

    client.join(data.roomId);
    await this.rooms.setPlayerConnection(room.id, userId, true, client.id);

    const reconnectToken = await this.sessions.create(userId, room.id, client.id);
    client.emit('room_joined', { room, reconnectToken });

    return { success: true, reconnectToken };
  }

  @SubscribeMessage('reconnect')
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReconnectDto,
  ): Promise<{ success: boolean }> {
    const session = await this.sessions.getByToken(dto.reconnectToken);
    if (!session) throw new WsException('Invalid or expired reconnect token');

    const room = await this.rooms.get(session.roomId);
    if (!room || room.status === GameStatus.FINISHED) {
      throw new WsException('Game has ended');
    }

    // Restore socket data (no JWT needed for reconnect — token is the credential)
    client.data.user = { sub: session.userId };

    await this.sessions.updateSocket(session.userId, client.id);
    await this.rooms.setPlayerConnection(room.id, session.userId, true, client.id);

    client.join(room.id);
    client.emit('reconnected', {
      room,
      yourTurn: room.currentPlayerId === session.userId,
    });

    this.server.to(room.id).except(client.id).emit('player_reconnected', {
      userId: session.userId,
    });

    this.logger.log(`Player ${session.userId} reconnected to room ${room.id}`);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('game_action')
  async handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: GameActionDto,
  ): Promise<{ success: boolean; stateHash: string }> {
    const userId = client.data.user.sub;
    const result = await this.gameService.processAction(userId, dto);

    if (!result.success) throw new WsException(result.error || 'Action rejected');

    for (const event of result.events) {
      this.server.to(dto.roomId).emit(event.type, event.data);
    }

    const { room } = result;
    this.server.to(dto.roomId).emit('state_update', {
      stateHash: room!.stateHash,
      currentPlayerId: room!.currentPlayerId,
      turn: room!.currentTurn,
      phase: room!.phase,
      status: room!.status,
    });

    return { success: true, stateHash: room!.stateHash };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('request_sync')
  async handleSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const userId = client.data.user.sub;
    const room = await this.rooms.get(data.roomId);

    if (!room || !room.players[userId]) throw new WsException('Room not found or access denied');
    client.emit('full_state_sync', { room });
  }

  @OnEvent('game.action_result')
  handleActionResult({ roomId, result }: GameActionResultEvent): void {
    for (const event of result.events) {
      this.server.to(roomId).emit(event.type, event.data);
    }

    if (result.room) {
      this.server.to(roomId).emit('state_update', {
        stateHash: result.room.stateHash,
        currentPlayerId: result.room.currentPlayerId,
        turn: result.room.currentTurn,
        phase: result.room.phase,
        status: result.room.status,
      });
    }
  }
}
