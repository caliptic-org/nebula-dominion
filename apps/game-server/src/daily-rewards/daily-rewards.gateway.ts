import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { DailyRewardsService } from './daily-rewards.service';

/**
 * /daily-rewards Socket.io gateway.
 *
 * SECURITY (IDOR-DAILY-REWARDS-WS-BROADCAST, fixed 2026-06-06):
 *
 * Prior contract emitted server-push events with:
 *   this.server.emit(`user_${payload.userId}:loot_box_awarded`, ...)
 *
 * `server.emit` with NO room target is a namespace-wide broadcast: every
 * client connected to `/daily-rewards` (including unauthenticated lurkers
 * with `socket.onAny(...)` wired up) received an event whose NAME contained
 * the recipient's userId plus loot/quest activity. The user_<id> prefix was
 * cosmetic — the payload (and the userId embedded in the event name) leaked
 * to all connected sockets, enabling a passive listener to harvest a full
 * stream of `{userId, lootBoxId, source}` and `{userId, questType}` for the
 * entire active player base.
 *
 * New contract:
 *   - Class-level @UseGuards(WsJwtGuard) gates every @SubscribeMessage handler.
 *   - handleConnection verifies the JWT at the handshake (mirrors
 *     ws-jwt.guard token extraction) and disconnects unauthenticated sockets
 *     so they cannot sit on the namespace and snoop with onAny.
 *   - Authenticated sockets join a per-user room `user:<userId>`.
 *   - handleDisconnect cleans up the room membership tracking Map.
 *   - Server-push events use `this.server.to(`user:<userId>`).emit('loot_box_awarded', ...)`
 *     so ONLY sockets owned by that user receive the event, and the event
 *     name no longer carries any identifier.
 */
@UseGuards(WsJwtGuard)
@WebSocketGateway({ namespace: '/daily-rewards', cors: { origin: '*' } })
export class DailyRewardsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(DailyRewardsGateway.name);

  /** Maps userId → Set of socket IDs connected in this namespace */
  private readonly playerSockets = new Map<string, Set<string>>();

  constructor(
    private readonly dailyRewards: DailyRewardsService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.logger.log('DailyRewards gateway initialized');
  }

  /**
   * Authenticate the socket at connection time and bind it to a per-user
   * room. Unauthenticated sockets are forcibly disconnected so they cannot
   * sit on the namespace harvesting `onAny` traffic from the legacy
   * namespace-wide broadcasts. Mirrors the pattern used by ws-jwt.guard.
   */
  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`/daily-rewards rejected ${client.id}: missing token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      const userId: string | undefined = payload?.sub;
      if (!userId) {
        this.logger.warn(`/daily-rewards rejected ${client.id}: token missing sub`);
        client.disconnect(true);
        return;
      }

      client.join(`user:${userId}`);

      if (!this.playerSockets.has(userId)) {
        this.playerSockets.set(userId, new Set());
      }
      this.playerSockets.get(userId)!.add(client.id);

      this.logger.debug(`/daily-rewards connected: ${client.id} userId=${userId}`);
    } catch (err) {
      this.logger.warn(`/daily-rewards rejected ${client.id}: invalid JWT (${err.message})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId: string | undefined = client.data?.user?.sub;
    if (userId) {
      const sockets = this.playerSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets && sockets.size === 0) this.playerSockets.delete(userId);
    }
    this.logger.debug(`/daily-rewards disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return client.handshake.auth?.token ?? null;
  }

  @SubscribeMessage('get_streak_status')
  async onGetStreakStatus(@ConnectedSocket() client: Socket) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const status = await this.dailyRewards.getStreakStatus(userId);
    client.emit('streak_status', status);
  }

  @SubscribeMessage('claim_daily_streak')
  async onClaimStreak(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { useRescueToken?: boolean },
  ) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const result = await this.dailyRewards.claimDailyStreak(userId, data?.useRescueToken ?? false);
    client.emit('streak_claimed', result);
    return result;
  }

  @SubscribeMessage('get_daily_quests')
  async onGetDailyQuests(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerAge: number },
  ) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const age = data?.playerAge ?? 1;
    const status = await this.dailyRewards.getDailyQuests(userId, age);
    client.emit('daily_quests', status);
  }

  @SubscribeMessage('get_loot_boxes')
  async onGetLootBoxes(@ConnectedSocket() client: Socket) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const boxes = await this.dailyRewards.getUnopenedLootBoxes(userId);
    client.emit('loot_boxes', boxes);
  }

  @SubscribeMessage('open_loot_box')
  async onOpenLootBox(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lootBoxId: string },
  ) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const result = await this.dailyRewards.openLootBox(userId, data.lootBoxId);
    if (!result) {
      client.emit('open_loot_box_error', { message: 'Loot box not found or already opened' });
      return;
    }
    client.emit('loot_box_opened', result);
    return result;
  }

  // ─── Server-push events ────────────────────────────────────────────────────

  /**
   * Emit to ONLY the target user's room (per-user-room contract — see class
   * JSDoc). Pre-fix this was `this.server.emit(...)` which fanned out to
   * every connected socket on /daily-rewards.
   */
  @OnEvent('daily_rewards.loot_box_awarded')
  handleLootBoxAwarded(payload: { userId: string; lootBoxId: string; source: string }) {
    this.server.to(`user:${payload.userId}`).emit('loot_box_awarded', {
      lootBoxId: payload.lootBoxId,
      source: payload.source,
    });
  }

  /**
   * Emit to ONLY the target user's room (per-user-room contract — see class
   * JSDoc). Pre-fix this was `this.server.emit(...)` which fanned out to
   * every connected socket on /daily-rewards.
   */
  @OnEvent('daily_rewards.quest_completed')
  handleQuestCompleted(payload: { userId: string; questType: string }) {
    this.server.to(`user:${payload.userId}`).emit('quest_completed', {
      questType: payload.questType,
    });
  }
}
