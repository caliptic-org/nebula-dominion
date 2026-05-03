import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerLevel } from './entities/player-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { EraPackage } from './entities/era-package.entity';
import { ProgressionService } from './progression.service';
import { ProgressionController } from './progression.controller';
import { ProgressionGateway } from './progression.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerLevel, XpTransaction, EraPackage])],
  providers: [ProgressionService, ProgressionGateway],
  controllers: [ProgressionController],
  exports: [ProgressionService],
})
export class ProgressionModule {}
