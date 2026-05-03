import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PvpShield } from './entities/pvp-shield.entity';
import { PvpBotProfile } from './entities/pvp-bot-profile.entity';
import { PvpMatchRecord } from './entities/pvp-match-record.entity';
import { ComebackBonus } from './entities/comeback-bonus.entity';
import { PvpShieldService } from './pvp-shield.service';
import { MatchmakingService } from './matchmaking.service';
import { ComebackBonusService } from './comeback-bonus.service';
import { PvpProtectionController } from './pvp-protection.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PvpShield, PvpBotProfile, PvpMatchRecord, ComebackBonus])],
  controllers: [PvpProtectionController],
  providers: [PvpShieldService, MatchmakingService, ComebackBonusService],
  exports: [PvpShieldService, MatchmakingService, ComebackBonusService],
})
export class PvpProtectionModule {}
