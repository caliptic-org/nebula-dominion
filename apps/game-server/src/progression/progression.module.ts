import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { XpThresholdConfig } from './entities/xp-threshold-config.entity';
import { ProgressionService } from './progression.service';
import { ProgressionConfigService } from './progression-config.service';
import { ProgressionController } from './progression.controller';
import { ProgressionGateway } from './progression.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerLevel, XpTransaction, XpThresholdConfig]),
    AuthModule,
  ],
  providers: [ProgressionService, ProgressionConfigService, ProgressionGateway],
  controllers: [ProgressionController],
  exports: [ProgressionService],
})
export class ProgressionModule {}
