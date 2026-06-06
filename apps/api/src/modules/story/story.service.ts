import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StoryProgress } from './entities/story-progress.entity';
import {
  STORY_CHAPTERS,
  StoryChapter,
  getChapterById,
  getChaptersByAge,
} from './story.config';

/**
 * Map a story chapter to game-server's XpSource enum value used by
 * POST /api/progression/award-xp. The story arc is a low-frequency
 * high-payout progression event (5–9 chapters across an age, each
 * gated by levelRequirement) so we map to `event` — the same bucket
 * /daily-engagement/claim uses for `missionType: 'story'`. Kept as a
 * single constant rather than a per-chapter map so a future change to
 * the XpSource selection only needs editing here.
 */
const STORY_XP_SOURCE = 'event';

/**
 * Sentinel marker appended to `story_progress.titles` by the cycle-13
 * forgiving backfill migration (`BackfillLegacyStoryProgress1779930000000`).
 *
 * The marker is internal-only — it lets a future audit query
 *   `SELECT count(*) FROM story_progress WHERE '__legacy_backfill__' = ANY(titles)`
 * surface every row touched by the backfill without adding a new
 * column. The serialiser below strips it from any HTTP response so the
 * FE never renders an empty "title badge" for it.
 *
 * Do NOT rename without writing a new migration to rewrite existing
 * rows — the SQL UPDATE in 1779930000000-BackfillLegacyStoryProgress
 * hard-codes this literal.
 */
