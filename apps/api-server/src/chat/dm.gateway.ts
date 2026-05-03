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

/**
 * WebSocket gateway for DM notifications and online/offline status.
 * Clients connect at: ws://<host>/ws/dm
 *
 * Events (client → server):
 *   authenticate {}  — register user as online, join personal room
 *
 * Events (server → client):
 *   dm_notification  { conversationId, senderId, preview, timestamp }
 *   presence_update  { userId, isOnline }
 */
@WebSocketGateway({ namespace: '/ws/dm', cors: { origin: '*' } })
export class DmGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DmGateway.name);

  // userId → Set of socket IDs (user may have multiple connections)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`DM client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.user?.sub;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.chatService.markOffline(userId);
          this.server.emit('presence_update', { userId, isOnline: false });
          this.logger.debug(`User ${userId} went offline`);
        }
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('authenticate')
  handleAuthenticate(@ConnectedSocket() client: Socket): { success: boolean } {
    const userId = client.data.user.sub;

    // Join personal notification room
    client.join(`dm:user:${userId}`);

    // Track socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.chatService.markOnline(userId);
    this.server.emit('presence_update', { userId, isOnline: true });

    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_dm')
  async handleSendDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; content: string },
  ): Promise<{ success: boolean; messageId: string; conversationId: string }> {
    const senderId = client.data.user.sub;

    if (!data.content || data.content.length > 500) {
      throw new WsException('Mesaj 1-500 karakter arasında olmalıdır');
    }

    const { message, conversationId } = await this.chatService.sendDm(
      senderId,
      data.recipientId,
      { content: data.content },
    );

    const notification = {
      conversationId,
      senderId,
      preview: data.content.length > 100 ? data.content.substring(0, 100) + '…' : data.content,
      timestamp: message.createdAt,
    };

    // Notify recipient
    this.server.to(`dm:user:${data.recipientId}`).emit('dm_notification', notification);

    return { success: true, messageId: message.id, conversationId };
  }

  /** Called by REST controller after a DM is sent via HTTP, to push a real-time notification */
  notifyDm(recipientId: string, payload: object): void {
    this.server.to(`dm:user:${recipientId}`).emit('dm_notification', payload);
  }
}
