import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Request,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuestProgressService } from '../modules/quest-progress/quest-progress.service';
import { DailyEngagementService } from '../modules/daily-engagement/daily-engagement.service';

/* Daily quest stub.
 *
 * Mirrors the shape of backend/src/daily-engagement/daily-engagement.controller
 * so the UI sees the same field names. Five rotating quests + a daily login
 * streak. Static seed; refreshes from the wall clock for the streak day.
 *
 * ## cycle 17 BAL-03 — daily quests now credit persistently
 *
 * History: the claim handler used to do the progress check, mark an
 * in-memory `CLAIMED` Map, and return `{claimed:true, rewards}` while
 * performing NO wallet credit, NO XP grant, and NO DB write. The
 * advertised daily economy (gold + gems + xp) was fiction — the player
 * wallet never moved — and the CLAIMED Map reset on every restart, so a
 * restart re-opened every claim. Two of the five quests (the old merge /
 * donate quests) were also seeded with unwired event hooks and could
 * NEVER be claimed.
 *
 * Fix: every quest is now backed by a REAL QuestProgressService counter
 * (battles_won / buildings_built — the only counters game-server actually
 * fires), and the claim is delegated to DailyEngagementService.claim()
 * with a DATE-KEYED missionId (`daily-<questId>:<UTC-date>`). That gives:
 *   - persistent, DB-backed idempotency (mission_claims UNIQUE row that
 *     survives a restart and resets each UTC day so the quest repeats);
 *   - a real gold/gems wallet credit (creditWallet → game-server
 *     battle-reward) AND the progression XP grant (creditXp → award-xp,
 *     source=daily_mission, capped at 3000 XP/UTC-day by game-server);
 *   - the displayed claimed-state hydrated from the DB, not memory.
 * The in-memory CLAIMED Map is gone. */

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
   * The symbolic counter name QuestProgressService tracks for this quest,
   * fired by game-server when battles end / buildings complete (see
   * apps/game-server/src/quest-progress/quest-progress-notifier.service.ts).
   *
   * cycle 17 BAL-03: EVERY quest now carries one. The two previously
   * unwired quests (merge / donate — no `merges` / `donations` counter
   * exists anywhere in game-server) were retired and replaced with quests
   * backed by the two counters that ARE fired (`battles_won`,
   * `buildings_built`), so the whole catalog is genuinely completable.
   */
  liveCountQuestId: string;
}

/**
 * Daily quest catalog.
 *
 * cycle 17 BAL-03: trimmed the unclaimable quests. game-server only ever
 * fires two quest-progress counters — `battles_won`
 * (apps/game-server/src/game/game.service.ts) and `buildings_built`
 * (apps/game-server/src/buildings/buildings.service.ts). The former merge
 * (q3) and donate (q4) quests had no counter and shipped progress=0 with a
 * fail-closed gate, so they could never be claimed. Both are replaced here
 * with counter-backed quests so all five are reachable.
 *
 * `progress` is a static seed only used when QuestProgressService is
 * unavailable (test harness); live reads override it. Rewards are mirrored
 * server-side in apps/api/src/modules/daily-engagement/missions.catalog.ts
 * (the `DAILY` block) — keep the ids in lock-step.
 */
const QUESTS: Quest[] = [
  { id: 'q1', kind: 'pve',   title: 'PvE Avı',     description: '3 PvE savaş kazan',     progress: 0, target: 3, reward: { gold: 200, xp: 200 }, claimed: false, liveCountQuestId: 'battles_won' },
  { id: 'q2', kind: 'build', title: 'İnşaatçı',     description: '2 yeni yapı inşa et',   progress: 0, target: 2, reward: { gold: 300 },         claimed: false, liveCountQuestId: 'buildings_built' },
  { id: 'q3', kind: 'build', title: 'Mimar',        description: '5 yapı inşa et',        progress: 0, target: 5, reward: { gold: 250 },         claimed: false, liveCountQuestId: 'buildings_built' },
  { id: 'q4', kind: 'pve',   title: 'İlk Zafer',    description: '1 savaş kazan',         progress: 0, target: 1, reward: { gems: 20, xp: 200 },  claimed: false, liveCountQuestId: 'battles_won' },
  { id: 'q5', kind: 'pvp',   title: 'Arena Galibi', description: '1 zafer kazan',         progress: 0, target: 1, reward: { gems: 25, xp: 200 },  claimed: false, liveCountQuestId: 'battles_won' },
];

