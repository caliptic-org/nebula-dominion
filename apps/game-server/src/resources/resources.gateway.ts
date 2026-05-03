import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { ResourcesService, ResourceSnapshot } from './resources.service';

@WebSocketGateway({ namespace: '/resources', cors: { origin: '*' } })
export class ResourcesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ResourcesGateway.name);

  /** Maps userId → Set of socket IDs connected in this namespace */
  private readonly playerSockets = new Map<string, Set<string>>();

  constructor(private readonly resourcesService: ResourcesService) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`/resources connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const userId: string | undefined = client.data?.user?.sub;
    if (userId) {
      const sockets = this.playerSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.playerSockets.delete(userId);
    }
    this.logger.debug(`/resources disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe_resources')
  async handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return;

    if (!this.playerSockets.has(userId)) {
      this.playerSockets.set(userId, new Set());
    }
    this.playerSockets.get(userId)!.add(client.id);

    // Send current snapshot on subscribe
    const snapshot = await this.resourcesService.getSnapshot(userId);
    client.emit('resource_snapshot', snapshot);
  }

  @OnEvent('resources.storage_near_full')
  handleStorageNearFull(payload: { playerId: string; nearFull: string[]; snapshot: ResourceSnapshot }) {
    const { playerId, nearFull, snapshot } = payload;
    const socketIds = this.playerSockets.get(playerId);
    if (!socketIds || socketIds.size === 0) return;

    for (const socketId of socketIds) {
      this.server.to(socketId).emit('storage_near_full', {
        nearFull,
        snapshot,
        message: `Storage nearly full: ${nearFull.join(', ')}. Spend resources to keep production running!`,
      });
    }

    this.logger.debug(`Storage warning sent: playerId=${playerId} resources=${nearFull.join(',')}`);
  }
}
