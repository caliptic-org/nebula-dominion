import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation } from './entities/formation.entity';
import { FormationTemplate } from './entities/formation-template.entity';
import { FormationsService } from './formations.service';
import { FormationsController } from './formations.controller';
import { UnitsModule } from '../units/units.module';
import { Unit } from '../units/entities/unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formation, FormationTemplate, Unit]),
    UnitsModule,
  ],
  controllers: [FormationsController],
  providers: [FormationsService],
  exports: [FormationsService],
})
export class FormationsModule {}
