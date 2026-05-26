import { Module } from '@nestjs/common';
import { LeaderboardStubController } from './leaderboard-stub.controller';
import { MissionsStubController } from './missions-stub.controller';
import { CommandersStubController } from './commanders-stub.controller';
import { TargetStubController } from './target-stub.controller';
import { BattlesStubController, BattlePrepStubController } from './battles-stub.controller';
import { ChatStubController } from './chat-stub.controller';
import { BuffsStubController } from './buffs-stub.controller';
import { ResearchStubController } from './research-stub.controller';
import { QuestProgressModule } from '../modules/quest-progress/quest-progress.module';

/* MetaModule
 *
 * Lightweight stub controllers that fill the screens whose dedicated backend
 * modules either aren't wired into this api yet (leaderboard / missions) or
 * intentionally remain client-side display surfaces (commanders / target).
 *
 * Each controller returns deterministic, race-aware seed data so the UI can
 * render real network round-trips and so the eventual production module can
 * drop in without breaking the wire contract.
 *
 * When the canonical modules land (LeaderboardModule from backend/src,
 * DailyEngagement, etc.), remove the matching stub here. */
@Module({
  imports: [QuestProgressModule],
  controllers: [
    LeaderboardStubController,
    MissionsStubController,
    CommandersStubController,
    TargetStubController,
    BattlesStubController,
    BattlePrepStubController,
    ChatStubController,
    BuffsStubController,
    ResearchStubController,
  ],
})
export class MetaModule {}
