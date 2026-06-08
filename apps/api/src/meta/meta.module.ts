import { Module } from '@nestjs/common';
import { LeaderboardStubController } from './leaderboard-stub.controller';
import { MissionsStubController } from './missions-stub.controller';
// CommandersStubController removed — replaced by game-server's real
// CommandersModule (DB-backed roster + level/XP + bonus engine).
// See apps/game-server/src/commanders/. FE useCommanders now hits
// /api/commanders on game-nebula.caliptic.com instead of api-nebula.
import { TargetStubController } from './target-stub.controller';
import { BattlesStubController, BattlePrepStubController } from './battles-stub.controller';
import { ChatStubController } from './chat-stub.controller';
import { BuffsStubController } from './buffs-stub.controller';
import { ResearchStubController } from './research-stub.controller';
import { QuestProgressModule } from '../modules/quest-progress/quest-progress.module';
// cycle 17 BAL-03: MissionsStubController delegates daily-quest claims to
// DailyEngagementService for DB-backed idempotency + wallet/XP credit.
import { DailyEngagementModule } from '../modules/daily-engagement/daily-engagement.module';
// FLOW-001 (battle pass): BattlesStubController grants battle-pass XP on a won
// quick-battle (in-process; PremiumModule already boots in AppModule, so this
// import is a singleton re-use, not a new instantiation).
import { PremiumModule } from '../modules/premium/premium.module';

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
 * DailyEngagement, etc.), remove the matching stub here.
 *
 * ## Battles controller production status (cycle-3-03 + DRIFT-1 fix)
 *
 * Previously this module dropped `BattlesStubController` /
 * `BattlePrepStubController` in production (NODE_ENV gate) because of the
 * S2 + F8 history (client-controlled outcome, cross-user data leak). Those
 * vulnerabilities are fixed: outcome is server-computed, rewards are
 * server-stored, every entry is JWT-guarded + per-user scoped, and
 * `claim-reward` signs its wallet fan-out with the internal service
 * secret.
 *
 * The cycle-3 NODE_ENV gate meanwhile caused a regression: production
 * 404'd /battles, BattleScreen swallowed the error, and every battle
 * credited 0 to the wallet. Until a real `BattleModule` lands, this
 * controller IS the production battles surface — we register it
 * unconditionally. The "Stub" suffix in the class name is preserved only
 * to avoid a noisy rename; the JSDoc on the controller documents the
 * production-active status. */

@Module({
  imports: [QuestProgressModule, DailyEngagementModule, PremiumModule],
  controllers: [
    LeaderboardStubController,
    MissionsStubController,
    TargetStubController,
    BattlesStubController,
    BattlePrepStubController,
    ChatStubController,
    BuffsStubController,
    ResearchStubController,
  ],
})
export class MetaModule {}
