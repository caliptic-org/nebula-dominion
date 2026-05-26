import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestProgressService } from '../modules/quest-progress/quest-progress.service';

/* Daily quest stub.
 *
 * Mirrors the shape of backend/src/daily-engagement/daily-engagement.controller
 * so the UI sees the same field names. Five rotating quests + a daily login
 * streak. Static seed; refreshes from the wall clock for the streak day. */

type QuestKind = 'pve' | 'pvp' | 'build' | 'merge' | 'donate' | 'login';

interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { gold?: number; gems?: number; xp?: number };
  claimed: boolean;
  /**
   * Optional: when set, the GET handler overrides the static `progress`
   * value with the live counter from QuestProgressService. The id is the
   * symbolic name used by game-server when firing increments (see
   * apps/game-server/src/quest-progress/quest-progress-notifier.service.ts).
   * Quests without a `liveCountQuestId` keep their static seed value.
   */
  liveCountQuestId?: string;
}

// Module-level singleton: which quest ids each user has already claimed today.
// The stub doesn't reset per-day; production DailyEngagement will.
const CLAIMED = new Map<string, Set<string>>();

const QUESTS: Quest[] = [
  // q1 / q2 / q5 carry a `liveCountQuestId` so they pick up real
  // increments fired by game-server when battles end / buildings
  // complete. q3 (merge) and q4 (donate) still seed static — those
  // event hooks are not wired yet.
  { id: 'q1', kind: 'pve',    title: 'PvE Avı',         description: '3 PvE savaş kazan',                  progress: 1, target: 3, reward: { gold: 200, xp: 60 },  claimed: false, liveCountQuestId: 'battles_won' },
  { id: 'q2', kind: 'build',  title: 'İnşaatçı',         description: '2 yeni yapı inşa et',                progress: 0, target: 2, reward: { gold: 300 },           claimed: false, liveCountQuestId: 'buildings_built' },
  { id: 'q3', kind: 'merge',  title: 'Promosyon',        description: '1 birim terfi ettir',                progress: 0, target: 1, reward: { gems: 15, xp: 80 },  claimed: false },
  { id: 'q4', kind: 'donate', title: 'Loncaya Bağış',    description: '500 kaynak bağışla',                 progress: 320, target: 500, reward: { gold: 150 },     claimed: false },
  { id: 'q5', kind: 'pvp',    title: 'Arena Galibi',     description: '1 PvP zafer',                        progress: 0, target: 1, reward: { gems: 25, xp: 120 }, claimed: false, liveCountQuestId: 'battles_won' },
];

@ApiTags('missions (stub)')
@Controller('daily')
export class MissionsStubController {
  constructor(
    // `@Optional()` so the stub stays mountable in any test harness that
    // doesn't wire QuestProgressModule. When missing we fall back to the
    // static seed values — exactly the legacy behaviour.
    @Optional() private readonly questProgress?: QuestProgressService,
  ) {}

  @Get('quests/:playerId')
  @ApiOperation({ summary: 'Get the day\'s quests for a player (stub seed)' })
  async quests(@Param('playerId') playerId: string) {
    // Reflect the per-player CLAIMED set into each quest's `claimed` flag.
    // Earlier the seed always returned `claimed: false` for everyone, so
    // the UI showed "ÖDÜL AL" even on quests the server had already
    // marked claimed — and re-clicking surfaced an "already claimed"
    // toast that felt like a regression.  Hydrating from CLAIMED here
    // makes the GET response the single source of truth for claim state.
    const set = CLAIMED.get(playerId) ?? new Set<string>();

    // Pull live counters from QuestProgressModule when available. Single
    // round-trip — `getAllProgress` returns every quest counter the user
    // has, so we can map quests to live values in-memory.
    const liveCounters = this.questProgress
      ? await this.questProgress.getAllProgress(playerId).catch(() => ({} as Record<string, number>))
      : {};

    const quests = QUESTS.map((q) => {
      const live =
        q.liveCountQuestId !== undefined && Object.prototype.hasOwnProperty.call(liveCounters, q.liveCountQuestId)
          ? liveCounters[q.liveCountQuestId]
          : null;
      // Cap progress at target so the UI bar never overflows the quest.
      // The actual counter on the api side can keep climbing past target
      // across multiple daily cycles — that's a problem for the future
      // DailyEngagementModule's day-rollover logic, not the stub.
      const progress = live !== null ? Math.min(q.target, live) : q.progress;
      return { ...q, progress, claimed: set.has(q.id) };
    });

    return {
      playerId,
      day: new Date().toISOString().slice(0, 10),
      quests,
      bonusUnlockedAt: 4, // claim daily bonus chest at 4/5 done
      totalDone: quests.filter((q) => q.progress >= q.target).length,
      claimedCount: set.size,
    };
  }

  @Get('streak/:playerId')
  @ApiOperation({ summary: 'Daily login streak (stub seed)' })
  streak(@Param('playerId') playerId: string) {
    const today = new Date();
    return {
      playerId,
      currentStreak: 4,
      longestStreak: 9,
      lastClaimedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      nextRewardAt: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      rewards: [
        { day: 1, reward: { gold: 100 },  claimed: true  },
        { day: 2, reward: { gold: 200 },  claimed: true  },
        { day: 3, reward: { gold: 300 },  claimed: true  },
        { day: 4, reward: { gems: 25 },   claimed: true  },
        { day: 5, reward: { gems: 50 },   claimed: false },
        { day: 6, reward: { gold: 1000 }, claimed: false },
        { day: 7, reward: { gems: 150, titleUnlock: 'Sürekli Komutan' }, claimed: false },
      ],
    };
  }

  @Post('quests/:questId/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a quest reward (idempotent — second call returns alreadyClaimed)' })
  claim(@Request() req: any, @Param('questId') questId: string) {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) {
      throw new HttpException('Görev bulunamadı.', HttpStatus.NOT_FOUND);
    }
    const userId: string = req.user?.id ?? 'unknown';
    let set = CLAIMED.get(userId);
    if (!set) {
      set = new Set<string>();
      CLAIMED.set(userId, set);
    }
    if (set.has(questId)) {
      // Not an error — UI handles the "already claimed" case gracefully.
      return { claimed: false, alreadyClaimed: true };
    }
    set.add(questId);
    return { claimed: true, rewards: quest.reward, alreadyClaimed: false };
  }
}
