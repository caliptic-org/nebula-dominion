import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestProgress } from './entities/quest-progress.entity';
import { QuestProgressService } from './quest-progress.service';
import { QuestProgressController } from './quest-progress.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuestProgress])],
  controllers: [QuestProgressController],
  providers: [QuestProgressService],
  exports: [QuestProgressService],
})
export class QuestProgressModule {}
