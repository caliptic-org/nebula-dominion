import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourcesService } from './resources.service';
import { ResourcesGateway } from './resources.gateway';
import { DatabaseModule } from '../database/database.module';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resource]), DatabaseModule, EconomyModule],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
