import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerShield } from './entities/player-shield.entity';
import { PvpShieldController } from './pvp-shield.controller';
import { PvpShieldService } from './pvp-shield.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerShield])],
  controllers: [PvpShieldController],
  providers: [PvpShieldService],
  exports: [PvpShieldService],
})
export class PvpShieldModule {}
