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

  /* Self-scoped quest read.
   *
   * IDOR fix (audit IDOR-MISSIONS-01): previously the route was
   * `GET /daily/quests/:playerId` with no guard, so any caller could
   * read another user's live quest progress (battles_won /
   * buildings_built counters) and claimed-set just by guessing a UUID.
   * The handler now derives the player from the JWT subject — the path
   * param is gone, and the legacy `:playerId` route below is kept only
   * as a deprecation alias that 403s on a mismatched UUID. */
  @Get('quests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the day\'s quests for the authenticated player (stub seed)' })
  async quests(@Request() req: any) {
    const playerId: string = req.user?.id;
    if (!playerId) {
      throw new HttpException('Oturum bulunamadı.', HttpStatus.UNAUTHORIZED);
    }
    return this.buildQuestsPayload(playerId);
  }

  /* Deprecated alias for stale FE callers still issuing
   * `GET /daily/quests/:playerId`. Hard-403s when the path id doesn't
   * match the JWT subject so it can never be abused as an IDOR. Safe to
   * delete once all clients move to `GET /daily/quests`. */
  @Get('quests/:playerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEPRECATED] Use GET /daily/quests instead' })
  async questsLegacy(@Request() req: any, @Param('playerId') playerId: string) {
    const userId: string = req.user?.id;
    if (!userId) {
      throw new HttpException('Oturum bulunamadı.', HttpStatus.UNAUTHORIZED);
    }
    if (playerId !== userId) {
      throw new HttpException('Bu kaynağa erişim izniniz yok.', HttpStatus.FORBIDDEN);
    }
    return this.buildQuestsPayload(userId);
  }

  private async buildQuestsPayload(playerId: string) {
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

  /* Self-scoped daily streak. Same IDOR rationale as `quests` above —
   * the canonical route is now path-param-free and derives the player
   * from the JWT. */
  @Get('streak')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daily login streak for the authenticated player (stub seed)' })
  streak(@Request() req: any) {
    const playerId: string = req.user?.id;
    if (!playerId) {
      throw new HttpException('Oturum bulunamadı.', HttpStatus.UNAUTHORIZED);
    }
    return this.buildStreakPayload(playerId);
  }

  /* Deprecated alias kept for stale FE callers; 403s on UUID mismatch. */
  @Get('streak/:playerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEPRECATED] Use GET /daily/streak instead' })
  streakLegacy(@Request() req: any, @Param('playerId') playerId: string) {
    const userId: string = req.user?.id;
    if (!userId) {
      throw new HttpException('Oturum bulunamadı.', HttpStatus.UNAUTHORIZED);
    }
    if (playerId !== userId) {
      throw new HttpException('Bu kaynağa erişim izniniz yok.', HttpStatus.FORBIDDEN);
    }
    return this.buildStreakPayload(userId);
  }

  private buildStreakPayload(playerId: string) {
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
  async claim(@Request() req: any, @Param('questId') questId: string) {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) {
      throw new HttpException('Görev bulunamadı.', HttpStatus.NOT_FOUND);
    }
    const userId: string = req.user?.id ?? 'unknown';

    // Server-side progress check (audit B2 fix).
    //
    // Before this guard the claim handler only checked the in-memory
    // CLAIMED set — Day-1 players could claim all 7 daily quests with
    // 0/N progress because the FE was the only thing reading
    // q.target. A live playtest grabbed all rewards instantly on a
    // fresh account.
    //
    // For quests with a `liveCountQuestId` we consult QuestProgressService
    // (game-server has been incrementing it via the
    // X-Internal-Service-guarded /quest-progress/increment endpoint).
    // For quests without a live counter (q3 merge, q4 donate) we trust
    // the static seed value baked into the QUESTS catalog above — those
    // event hooks aren't wired yet, so the safest read is the seed.
    //
    // The seed for q3 / q4 ships at progress=0 / target=1 (or higher),
    // so unwired quests fail-closed: claim returns 400 "Görev henüz
    // tamamlanmadı" until their event hook lands.
    let progress = quest.progress;
    if (quest.liveCountQuestId && this.questProgress) {
      try {
        const counters = await this.questProgress.getAllProgress(userId);
        if (Object.prototype.hasOwnProperty.call(counters, quest.liveCountQuestId)) {
          progress = counters[quest.liveCountQuestId];
        }
      } catch {
        /* fall back to seed */
      }
    }
    if (progress < quest.target) {
      throw new HttpException(
        `Görev henüz tamamlanmadı (${progress}/${quest.target}).`,
        HttpStatus.BAD_REQUEST,
      );
    }

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
