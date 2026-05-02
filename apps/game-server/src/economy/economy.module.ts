import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EconomyBuildingConfig } from './entities/economy-building-config.entity';
import { EconomyStorageConfig } from './entities/economy-storage-config.entity';
import { EconomyFeatureFlag } from './entities/economy-feature-flag.entity';
import { EconomyService } from './economy.service';
import { EconomyController } from './economy.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EconomyBuildingConfig, EconomyStorageConfig, EconomyFeatureFlag]),
    DatabaseModule,
    AuthModule,
  ],
  providers: [EconomyService],
  controllers: [EconomyController],
  exports: [EconomyService],
})
export class EconomyModule {}
