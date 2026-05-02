import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingService } from './building.service';
import { BuildingController } from './building.controller';
import { Building } from './entities/building.entity';
import { Game } from '../game/entities/game.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Game])],
  providers: [BuildingService],
  controllers: [BuildingController],
  exports: [BuildingService],
})
export class BuildingModule {}
