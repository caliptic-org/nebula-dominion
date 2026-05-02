import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerUnit } from './entities/player-unit.entity';
import { TrainingQueue } from './entities/training-queue.entity';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { ResourcesModule } from '../resources/resources.module';
import { AuthModule } from '../auth/auth.module';
import { Building } from '../buildings/entities/building.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerUnit, TrainingQueue, Building]),
    ResourcesModule,
    AuthModule,
  ],
  providers: [UnitsService],
  controllers: [UnitsController],
  exports: [UnitsService],
})
export class UnitsModule {}
