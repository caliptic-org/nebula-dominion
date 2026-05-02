import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BattleLogService } from './battle-log.service';
import { RewardsService } from './rewards.service';

@Module({
  providers: [PrismaService, BattleLogService, RewardsService],
  exports: [BattleLogService, RewardsService],
})
export class BattleModule {}
