import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerCommander } from './entities/player-commander.entity';
import { CommandersService } from './commanders.service';
import { CommandersController } from './commanders.controller';
import { CommanderUnlockListener } from './commander-unlock.listener';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerCommander]), AuthModule],
  // CommanderUnlockListener is registered as a provider so its @OnEvent
  // decorator is wired by the global EventEmitterModule. It listens to
  // `era.transition` and unlocks tier-4 / tier-5 commanders the moment
  // the player crosses the age threshold (gates.config.ts has the
  // matching age min rule for 'commander.tier4' / 'commander.tier5').
  providers: [CommandersService, CommanderUnlockListener],
  controllers: [CommandersController],
  // Exported so combat / economy / production / research services can
  // call service.getActiveBonus(userId) without depending on the HTTP
  // controller surface. CommandersService is the SoT for bonus math.
  exports: [CommandersService],
})
export class CommandersModule {}
