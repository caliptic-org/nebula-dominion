import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceTickWorker } from './resource-tick.worker';
import { Resource } from '../resources/entities/resource.entity';
import { ResourcesModule } from '../resources/resources.module';
import { BuildingsModule } from '../buildings/buildings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resource]), ResourcesModule, BuildingsModule],
  providers: [ResourceTickWorker],
})
export class WorkersModule {}
