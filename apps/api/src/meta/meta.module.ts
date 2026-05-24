import { Module } from '@nestjs/common';
import { LeaderboardStubController } from './leaderboard-stub.controller';
import { MissionsStubController } from './missions-stub.controller';
import { CommandersStubController } from './commanders-stub.controller';
import { TargetStubController } from './target-stub.controller';
import { BattlesStubController, BattlePrepStubController } from './battles-stub.controller';

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
  controllers: [
    LeaderboardStubController,
    MissionsStubController,
    CommandersStubController,
    TargetStubController,
    BattlesStubController,
    BattlePrepStubController,
  ],
})
export class MetaModule {}
