import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XpLevelThreshold } from './entities/xp-level-threshold.entity';
import { PlayerProgression } from './entities/player-progression.entity';
import { XpSourceEvent } from './entities/xp-source-event.entity';
import { XpSourceWeight } from './entities/xp-source-weight.entity';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';

@Module({
  imports: [TypeOrmModule.forFeature([XpLevelThreshold, PlayerProgression, XpSourceEvent, XpSourceWeight])],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
