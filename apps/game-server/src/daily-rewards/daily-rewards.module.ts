import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LoginStreak } from './entities/login-streak.entity';
import { PlayerDailyQuest } from './entities/player-daily-quest.entity';
import { LootBoxAward } from './entities/loot-box-award.entity';
import { DailyRewardsService } from './daily-rewards.service';
import { DailyRewardsGateway } from './daily-rewards.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([LoginStreak, PlayerDailyQuest, LootBoxAward]), AuthModule],
  providers: [DailyRewardsService, DailyRewardsGateway],
  exports: [DailyRewardsService],
})
export class DailyRewardsModule {}
