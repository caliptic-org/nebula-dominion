import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionClaim } from './entities/mission-claim.entity';
import { DailyEngagementService } from './daily-engagement.service';
import { DailyEngagementController } from './daily-engagement.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MissionClaim])],
  providers: [DailyEngagementService],
  controllers: [DailyEngagementController],
  exports: [DailyEngagementService],
})
export class DailyEngagementModule {}
