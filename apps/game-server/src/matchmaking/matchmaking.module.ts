import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchmakingGateway } from './matchmaking.gateway';
import { MatchmakingService } from './matchmaking.service';
import { EloService } from './elo.service';

@Module({
  imports: [AuthModule],
  providers: [MatchmakingGateway, MatchmakingService, EloService],
  exports: [MatchmakingService, EloService],
})
export class MatchmakingModule {}
