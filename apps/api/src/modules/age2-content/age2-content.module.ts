import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Age } from '../age5-content/entities/age.entity';
import { Level } from '../age5-content/entities/level.entity';
import { Unit } from '../age5-content/entities/unit.entity';
import { Age2ContentService } from './age2-content.service';
import { Age2ContentController } from './age2-content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Age, Level, Unit])],
  providers: [Age2ContentService],
  controllers: [Age2ContentController],
  exports: [Age2ContentService],
})
export class Age2ContentModule {}
