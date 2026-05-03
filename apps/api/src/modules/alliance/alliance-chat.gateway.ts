import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { AllianceMember } from './entities/alliance-member.entity';

interface AuthenticatedSocket extends Socket {
  userId: string;
  allianceId: string;
}

@WebSocketGateway({ namespace: '/ws/alliance/chat', cors: true })
export class AllianceChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AllianceChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(AllianceMember)
    private readonly memberRepo: Repository<AllianceMember>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new WsException('Token gerekli');

      const payload = this.jwtService.verify(token);
      const member = await this.memberRepo.findOne({ where: { userId: payload.sub } });

      if (!member) throw new WsException('Bir loncaya üye değilsiniz');

      client.userId = payload.sub;
      client.allianceId = member.allianceId;
      client.join(member.allianceId);

      this.logger.log(`Client connected: ${client.userId} → alliance ${client.allianceId}`);
    } catch (err) {
      this.logger.warn(`Connection rejected: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.userId}`);
  }

  /** Broadcast a new message to all members of the alliance room. */
  broadcastMessage(allianceId: string, message: Record<string, unknown>) {
    this.server.to(allianceId).emit('message', message);
  }

  /** Broadcast a reaction update to all members of the alliance room. */
  broadcastReaction(allianceId: string, payload: Record<string, unknown>) {
    this.server.to(allianceId).emit('reaction', payload);
  }
}
