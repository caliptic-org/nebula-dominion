import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoryProgress } from './entities/story-progress.entity';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';

// Audit cycle 6 — STORY-COMPLETE-NO-ORDER-GATE.
// StoryService now needs DataSource directly to (a) open a serializable
// transaction around the `completeChapter()` writes (pessimistic_write
// lock on the story_progress row defeats the TOCTOU array race that
// previously let two parallel POSTs both think the chapter wasn't yet
// completed), and (b) probe `player_levels.current_level` for the
// chapter level gate without coupling to TierService (which is in a
// sibling module and would create an import cycle).
// DataSource is implicitly provided by TypeOrmModule.forRoot() in
// DatabaseModule, so no explicit injection wiring is needed here.
@Module({
  imports: [TypeOrmModule.forFeature([StoryProgress])],
  providers: [StoryService],
  controllers: [StoryController],
  exports: [StoryService],
})
export class StoryModule {}
