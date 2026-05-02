import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';
import { SessionService } from './session.service';
import { MergeService } from './merge/merge.service';
import { MergeController } from './merge/merge.controller';

@Module({
  imports: [AuthModule, MatchmakingModule, AntiCheatModule],
  controllers: [MergeController],
  providers: [GameGateway, GameService, RoomService, SessionService, MergeService],
  exports: [GameService, RoomService, SessionService, MergeService],
})
export class GameModule {}
