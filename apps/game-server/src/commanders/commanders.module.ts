import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerCommander } from './entities/player-commander.entity';
import { CommandersService } from './commanders.service';
import { CommandersController } from './commanders.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerCommander]), AuthModule],
  providers: [CommandersService],
  controllers: [CommandersController],
  // Exported so combat / economy / production / research services can
  // call service.getActiveBonus(userId) without depending on the HTTP
  // controller surface. CommandersService is the SoT for bonus math.
  exports: [CommandersService],
})
export class CommandersModule {}
