import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Building } from '../buildings/entities/building.entity';
import { PlayerUnit } from '../units/entities/player-unit.entity';
import { BasesProductionQueueController } from './bases.controller';
import { BasesService } from './bases.service';
import { BaseProductionQueueEntry } from './entities/base-production-queue.entity';
import { ResourcesModule } from '../resources/resources.module';
import { CommandersModule } from '../commanders/commanders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BaseProductionQueueEntry, Building, PlayerUnit]),
    AuthModule,
    // ResourcesModule + CommandersModule pulled in so queueUnit() can charge
    // the player's wallet (canAfford / deduct) and apply the active
    // commander's trainCostMultiplier — closing the ECON-CYC6-01 free-mint
    // exploit where /bases/:id/production-queue minted PlayerUnit rows at
    // any level for zero resources.
    ResourcesModule,
    CommandersModule,
  ],
  controllers: [BasesProductionQueueController],
  providers: [BasesService],
  exports: [BasesService],
})
export class BasesModule {}
