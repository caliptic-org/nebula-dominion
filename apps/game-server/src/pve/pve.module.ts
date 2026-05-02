import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameModule } from '../game/game.module';
import { BotService } from './bot.service';
import { PveService } from './pve.service';
import { PveGateway } from './pve.gateway';

@Module({
  imports: [AuthModule, GameModule],
  providers: [BotService, PveService, PveGateway],
  exports: [PveService],
})
export class PveModule {}
