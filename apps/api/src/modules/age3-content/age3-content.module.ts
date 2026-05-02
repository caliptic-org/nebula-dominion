import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Age3ContentController } from './age3-content.controller';
import { Age3ContentService } from './age3-content.service';
import { Age } from '../age5-content/entities/age.entity';
import { Level } from '../age5-content/entities/level.entity';
import { Unit } from '../age5-content/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Age, Level, Unit])],
  controllers: [Age3ContentController],
  providers: [Age3ContentService],
  exports: [Age3ContentService],
})
export class Age3ContentModule {}
