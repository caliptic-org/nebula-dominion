import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalaxyNodeGarrison } from './galaxy-map.entity';
import { GalaxyMapService } from './galaxy-map.service';
import { GalaxyMapController } from './galaxy-map.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([GalaxyNodeGarrison]), AuthModule],
  providers: [GalaxyMapService],
  controllers: [GalaxyMapController],
  exports: [GalaxyMapService],
})
export class GalaxyMapModule {}
