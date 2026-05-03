import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginStreak } from './entities/login-streak.entity';
import { DailyQuestProfile } from './entities/daily-quest-profile.entity';
import { PlayerStamina } from './entities/player-stamina.entity';
import { StreakService } from './streak.service';
import { DailyQuestService } from './daily-quest.service';
import { StaminaService } from './stamina.service';
import { DailyEngagementController } from './daily-engagement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoginStreak, DailyQuestProfile, PlayerStamina])],
  controllers: [DailyEngagementController],
  providers: [StreakService, DailyQuestService, StaminaService],
  exports: [StreakService, DailyQuestService, StaminaService],
})
export class DailyEngagementModule {}
