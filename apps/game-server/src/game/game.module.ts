import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AntiCheatModule } from '../anti-cheat/anti-cheat.module';
import { ProgressionModule } from '../progression/progression.module';
import { CommandersModule } from '../commanders/commanders.module';
import { UnitsModule } from '../units/units.module';
// RewardsService is a pure, dependency-free calculator. We provide it
// DIRECTLY rather than importing BattleModule, because BattleModule also
// registers PrismaService — which crash-loops the game-server on boot
// (`@prisma/client did not initialize yet`; Prisma is a legacy dep that is
// never `prisma generate`'d in the game-server image and was a dead module
// until now). The cycle-22 deploy 27105785665 failed exactly this way.
import { RewardsService } from '../battle/rewards.service';
import { ResourcesModule } from '../resources/resources.module';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';
import { SessionService } from './session.service';
import { MergeService } from './merge/merge.service';
import { MergeController } from './merge/merge.controller';

@Module({
  imports: [AuthModule, MatchmakingModule, AntiCheatModule, ProgressionModule, CommandersModule, UnitsModule, ResourcesModule],
  // `MergeController` was previously listed under `providers` which makes
  // NestJS register it as an injectable class but DOES NOT mount its HTTP
  // routes — every @Get/@Post/@Put on it 404'd silently.  Controllers go
  // in `controllers`; the GET /units/merge/preview the FE calls only
  // becomes reachable once it's moved here.
  controllers: [MergeController],
  providers: [GameGateway, GameService, RoomService, SessionService, MergeService, RewardsService],
  exports: [GameService, RoomService, SessionService],
})
export class GameModule {}
