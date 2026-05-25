import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { XpThresholdConfig } from './entities/xp-threshold-config.entity';
import { EraPackage } from './entities/era-package.entity';
import { ProgressionService } from './progression.service';
import { ProgressionConfigService } from './config/progression-config.service';
import { ProgressionController } from './progression.controller';
import { TutorialController } from './tutorial.controller';
import { ProgressionGateway } from './progression.gateway';
import { AuthModule } from '../auth/auth.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerLevel, XpTransaction, XpThresholdConfig, EraPackage]),
    AuthModule,
    // TutorialController needs ResourcesService to grant the one-shot
    // starter pack — pulling in the whole module is the path of least
    // resistance vs duplicating the provider definition.
    ResourcesModule,
  ],
  providers: [ProgressionService, ProgressionConfigService, ProgressionGateway],
  controllers: [ProgressionController, TutorialController],
  exports: [ProgressionService, ProgressionConfigService],
})
export class ProgressionModule {}
