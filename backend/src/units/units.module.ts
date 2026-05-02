import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { MutationRule } from './entities/mutation-rule.entity';
import { UnitsService } from './units.service';
import { MergeService } from './merge.service';
import { MutationService } from './mutation.service';
import { UnitsController } from './units.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, MutationRule])],
  controllers: [UnitsController],
  providers: [UnitsService, MergeService, MutationService],
  exports: [UnitsService, MergeService, MutationService],
})
export class UnitsModule {}
