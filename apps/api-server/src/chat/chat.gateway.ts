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
import { WsJwtGuard } from './ws-jwt.guard';
import { ChatService } from './chat.service';
import { ChatChannel } from './entities/chat-message.entity';

const GLOBAL_ROOM = 'chat:global';

/**
 * WebSocket gateway for global and guild chat.
 * Clients connect at: ws://<host>/ws/chat
 *
 * Events (client → server):
 *   join_guild   { guildId }            — join a guild room
 *   leave_guild  { guildId }            — leave a guild room
 *   send_message { channel, content, guildId? } — broadcast a message
 *
 * Events (server → client):
 *   new_message  { id, channel, guildId, authorId, content, createdAt }
 *   online_count { count }
 */
@WebSocketGateway({ namespace: '/ws/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Chat client connected: ${client.id}`);
    client.join(GLOBAL_ROOM);
    this.broadcastOnlineCount();
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Chat client disconnected: ${client.id}`);
    if (client.data?.user?.sub) {
      this.chatService.markOffline(client.data.user.sub);
    }
    this.broadcastOnlineCount();
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('authenticate')
  handleAuthenticate(@ConnectedSocket() client: Socket): { success: boolean } {
    const userId = client.data.user.sub;
    this.chatService.markOnline(userId);
    this.broadcastOnlineCount();
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_guild')
  handleJoinGuild(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { guildId: string },
  ): { success: boolean } {
    client.join(`chat:guild:${data.guildId}`);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_guild')
  handleLeaveGuild(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { guildId: string },
  ): { success: boolean } {
    client.leave(`chat:guild:${data.guildId}`);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: ChatChannel; content: string; guildId?: string },
  ): Promise<{ success: boolean; messageId: string }> {
    const userId = client.data.user.sub;

    if (!data.content || data.content.length > 500) {
      throw new WsException('Mesaj 1-500 karakter arasında olmalıdır');
    }

    const message = await this.chatService.sendMessage(userId, {
      channel: data.channel,
      content: data.content,
      guildId: data.guildId,
    });

    const payload = {
      id: message.id,
      channel: message.channel,
      guildId: data.guildId ?? null,
      authorId: userId,
      content: message.content,
      type: message.type,
      race: message.race,
      createdAt: message.createdAt,
    };

    if (data.channel === ChatChannel.GLOBAL) {
      this.server.to(GLOBAL_ROOM).emit('new_message', payload);
    } else if (data.channel === ChatChannel.GUILD && data.guildId) {
      this.server.to(`chat:guild:${data.guildId}`).emit('new_message', payload);
    }

    return { success: true, messageId: message.id };
  }

  broadcastMessage(payload: object): void {
    this.server.to(GLOBAL_ROOM).emit('new_message', payload);
  }

  private broadcastOnlineCount(): void {
    this.server.emit('online_count', { count: this.chatService.getOnlineCount() });
  }
}
