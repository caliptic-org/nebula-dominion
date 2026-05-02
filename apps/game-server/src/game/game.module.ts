import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';
import { SessionService } from './session.service';

@Module({
  imports: [AuthModule, MatchmakingModule, AntiCheatModule],
  providers: [GameGateway, GameService, RoomService, SessionService],
  exports: [GameService, RoomService, SessionService],
})
export class GameModule {}
