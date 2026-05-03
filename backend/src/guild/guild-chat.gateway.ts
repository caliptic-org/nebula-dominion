import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GuildChatService, ChatMessageView } from './guild-chat.service';
import { GuildMembershipService } from './guild-membership.service';

interface AuthedSocket extends Socket {
  data: {
    userId?: string;
    guildId?: string;
  };
}

@WebSocketGateway({
  namespace: '/guild-chat',
  cors: { origin: '*' },
})
export class GuildChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GuildChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chat: GuildChatService,
    private readonly membership: GuildMembershipService,
  ) {}

  async handleConnection(client: AuthedSocket) {
    // Production should verify the JWT here. For now, trust headers/handshake auth.
    const userId = (client.handshake.auth?.userId as string | undefined) ?? (client.handshake.query.userId as string | undefined);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    try {
      const member = await this.membership.getMember(userId);
      client.data.userId = userId;
      client.data.guildId = member.guildId;
      await client.join(this.roomFor(member.guildId));
      const history = await this.chat.getRollingWindow(member.guildId);
      client.emit('history', history);
      this.logger.log(`User ${userId} joined guild chat ${member.guildId}`);
    } catch (err) {
      this.logger.warn(`Connection rejected for ${userId}: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.data.userId) {
      this.logger.log(`User ${client.data.userId} disconnected from guild chat`);
    }
  }

  @SubscribeMessage('send')
  async handleSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { content: string },
  ): Promise<{ ok: true; message: ChatMessageView } | { ok: false; error: string }> {
    if (!client.data.userId || !client.data.guildId) {
      throw new WsException('not_authenticated');
    }
    try {
      const message = await this.chat.sendMessage(client.data.userId, body.content);
      this.server.to(this.roomFor(client.data.guildId)).emit('message', message);
      return { ok: true, message };
    } catch (err) {
      const e = err as { message?: string; getResponse?: () => unknown };
      const response = typeof e.getResponse === 'function' ? e.getResponse() : { error: e.message };
      return { ok: false, error: JSON.stringify(response) };
    }
  }

  private roomFor(guildId: string): string {
    return `guild:${guildId}`;
  }
}
