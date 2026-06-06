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
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { ChatService } from './chat.service';
import { SendMessageDto, PrivateMessageDto } from './dto/send-message.dto';
import { ChannelType } from './entities/chat-message.entity';

const GLOBAL_ROOM = 'chat:global';

@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Chat connected: ${client.id}`);
    client.join(GLOBAL_ROOM);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Chat disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_alliance_channel')
  async handleJoinAlliance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { allianceId: string },
  ): Promise<{ success: boolean }> {
    const userId = client.data.user.sub;
    if (!data?.allianceId) {
      throw new WsException('allianceId zorunludur');
    }
    const isMember = await this.chatService.isGuildMember(userId, data.allianceId);
    if (!isMember) {
      this.logger.warn(
        `User ${userId} attempted to join alliance channel ${data.allianceId} without membership`,
      );
      throw new WsException('İttifak kanalına erişim reddedildi');
    }
    const room = `chat:alliance:${data.allianceId}`;
    client.join(room);
    this.logger.debug(`User ${userId} joined alliance channel ${data.allianceId}`);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_alliance_channel')
  handleLeaveAlliance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { allianceId: string },
  ): { success: boolean } {
    client.leave(`chat:alliance:${data.allianceId}`);
    return { success: true };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): Promise<{ success: boolean; messageId: string }> {
    const userId = client.data.user.sub;

    if (dto.content?.length > 500) {
      throw new WsException('Mesaj en fazla 500 karakter olabilir');
    }

    if (dto.channelType === ChannelType.PRIVATE) {
      throw new WsException('Özel mesaj için send_private_message eventini kullanın');
    }

    const message = await this.chatService.sendMessage(userId, dto);

    const payload = {
      id: message.id,
      senderId: userId,
      channelType: dto.channelType,
      channelId: dto.channelId ?? null,
      content: dto.content,
      createdAt: message.createdAt,
    };

    if (dto.channelType === ChannelType.GLOBAL) {
      this.server.to(GLOBAL_ROOM).emit('new_message', payload);
    } else if (dto.channelType === ChannelType.ALLIANCE && dto.channelId) {
      this.server.to(`chat:alliance:${dto.channelId}`).emit('new_message', payload);
    }

    return { success: true, messageId: message.id };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_private_message')
  async handlePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: PrivateMessageDto,
  ): Promise<{ success: boolean; messageId: string }> {
    const senderId = client.data.user.sub;

    if (senderId === dto.recipientId) {
      throw new WsException('Kendinize özel mesaj gönderemezsiniz');
    }

    const channelId = this.chatService.buildPrivateChannelId(senderId, dto.recipientId);
    const message = await this.chatService.sendMessage(senderId, {
      channelType: ChannelType.PRIVATE,
      channelId,
      content: dto.content,
    });

    const payload = {
      id: message.id,
      senderId,
      recipientId: dto.recipientId,
      content: dto.content,
      createdAt: message.createdAt,
    };

    const privateRoom = `chat:private:${channelId}`;
    this.server.to(privateRoom).emit('private_message', payload);

    // Also send to the sender's own socket if not in private room
    client.emit('private_message', payload);

    return { success: true, messageId: message.id };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_private_channel')
  handleJoinPrivate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string },
  ): { success: boolean; channelId: string } {
    const userId = client.data.user.sub;
    const channelId = this.chatService.buildPrivateChannelId(userId, data.recipientId);
    client.join(`chat:private:${channelId}`);
    return { success: true, channelId };
  }

  /**
   * Return last N chat messages for a given channel.
   *
   * SECURITY (IDOR-CHAT-DM-HISTORY-01, fixed 2026-06-06):
   * Previously this handler forwarded `{channelType, channelId}` straight
   * to ChatService.getHistory with NO authorization. Because PRIVATE
   * channelIds are deterministic `[userA, userB].sort().join(":")` and
   * both user UUIDs are knowable (leaderboard, /users, alliance members),
   * any authenticated client could socket-emit
   * `get_history` with `{channelType:"PRIVATE", channelId:"u1:u2"}` and
   * receive the last 50 DMs between u1 and u2 — a full DM history leak.
   *
   * Now:
   *  - PRIVATE: caller may either pass `recipientId` (preferred — server
   *    derives the channelId from the JWT sub + recipientId) OR pass an
   *    explicit channelId which MUST contain the caller's userId.
   *  - ALLIANCE: caller must currently be a member of the guild/alliance.
   *  - GLOBAL/SYSTEM: open to all authenticated clients (channelId
   *    ignored for safety).
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_history')
  async handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { channelType: ChannelType; channelId?: string; recipientId?: string },
  ): Promise<{ messages: any[] }> {
    const userId = client.data.user.sub;
    if (!userId) {
      throw new WsException('Yetkisiz erişim');
    }
    if (!data?.channelType) {
      throw new WsException('channelType zorunludur');
    }

    let resolvedChannelId: string | undefined = data.channelId;

    switch (data.channelType) {
      case ChannelType.PRIVATE: {
        // Preferred path: derive channelId server-side from caller + recipient.
        if (data.recipientId) {
          if (data.recipientId === userId) {
            throw new WsException('Kendinize özel mesaj geçmişi alamazsınız');
          }
          resolvedChannelId = this.chatService.buildPrivateChannelId(
            userId,
            data.recipientId,
          );
          break;
        }
        // Legacy path: client passed channelId directly — verify caller is one of the two participants.
        if (!resolvedChannelId) {
          throw new WsException('Özel mesaj geçmişi için channelId veya recipientId gereklidir');
        }
        if (!this.chatService.isPrivateChannelParticipant(userId, resolvedChannelId)) {
          this.logger.warn(
            `User ${userId} attempted to read DM history for channelId ${resolvedChannelId}`,
          );
          throw new WsException('Özel mesaj geçmişine erişim reddedildi');
        }
        break;
      }
      case ChannelType.ALLIANCE: {
        if (!resolvedChannelId) {
          throw new WsException('İttifak geçmişi için channelId gereklidir');
        }
        const isMember = await this.chatService.isGuildMember(userId, resolvedChannelId);
        if (!isMember) {
          this.logger.warn(
            `User ${userId} attempted to read alliance history for ${resolvedChannelId} without membership`,
          );
          throw new WsException('İttifak geçmişine erişim reddedildi');
        }
        break;
      }
      case ChannelType.GLOBAL:
      case ChannelType.SYSTEM: {
        // No per-channel scoping for global/system — ignore any client-supplied channelId
        // to prevent probing of arbitrary channel IDs.
        resolvedChannelId = undefined;
        break;
      }
      default:
        throw new WsException('Bilinmeyen channelType');
    }

    const messages = await this.chatService.getHistory(data.channelType, resolvedChannelId);
    return { messages };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ): Promise<{ success: boolean }> {
    const userId = client.data.user.sub;
    await this.chatService.deleteMessage(data.messageId, userId);

    // Notify all relevant rooms
    this.server.emit('message_deleted', { messageId: data.messageId });
    return { success: true };
  }
}
