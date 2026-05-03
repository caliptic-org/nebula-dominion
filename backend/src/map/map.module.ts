import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../redis/redis.module';
import { MapActionLog } from './entities/map-action-log.entity';
import { PlayerResources } from './entities/player-resources.entity';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerResources, MapActionLog]),
    RedisModule,
  ],
  controllers: [MapController],
  providers: [MapService],
  exports: [MapService],
})
export class MapModule {}
