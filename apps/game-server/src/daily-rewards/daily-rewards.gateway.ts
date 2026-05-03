import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { DailyRewardsService } from './daily-rewards.service';

@WebSocketGateway({ namespace: '/daily-rewards', cors: { origin: '*' } })
export class DailyRewardsGateway implements OnGatewayInit {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(DailyRewardsGateway.name);

  constructor(private readonly dailyRewards: DailyRewardsService) {}

  afterInit(): void {
    this.logger.log('DailyRewards gateway initialized');
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_streak_status')
  async onGetStreakStatus(@ConnectedSocket() client: Socket) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const status = await this.dailyRewards.getStreakStatus(userId);
    client.emit('streak_status', status);
  }

  @UseGuards(WsJwtGuard)
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

  @UseGuards(WsJwtGuard)
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

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_loot_boxes')
  async onGetLootBoxes(@ConnectedSocket() client: Socket) {
    const userId: string = client.data?.user?.sub;
    if (!userId) return { error: 'Unauthorized' };
    const boxes = await this.dailyRewards.getUnopenedLootBoxes(userId);
    client.emit('loot_boxes', boxes);
  }

  @UseGuards(WsJwtGuard)
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

  @OnEvent('daily_rewards.loot_box_awarded')
  handleLootBoxAwarded(payload: { userId: string; lootBoxId: string; source: string }) {
    this.server.emit(`user_${payload.userId}:loot_box_awarded`, {
      lootBoxId: payload.lootBoxId,
      source: payload.source,
    });
  }

  @OnEvent('daily_rewards.quest_completed')
  handleQuestCompleted(payload: { userId: string; questType: string }) {
    this.server.emit(`user_${payload.userId}:quest_completed`, { questType: payload.questType });
  }
}
