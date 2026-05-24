import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitService } from './unit.service';
import { MergePreviewService } from './merge-preview.service';
import { UnitController } from './unit.controller';
import { Unit } from './entities/unit.entity';
import { Game } from '../game/entities/game.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Game]), UserModule],
  // MergePreviewService is injected into UnitController; it reads Unit
  // repository via TypeOrmModule.forFeature above so no extra imports
  // are needed. Was missing from `providers` after the autonomous-QA-run
  // merge restored the service file but didn't wire it into the module,
  // crashing api boot with "Nest can't resolve dependencies of UnitController".
  providers: [UnitService, MergePreviewService],
  controllers: [UnitController],
  exports: [UnitService],
})
export class UnitModule {}
