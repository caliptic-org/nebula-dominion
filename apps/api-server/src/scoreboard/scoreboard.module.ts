import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoreboardService } from './scoreboard.service';
import { ScoreboardController } from './scoreboard.controller';
import { PlayerScore } from './entities/player-score.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerScore])],
  providers: [ScoreboardService],
  controllers: [ScoreboardController],
  exports: [ScoreboardService, TypeOrmModule],
})
export class ScoreboardModule {}
