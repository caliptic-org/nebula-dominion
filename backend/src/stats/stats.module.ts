import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerBuff } from './entities/player-buff.entity';
import { PlayerResource } from './entities/player-resource.entity';
import { PlayerPower } from './entities/player-power.entity';
import { Unit } from '../units/entities/unit.entity';
import { Battle } from '../battle/entities/battle.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerBuff, PlayerResource, PlayerPower, Unit, Battle]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
