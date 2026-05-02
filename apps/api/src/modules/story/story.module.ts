import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryProgress } from './entities/story-progress.entity';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoryProgress])],
  providers: [StoryService],
  controllers: [StoryController],
  exports: [StoryService],
})
export class StoryModule {}
