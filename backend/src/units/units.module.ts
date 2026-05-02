import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitType } from './entities/unit-type.entity';
import { Unit } from './entities/unit.entity';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { ProductionQueueService } from './production-queue.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnitType, Unit])],
  providers: [UnitsService, ProductionQueueService],
  controllers: [UnitsController],
  exports: [UnitsService],
})
export class UnitsModule {}
