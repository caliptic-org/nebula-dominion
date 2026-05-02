import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { ResourcesService } from './resources.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resource]), DatabaseModule],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
