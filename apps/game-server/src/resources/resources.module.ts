import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourcesService } from './resources.service';
import { ResourcesGateway } from './resources.gateway';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resource]), DatabaseModule, AuthModule],
  providers: [ResourcesService, ResourcesGateway],
  exports: [ResourcesService],
})
export class ResourcesModule {}
