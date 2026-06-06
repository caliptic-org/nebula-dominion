import { Module } from '@nestjs/common';
import { ResourceTickWorker } from './resource-tick.worker';
import { ResourcesModule } from '../resources/resources.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { UnitsModule } from '../units/units.module';
import { GalaxyMapModule } from '../map/galaxy-map.module';

@Module({
  imports: [ResourcesModule, BuildingsModule, UnitsModule, GalaxyMapModule],
  providers: [ResourceTickWorker],
})
export class WorkersModule {}
