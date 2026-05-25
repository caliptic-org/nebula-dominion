import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Building } from '../buildings/entities/building.entity';
import { PlayerUnit } from '../units/entities/player-unit.entity';
import { BasesProductionQueueController } from './bases.controller';
import { BasesService } from './bases.service';
import { BaseProductionQueueEntry } from './entities/base-production-queue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BaseProductionQueueEntry, Building, PlayerUnit]),
    AuthModule,
  ],
  controllers: [BasesProductionQueueController],
  providers: [BasesService],
  exports: [BasesService],
})
export class BasesModule {}