const LEGACY_BACKFILL_MARKER = '__legacy_backfill__';

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor(
    @InjectRepository(StoryProgress)
    private readonly progressRepo: Repository<StoryProgress>,
    private readonly dataSource: DataSource,
  ) {}

  getAllChapters() {
    return STORY_CHAPTERS;
  }

  getChaptersByAge(age: number) {
    return getChaptersByAge(age);
  }

  getChapter(id: string) {
    const chapter = getChapterById(id);
    if (!chapter) throw new NotFoundException(`Bölüm '${id}' bulunamadı`);
    return chapter;
  }

  async getOrCreateProgress(userId: string): Promise<StoryProgress> {
    let record = await this.progressRepo.findOne({ where: { userId } });
    if (!record) {
      record = this.progressRepo.create({
        userId,
        completedChapters: [],
        titles: [],
        currentChapter: 'ch_01_arrival',
        lastChoice: null,
      });
      await this.progressRepo.save(record);
    }
    return record;
  }

  async getUserProgress(userId: string) {
    const record = await this.getOrCreateProgress(userId);
    const currentChapterDef = getChapterById(record.currentChapter);
    const completedCount = record.completedChapters.length;
    const totalChapters = STORY_CHAPTERS.length;

    // Strip the cycle-13 legacy-backfill sentinel from the user-facing
    // titles array — it's an internal audit marker, not a displayable
    // title. See LEGACY_BACKFILL_MARKER docblock.
    const titles = (record.titles ?? []).filter(
      (t) => t !== LEGACY_BACKFILL_MARKER,
    );

    return {
      userId,
      completedChapters: record.completedChapters,
      titles,
      completedCount,
      totalChapters,
      currentChapter: currentChapterDef ?? null,
      progressPercent: Math.round((completedCount / totalChapters) * 100),
      lastChoice: record.lastChoice,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Mark a story chapter as completed.
   *
   * ## Pre-cycle-6 behaviour (the BLOCKER this method now fixes)
   *
   * This method used to be:
   *
   *   1. `getOrCreateProgress(userId)` — load record (no lock)
   *   2. if `record.completedChapters.includes(chapterId)` → 400 "already
   *      completed"
   *   3. append to `record.completedChapters` and save
   *
   * That implementation accepted ANY chapterId from the catalog. There
   * was NO ORDER CHECK, no prerequisite check, no levelRequirement check
   * against `player_levels.current_level`. Net effect: a freshly-registered
   * account could POST `ch_09_new_order` (the final chapter) on its first
   * request, mark the final chapter completed, unlock the "Çağ 2 Fatihi"
   * title (later: any future gated content keyed on completed chapters),
   * and pocket the boss-tier reward payload — 8000 gold, 300 gems, 1000
   * XP for ch_09 — without ever picking a race, building anything, or
   * winning a fight.
   *
   * Worse, the duplicate guard ran outside any DB lock. Two parallel
   * POSTs with the same chapterId both read `completedChapters` BEFORE
   * either had written, both passed the includes() check, both appended,
   * and both saved — TOCTOU race that double-credits any reward we later
   * hang off this method.
   *
   * Also: the `reward` field on each chapter was simply ECHOED in the
   * HTTP response. There was no wallet credit, no XP transaction, no
   * title persistence. Anything the FE wanted to credit had to be
   * trusted from a separate POST, which is exactly the pattern that
   * collapsed in cycle 5 for research-stub.
   *
   * ## Cycle 6 fix (this method)
   *
   * 1. **Catalog lookup** — unknown chapterId 404s.
   * 2. **Linear order gate** — `chapterId` MUST equal
   *    `record.currentChapter`. New accounts spawn pointing at
   *    `ch_01_arrival`; completing ch_N advances `currentChapter` to
   *    `chapter.nextChapterId`. Linear order is enforced even if some
   *    future patch loosens prerequisite gating — to skip ahead, every
   *    earlier chapter must be in `completedChapters`. (We also keep the
   *    defensive "all chapters with `number < this.number` must be
   *    completed" check as belt-and-braces against any future
   *    nextChapterId graph that branches.)
   * 3. **Level gate** — probe `player_levels.current_level` and reject
   *    if it is below `chapter.levelRequirement`. ch_09 demands lv 17,
   *    ch_04 demands lv 9, etc. Returns a 400 with a Turkish hint the
   *    FE surfaces as a toast.
   * 4. **Pessimistic transaction** — the entire mutation runs inside
   *    `dataSource.transaction(...)` with `lock: pessimistic_write` on
   *    the `story_progress` row. The duplicate / order / level checks
   *    re-run INSIDE the locked snapshot, so a parallel POST that lost
   *    the row race gets a fresh `completedChapters` view and 400s
   *    correctly. Reward credit + array mutation + save all happen in
   *    the same tx — either all succeed or none do.
   * 5. **Reward delivery**:
   *      - `gold` / `gems` are upserted into `user_currency` via the
   *        same INSERT…ON CONFLICT DO UPDATE pattern the inventory
   *        sellItem path uses. `gold` → `nebula_coins`, `gems` →
   *        `premium_gems`.
   *      - `xp` is fanned out to game-server's
   *        `/api/progression/award-xp` with
   *        `referenceId = 'story:<chapterId>'`. The cycle-3 UNIQUE
   *        constraint on `xp_transactions(user_id, source,
   *        reference_id)` collapses any duplicate grant at the DB
   *        layer, so even if a retry races past the DB lock, the
   *        second XP credit is rejected by Postgres.
   *      - `titleUnlock` is appended to `record.titles` inside the
   *        same transaction. The persisted array is what GET
   *        /story/progress returns under `titles`, so the FE can
   *        render the unlocked title badge without another round trip.
   *
   * The award-xp fan-out is fire-and-forget (best-effort, 3 s timeout):
   * an outbound network blip MUST NOT roll back the local writes,
   * because the chapter completion is the auditable record. A missed
   * XP grant logs a warning and is permanently lost — same posture as
   * /daily-engagement/claim's creditXp().
   *
   * @param authorization Forwarded `Authorization: Bearer <jwt>` from the
   *        caller. Used as a fallback the same way research-stub does;
   *        game-server's InternalServiceGuard checks the
   *        `X-Internal-Service` header first, but the user JWT is
   *        attached for back-compat with older builds.
   */
  async completeChapter(
    userId: string,
    chapterId: string,
    choiceId?: string,
    authorization?: string,
  ): Promise<{
    progress: StoryProgress;
    reward: StoryChapter['reward'] | null;
    nextChapter: StoryChapter | null;
    titleGranted: string | null;
  }> {
    const chapter = getChapterById(chapterId);
    if (!chapter) throw new NotFoundException(`Bölüm '${chapterId}' bulunamadı`);

    // Make sure the row exists BEFORE we open the transaction — the
    // pessimistic lock below needs an existing row to lock. INSERT
    // happens at most once per user (UNIQUE(user_id) index), so the
    // initial create path stays out of the hot tx.
    await this.getOrCreateProgress(userId);

    // Level gate: probe player_levels OUTSIDE the story_progress tx —
    // cross-table lock would serialise every story complete on every
    // level-up, which is overkill for what amounts to a snapshot read.
    // Reading the level under read-committed is sufficient because the
    // gate is monotonic (level only goes up); a player at exactly the
    // threshold at probe time still passes after the tx commits.
    const requiredLevel = chapter.levelRequirement;
    const currentLevel = await this.fetchPlayerLevel(userId);
    if (currentLevel < requiredLevel) {
      throw new BadRequestException(
        `Çağ ${requiredLevel} gerekiyor (şu an Lv ${currentLevel})`,
      );
    }

    // Reward bookkeeping captured outside the tx so the post-commit
    // fan-out (award-xp, optional logging) has a stable snapshot.
    let titleGranted: string | null = null;

    const persistedRecord = await this.dataSource.transaction(async (manager) => {
      // Pessimistic-write lock on the story_progress row. Any
      // concurrent POST for the same userId will block on this SELECT
      // until our tx commits — the second one then sees the updated
      // `completedChapters` and 400s on the duplicate guard below.
      const locked = await manager.findOne(StoryProgress, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        // getOrCreateProgress() above just created it; the row vanishing
        // implies an admin-side delete. Refuse rather than re-create
        // silently — losing the lock window would re-open the TOCTOU.
        throw new BadRequestException('Hikaye ilerlemen bulunamadı');
      }

      // Duplicate guard — re-check inside the locked snapshot.
      if (locked.completedChapters.includes(chapterId)) {
        throw new BadRequestException(`Bölüm '${chapterId}' zaten tamamlandı`);
      }

      // Linear order gate: the chapter being completed must be the one
      // currently pointed at by `current_chapter`. New accounts start
      // at 'ch_01_arrival' and advance through `nextChapterId` only
      // after a successful complete. This blocks both ID enumeration
      // ("just POST ch_09") and order skips ("complete ch_05 before
      // ch_04").
      if (locked.currentChapter !== chapterId) {
        throw new BadRequestException(
          `Önce '${locked.currentChapter}' bölümünü tamamlamalısın`,
        );
      }

      // Belt-and-braces: every chapter with a lower `number` must be in
      // completedChapters. Future patches that branch nextChapterId or
      // let an admin reset currentChapter without trimming
      // completedChapters cannot bypass this without explicitly
      // satisfying the prereq set.
      const missingPrereq = STORY_CHAPTERS.find(
        (c) =>
          c.number < chapter.number && !locked.completedChapters.includes(c.id),
      );
      if (missingPrereq) {
        throw new BadRequestException(
          `Önce '${missingPrereq.id}' bölümünü tamamlamalısın`,
        );
      }

      // Choice validation — same shape as the legacy path, just inside
      // the tx so `lastChoice` mutation is atomic with the rest.
      if (choiceId && chapter.choices) {
        const choice = chapter.choices.find((c) => c.id === choiceId);
        if (!choice) {
          throw new BadRequestException(`Seçim '${choiceId}' bu bölümde yok`);
        }
        locked.lastChoice = { chapterId, choiceId, outcome: choice.outcome };
      }

      // Append to completedChapters (new array, not in-place — the
      // legacy mutation pattern is preserved).
      locked.completedChapters = [...locked.completedChapters, chapterId];

      // Advance the current pointer to the next chapter; if the chain
      // terminates here (`nextChapterId === null`), leave currentChapter
      // at the just-completed id so a future POST hits the duplicate
      // guard rather than re-running.
      if (chapter.nextChapterId) {
        locked.currentChapter = chapter.nextChapterId;
      }

      // Persist titleUnlock inside the locked tx — co-located with the
      // chapter append so the two arrays cannot diverge after a crash.
      const titleUnlock = chapter.reward?.titleUnlock;
      if (titleUnlock) {
        const existingTitles = locked.titles ?? [];
        if (!existingTitles.includes(titleUnlock)) {
          locked.titles = [...existingTitles, titleUnlock];
          titleGranted = titleUnlock;
        }
      } else {
        locked.titles = locked.titles ?? [];
      }

      // Wallet upsert — same INSERT…ON CONFLICT DO UPDATE pattern as
      // InventoryService.sellItem so the credit is atomic with the
      // story_progress row write (both share this tx's manager).
      const gold = chapter.reward?.gold ?? 0;
      const gems = chapter.reward?.gems ?? 0;
      if (gold > 0 || gems > 0) {
        await manager.query(
          `INSERT INTO user_currency
             (user_id, premium_gems, nebula_coins, void_crystals, updated_at)
           VALUES ($1::uuid, $2, $3, 0, NOW())
           ON CONFLICT (user_id) DO UPDATE
             SET premium_gems = user_currency.premium_gems + $2,
                 nebula_coins = user_currency.nebula_coins + $3,
                 updated_at   = NOW()`,
          [userId, gems, gold],
        );
      }

      return manager.save(StoryProgress, locked);
    });

    this.logger.log(
      `Story chapter '${chapterId}' completed by user=${userId} ` +
        `titleGranted=${titleGranted ?? '-'} ` +
        `gold=${chapter.reward?.gold ?? 0} ` +
        `gems=${chapter.reward?.gems ?? 0} ` +
        `xp=${chapter.reward?.xp ?? 0}`,
    );

    // XP fan-out AFTER the tx commits — the auditable record is the
    // story_progress row, not the xp_transactions row. A network blip
    // here is logged-and-lost; the unique-constraint on game-server
    // catches retries so we can't double-credit even on optimistic
    // re-submission from the client.
    const xpAmount = chapter.reward?.xp ?? 0;
    if (xpAmount > 0) {
      void this.awardStoryXp(userId, chapterId, authorization).catch((err) => {
        this.logger.warn(
          `award-xp(story) failed user=${userId} chapter=${chapterId}: ` +
            (err instanceof Error ? err.message : String(err)),
        );
      });
    }

    const nextChapterDef = chapter.nextChapterId
      ? getChapterById(chapter.nextChapterId) ?? null
      : null;

    return {
      progress: persistedRecord,
      reward: chapter.reward ?? null,
      nextChapter: nextChapterDef,
      titleGranted,
    };
  }

  async getAvailableChapters(userId: string, playerLevel: number) {
    const record = await this.getOrCreateProgress(userId);
    return STORY_CHAPTERS.filter(
      (c) =>
        c.levelRequirement <= playerLevel &&
        !record.completedChapters.includes(c.id),
    );
  }

  /**
   * Read the live `current_level` from `player_levels` (game-server's
   * canonical XP table). Returns 1 if the row doesn't exist yet — a
   * brand new account hasn't had its player_level row materialised yet,
   * which is itself the "you can only complete ch_01_arrival
   * (levelRequirement=1)" signal. Failing the probe silently to 1 is
   * the same fail-closed posture used by /daily-engagement preconditions.
   */
  private async fetchPlayerLevel(userId: string): Promise<number> {
    try {
      const rows = await this.dataSource.query<
        { current_level: number | string }[]
      >(
        `SELECT current_level FROM player_levels WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      const raw = rows?.[0]?.current_level;
      const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
      return Number.isFinite(n as number) ? (n as number) : 1;
    } catch (err) {
      this.logger.warn(
        `player_levels probe failed user=${userId}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
      return 1;
    }
  }

  /**
   * POST game-server's /api/progression/award-xp to grant story XP.
   * Mirrors the auth contract used by research-stub.controller.ts and
   * daily-engagement.service.ts:
   *   - X-Internal-Service signed with INTERNAL_SERVICE_SECRET (or
   *     JWT_SECRET as the fallback the rest of the api uses)
   *   - Authorization JWT forwarded for back-compat with any older
   *     game-server build that still accepts it.
   *
   * referenceId is `story:<chapterId>` (not user-scoped) so the
   * cycle-3 UNIQUE constraint on (user_id, source, reference_id)
   * collapses any second grant from the same (user, chapter) pair —
   * the user_id segment of the unique key is already in the row, so
   * the referenceId only needs to disambiguate per-chapter. A retry
   * after a partial failure gets a 409 from game-server and we treat
   * it as a benign no-op.
   */
  private async awardStoryXp(
    userId: string,
    chapterId: string,
    authorization?: string,
  ): Promise<void> {
    const baseUrl = (
      process.env.GAME_SERVER_URL || 'http://localhost:5000'
    ).replace(/\/+$/, '');
    const url = `${baseUrl}/api/progression/award-xp`;
    const serviceSecret =
      process.env.INTERNAL_SERVICE_SECRET || process.env.JWT_SECRET || '';
    if (!serviceSecret && !authorization) {
      this.logger.warn(
        `award-xp(story) skipped — no INTERNAL_SERVICE_SECRET, JWT_SECRET, or ` +
          `caller JWT available to sign the cross-service call ` +
          `(user=${userId} chapter=${chapterId})`,
      );
      return;
    }
    const body = {
      userId,
      source: STORY_XP_SOURCE,
      referenceId: `story:${chapterId}`,
    };
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
          ...(serviceSecret
            ? { 'X-Internal-Service': `Bearer ${serviceSecret}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) {
        if (res.status === 409) {
          // Duplicate (UNIQUE constraint hit) — benign, same xp grant
          // already exists. Don't log as a warning.
          this.logger.debug(
            `award-xp(story) duplicate user=${userId} chapter=${chapterId}`,
          );
          return;
        }
        const text = await res.text().catch(() => '');
        throw new Error(`non-2xx ${res.status} ${text.slice(0, 200)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
