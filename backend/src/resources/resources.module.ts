import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceConfig } from './entities/resource-config.entity';
import { PlayerResource } from './entities/player-resource.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { PlayerSegment } from './entities/player-segment.entity';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceConfig, PlayerResource, FeatureFlag, PlayerSegment])],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
