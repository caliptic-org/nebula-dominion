import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { PrestigeRecalcListener } from './prestige-recalc.listener';
import { ResourcesModule } from '../resources/resources.module';
import { AuthModule } from '../auth/auth.module';
import { EconomyModule } from '../economy/economy.module';
import { ProgressionModule } from '../progression/progression.module';
import { CommandersModule } from '../commanders/commanders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Building]),
    ResourcesModule,
    AuthModule,
    EconomyModule,
    ProgressionModule,
    CommandersModule,
  ],
  providers: [BuildingsService, PrestigeRecalcListener],
  controllers: [BuildingsController],
  exports: [BuildingsService],
})
export class BuildingsModule {}