@ApiTags('missions (stub)')
@Controller('daily')
export class MissionsStubController {
  private readonly logger = new Logger(MissionsStubController.name);

  constructor(
    // `@Optional()` so the stub stays mountable in any test harness that
    // doesn't wire QuestProgressModule. When missing we fall back to the
    // static seed values — exactly the legacy behaviour.
    @Optional() private readonly questProgress?: QuestProgressService,
    // `@Optional()` for the same reason. When present the claim handler
    // delegates to it for DB-backed idempotency + wallet/XP credit; when
    // absent (a bare unit-test harness) the claim still validates progress
    // but cannot persist or credit — it returns claimed:true so the test
    // contract is unchanged.
    @Optional() private readonly dailyEngagement?: DailyEngagementService,
  ) {}

  /**
   * The date-keyed missionId persisted to mission_claims for a daily quest
   * claim: `daily-<questId>:<UTC-date>` (e.g. `daily-q1:2026-06-07`).
   *
   * The UTC-date segment is what makes the claim repeatable: a same-day
   * re-POST collides on the mission_claims UNIQUE(userId, missionId) row
   * (→ alreadyClaimed) and survives a restart, but the next UTC day yields
   * a fresh missionId so the quest can be earned again. missions.catalog.ts
   * strips the `:<date>` suffix to resolve the base reward.
   */
  private static dailyClaimMissionId(questId: string): string {
    const utcDate = new Date().toISOString().slice(0, 10);
    return `daily-${questId}:${utcDate}`;
  }

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
    // Reflect the per-player claimed state into each quest's `claimed`
    // flag. cycle 17 BAL-03: this is now sourced from the DB
    // (mission_claims) instead of the old in-memory CLAIMED Map, so the
    // flag survives a restart and is the single source of truth the FE
    // hydrates from. We look for today's date-keyed missionId — a claim
    // from a previous UTC day no longer marks the quest claimed, which is
    // exactly the per-day reset behaviour we want.
    const claimedToday = await this.getClaimedTodaySet(playerId);

    // Pull live counters from QuestProgressModule when available. Single
    // round-trip — `getAllProgress` returns every quest counter the user
    // has, so we can map quests to live values in-memory.
    const liveCounters = this.questProgress
      ? await this.questProgress.getAllProgress(playerId).catch(() => ({} as Record<string, number>))
      : {};

    const quests = QUESTS.map((q) => {
      const live = Object.prototype.hasOwnProperty.call(liveCounters, q.liveCountQuestId)
        ? liveCounters[q.liveCountQuestId]
        : null;
      // Cap progress at target so the UI bar never overflows the quest.
      // The actual counter on the api side can keep climbing past target
      // across multiple daily cycles — that's a problem for the future
      // DailyEngagementModule's day-rollover logic, not the stub.
      const progress = live !== null ? Math.min(q.target, live) : q.progress;
      return { ...q, progress, claimed: claimedToday.has(q.id) };
    });

