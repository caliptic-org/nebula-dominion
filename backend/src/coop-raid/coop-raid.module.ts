import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoopRaidRun } from './entities/coop-raid-run.entity';
import { CoopRaidParticipant } from './entities/coop-raid-participant.entity';
import { CoopRaidController } from './coop-raid.controller';
import { CoopRaidService } from './coop-raid.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GuildModule } from '../guild/guild.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CoopRaidRun, CoopRaidParticipant]),
    AnalyticsModule,
    GuildModule,
  ],
  controllers: [CoopRaidController],
  providers: [CoopRaidService],
  exports: [CoopRaidService],
})
export class CoopRaidModule {}
