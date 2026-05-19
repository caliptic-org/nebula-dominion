import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitService } from './unit.service';
import { UnitController } from './unit.controller';
import { Unit } from './entities/unit.entity';
import { Game } from '../game/entities/game.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Game]), UserModule],
  providers: [UnitService],
  controllers: [UnitController],
  exports: [UnitService],
})
export class UnitModule {}
