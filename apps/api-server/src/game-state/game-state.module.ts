import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStateService } from './game-state.service';
import { GameStateController } from './game-state.controller';
import { GameState } from './entities/game-state.entity';
import { PlayerScore } from '../scoreboard/entities/player-score.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GameState, PlayerScore])],
  providers: [GameStateService],
  controllers: [GameStateController],
  exports: [GameStateService, TypeOrmModule],
})
export class GameStateModule {}
