import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerEraProgress } from './entities/player-era-progress.entity';
import { EraCatchupPackage } from './entities/era-catchup-package.entity';
import { EraMiniQuest } from './entities/era-mini-quest.entity';
import { EraMechanicUnlock } from './entities/era-mechanic-unlock.entity';
import { EraProgressionService } from './era-progression.service';
import { EraProgressionController } from './era-progression.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerEraProgress,
      EraCatchupPackage,
      EraMiniQuest,
      EraMechanicUnlock,
    ]),
    RedisModule,
  ],
  providers: [EraProgressionService],
  controllers: [EraProgressionController],
  exports: [EraProgressionService],
})
export class EraProgressionModule {}
