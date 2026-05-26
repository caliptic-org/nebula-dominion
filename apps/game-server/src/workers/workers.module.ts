import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceTickWorker } from './resource-tick.worker';
import { Resource } from '../resources/entities/resource.entity';
import { ResourcesModule } from '../resources/resources.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { UnitsModule } from '../units/units.module';
import { GalaxyMapModule } from '../map/galaxy-map.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resource]), ResourcesModule, BuildingsModule, UnitsModule, GalaxyMapModule],
  providers: [ResourceTickWorker],
})
export class WorkersModule {}
