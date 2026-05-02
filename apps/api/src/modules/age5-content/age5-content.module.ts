import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Age5ContentController } from './age5-content.controller';
import { Age5ContentService } from './age5-content.service';
import { Age } from './entities/age.entity';
import { Level } from './entities/level.entity';
import { Unit } from './entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Age, Level, Unit])],
  controllers: [Age5ContentController],
  providers: [Age5ContentService],
  exports: [Age5ContentService],
})
export class Age5ContentModule {}