    return {
      playerId,
      day: new Date().toISOString().slice(0, 10),
      quests,
      bonusUnlockedAt: 4, // claim daily bonus chest at 4/5 done
      totalDone: quests.filter((q) => q.progress >= q.target).length,
      claimedCount: claimedToday.size,
    };
  }

  /**
   * Set of quest ids the player has already claimed during the current UTC
   * day, read from the persisted mission_claims rows.
   *
   * cycle 17 BAL-03: replaces the in-memory CLAIMED Map. We list the
   * player's claims and keep only those whose missionId matches today's
   * date-keyed form `daily-<questId>:<today>`. Falls back to an empty set
   * when DailyEngagementService isn't wired (test harness) or the lookup
   * fails — a transient read error should leave quests claimable, never
   * lock them, and the DB UNIQUE row still blocks an actual double-credit.
   */
  private async getClaimedTodaySet(playerId: string): Promise<Set<string>> {
    if (!this.dailyEngagement) return new Set<string>();
    const today = new Date().toISOString().slice(0, 10);
    try {
      const { claims } = await this.dailyEngagement.listClaims(playerId);
      const out = new Set<string>();
      for (const c of claims) {
        // missionId shape: `daily-<questId>:<UTC-date>`
        if (!c.missionId.endsWith(`:${today}`)) continue;
        const body = c.missionId.slice('daily-'.length, c.missionId.length - (today.length + 1));
        if (body) out.add(body);
      }
      return out;
    } catch (err) {
      this.logger.warn(
        `claimed-today lookup failed user=${playerId}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
      return new Set<string>();
    }
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

  /**
   * Claim a daily quest reward.
   *
   * cycle 17 BAL-03 — daily quests now credit persistently (DB-backed,
   * date-keyed idempotency); all listed quests are claimable.
   *
   * Flow:
   *   1. Resolve the quest from the catalog (404 on unknown id).
   *   2. Server-side progress gate: read the live QuestProgressService
   *      counter (battles_won / buildings_built) and 400 if it hasn't
   *      reached the quest target. Every quest is now counter-backed, so
   *      none is permanently fail-closed.
   *   3. Delegate to DailyEngagementService.claim() with a DATE-KEYED
   *      missionId (`daily-<questId>:<UTC-date>`). That single call:
   *        - persists a mission_claims row (DB idempotency — survives
   *          restart, resets per UTC day, blocks double-claim);
   *        - credits gold/gems to the wallet (creditWallet → game-server
   *          battle-reward, signed with the internal-service secret);
   *        - fires the progression XP grant (creditXp → award-xp,
   *          source=daily_mission, referenceId=mission:daily-<q>:<date>,
   *          capped 3000 XP/UTC-day by game-server level-config).
   *
   * Idempotent: a same-day re-POST returns `{claimed:false,
   * alreadyClaimed:true}` without re-crediting.
   */
  @Post('quests/:questId/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a quest reward (idempotent — second call returns alreadyClaimed)' })
  async claim(
    @Request() req: any,
    @Param('questId') questId: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) {
      throw new HttpException('Görev bulunamadı.', HttpStatus.NOT_FOUND);
    }
    const userId: string = req.user?.id ?? 'unknown';

    // Server-side progress check (audit B2 fix).
    //
    // Before this guard the claim handler only checked the in-memory
    // CLAIMED set — Day-1 players could claim all daily quests with 0/N
    // progress because the FE was the only thing reading q.target.
    //
    // Every quest now carries a `liveCountQuestId` (battles_won /
    // buildings_built), so we consult QuestProgressService (game-server
    // increments it via the X-Internal-Service-guarded
    // /quest-progress/increment endpoint). When the service is absent
    // (test harness) we fall back to the static seed, which is 0 for the
    // counter-backed quests so they fail-closed there — the intended
    // safe-by-default behaviour.
    let progress = quest.progress;
    if (this.questProgress) {
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

    // Delegate persistence + wallet + XP to DailyEngagementService. The
    // date-keyed missionId is the DB-backed idempotency key (replaces the
    // old in-memory CLAIMED Map that reset on restart and never blocked a
    // post-restart re-credit). DailyEngagementService.claim resolves the
    // real reward from missions.catalog.ts's DAILY block (date suffix
    // stripped), persists the mission_claims row, and fans out the wallet
    // credit + award-xp grant.
    if (this.dailyEngagement) {
      const missionId = MissionsStubController.dailyClaimMissionId(questId);
      const result = await this.dailyEngagement.claim({
        userId,
        missionId,
        missionType: 'daily',
        authorization,
      });
      if (result.alreadyClaimed) {
        // Not an error — UI handles the "already claimed" case gracefully.
        return { claimed: false, alreadyClaimed: true };
      }
      this.logger.log(
        `Daily quest claimed user=${userId} quest=${questId} ` +
          `walletCredited=${result.walletCredited} xpGranted=${result.xpGranted}`,
      );
      return {
        claimed: true,
        rewards: result.rewards ?? quest.reward,
        alreadyClaimed: false,
        walletCredited: result.walletCredited,
        xpGranted: result.xpGranted,
      };
    }

    // Degraded path (no DailyEngagementService wired — bare unit-test
    // harness only). Progress was validated above; report the catalog
    // reward so the contract stays stable, but nothing is persisted or
    // credited in this configuration.
    this.logger.warn(
      `Daily quest claim could not persist/credit — DailyEngagementService ` +
        `not available (user=${userId} quest=${questId})`,
    );
    return { claimed: true, rewards: quest.reward, alreadyClaimed: false };
  }
}
