import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalaxyNodeGarrison } from './galaxy-map.entity';
import { GalaxyMapService } from './galaxy-map.service';
import { GalaxyMapController } from './galaxy-map.controller';
import { AuthModule } from '../auth/auth.module';
import { CommandersModule } from '../commanders/commanders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GalaxyNodeGarrison]),
    AuthModule,
    CommandersModule,
  ],
  providers: [GalaxyMapService],
  controllers: [GalaxyMapController],
  exports: [GalaxyMapService],
})
export class GalaxyMapModule {}
