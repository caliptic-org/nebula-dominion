import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginStreak } from './entities/login-streak.entity';
import { DailyQuestProfile } from './entities/daily-quest-profile.entity';
import { PlayerStamina } from './entities/player-stamina.entity';
import { PlayerWallet } from './entities/player-wallet.entity';
import { StreakService } from './streak.service';
import { DailyQuestService } from './daily-quest.service';
import { StaminaService } from './stamina.service';
import { PlayerWalletService } from './player-wallet.service';
import { DailyEngagementController } from './daily-engagement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoginStreak, DailyQuestProfile, PlayerStamina, PlayerWallet])],
  controllers: [DailyEngagementController],
  providers: [StreakService, DailyQuestService, StaminaService, PlayerWalletService],
  exports: [StreakService, DailyQuestService, StaminaService, PlayerWalletService],
})
export class DailyEngagementModule {}
