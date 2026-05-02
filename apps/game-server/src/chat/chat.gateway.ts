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

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
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
  handleJoinAlliance(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { allianceId: string },
  ): { success: boolean } {
    const room = `chat:alliance:${data.allianceId}`;
    client.join(room);
    this.logger.debug(`User ${client.data.user.sub} joined alliance channel ${data.allianceId}`);
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

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_history')
  async handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelType: ChannelType; channelId?: string },
  ): Promise<{ messages: any[] }> {
    const messages = await this.chatService.getHistory(data.channelType, data.channelId);
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
