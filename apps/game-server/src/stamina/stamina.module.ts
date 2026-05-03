import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerStamina } from './entities/player-stamina.entity';
import { StaminaService } from './stamina.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerStamina])],
  providers: [StaminaService],
  exports: [StaminaService],
})
export class StaminaModule {}
