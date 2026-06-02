import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { ProgressionModule } from '../progression/progression.module';
import { CommandersModule } from '../commanders/commanders.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';
import { SessionService } from './session.service';
import { MergeService } from './merge/merge.service';
import { MergeController } from './merge/merge.controller';

@Module({
  imports: [AuthModule, MatchmakingModule, AntiCheatModule, ProgressionModule, CommandersModule],
  // `MergeController` was previously listed under `providers` which makes
  // NestJS register it as an injectable class but DOES NOT mount its HTTP
  // routes — every @Get/@Post/@Put on it 404'd silently.  Controllers go
  // in `controllers`; the GET /units/merge/preview the FE calls only
  // becomes reachable once it's moved here.
  controllers: [MergeController],
  providers: [GameGateway, GameService, RoomService, SessionService, MergeService],
  exports: [GameService, RoomService, SessionService],
})
export class GameModule {}
