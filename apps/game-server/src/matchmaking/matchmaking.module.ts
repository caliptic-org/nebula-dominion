import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProgressionModule } from '../progression/progression.module';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingService } from './matchmaking.service';
import { EloService } from './elo.service';

@Module({
  // ELO-NOT-PERSISTED (cycle 23): ProgressionModule (exports ProgressionService)
  // so the gateway seeds the queue with the player's persisted rating instead
  // of the JWT default. Acyclic — ProgressionModule imports Auth + Resources +
  // TypeOrm only, never Matchmaking; it already boots in AppModule so pulling
  // it in here is a singleton re-use, not a fresh (risky) instantiation.
  imports: [AuthModule, ProgressionModule],
  providers: [MatchmakingGateway, MatchmakingService, EloService],
  exports: [MatchmakingService, EloService],
})
export class MatchmakingModule {}
