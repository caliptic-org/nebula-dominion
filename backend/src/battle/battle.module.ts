import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Battle } from './entities/battle.entity';
import { BattleLog } from './entities/battle-log.entity';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { BattleEngineService } from './battle-engine.service';
import { StorageModule } from '../storage/storage.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [TypeOrmModule.forFeature([Battle, BattleLog]), StorageModule, AnalyticsModule],
  controllers: [BattleController],
  providers: [BattleService, BattleEngineService],
  exports: [BattleService, BattleEngineService],
})
export class BattleModule {}
