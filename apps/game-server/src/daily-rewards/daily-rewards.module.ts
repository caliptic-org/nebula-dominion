import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LoginStreak } from './entities/login-streak.entity';
import { PlayerDailyQuest } from './entities/player-daily-quest.entity';
import { LootBoxAward } from './entities/loot-box-award.entity';
import { DailyRewardsService } from './daily-rewards.service';
import { DailyRewardsGateway } from './daily-rewards.gateway';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  // Cycle-19 MON-8-NEW: ResourcesModule so the streak claim can actually
  // credit mineral/gas/energy to the wallet (previously the reward was
  // display-only — emitted but never written).
  imports: [TypeOrmModule.forFeature([LoginStreak, PlayerDailyQuest, LootBoxAward]), AuthModule, ResourcesModule],
  providers: [DailyRewardsService, DailyRewardsGateway],
  exports: [DailyRewardsService],
})
export class DailyRewardsModule {}
