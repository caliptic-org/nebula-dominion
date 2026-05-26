import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestProgress } from './entities/quest-progress.entity';

export interface IncrementResult {
  userId: string;
  questId: string;
  currentProgress: number;
  /** True when the call was deduped by `idempotencyKey` (no-op). */
  alreadyApplied: boolean;
}

/**
 * Best-effort process-local dedupe ring for idempotency keys.
 *
 * Each unique key (e.g. `battle:<matchId>:battles_won`) is recorded the
 * first time we see it. On a duplicate call within the same process the
 * service short-circuits and returns the existing counter without
 * touching the DB.
 *
 * This is process-local on purpose — the underlying invariant (a single
 * battle / building only counts once) is enforced by the natural
 * uniqueness of the event id at the caller (game-server fires once per
 * event). A multi-instance api deployment loses dedupe across restarts
 * and across replicas; for a stronger guarantee a `quest_progress_event`
 * UNIQUE table would need to be added — left as a follow-up.
 *
 * Cap entries at 10k per process to keep memory bounded; oldest get
 * evicted FIFO. 10k is comfortably above an hourly burst at the current
 * battle-completion rate.
 */
const DEDUPE_MAX = 10_000;
const seenIdempotencyKeys: Set<string> = new Set();
const seenOrder: string[] = [];

function recordIdempotencyKey(key: string): boolean {
  if (seenIdempotencyKeys.has(key)) return true;
  seenIdempotencyKeys.add(key);
  seenOrder.push(key);
  while (seenOrder.length > DEDUPE_MAX) {
    const oldest = seenOrder.shift();
    if (oldest) seenIdempotencyKeys.delete(oldest);
  }
  return false;
}

@Injectable()
export class QuestProgressService {
  private readonly logger = new Logger(QuestProgressService.name);

  constructor(
    @InjectRepository(QuestProgress)
    private readonly repo: Repository<QuestProgress>,
  ) {}

  /**
   * Atomically bump the counter for `(userId, questId)` by `amount`.
   *
   * Implemented as Postgres `INSERT ... ON CONFLICT DO UPDATE` so two
   * concurrent calls can't lose an increment to a read-then-write race.
   * Returns the post-increment value (RETURNING) without an extra round trip.
   *
   * TypeORM numeric columns come back as STRING from `pg`; the
   * `Number(...) | 0` coerces to a safe JS int before we return it to
   * callers / serialize to JSON.
   */
  async incrementProgress(
    userId: string,
    questId: string,
    amount = 1,
    idempotencyKey?: string,
  ): Promise<IncrementResult> {
    if (idempotencyKey && recordIdempotencyKey(`${userId}:${questId}:${idempotencyKey}`)) {
      const existing = await this.getProgress(userId, questId);
      return { userId, questId, currentProgress: existing, alreadyApplied: true };
    }

    const inc = Math.max(1, Math.floor(amount));

    // Single-statement upsert. The composite PK on (user_id, quest_id)
    // is the conflict target so the same player can have multiple quest
    // counters without stepping on each other.
    const rows: Array<{ current_progress: string | number }> = await this.repo.query(
      `
        INSERT INTO quest_progress (user_id, quest_id, current_progress, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, quest_id)
        DO UPDATE SET
          current_progress = quest_progress.current_progress + EXCLUDED.current_progress,
          updated_at = NOW()
        RETURNING current_progress
      `,
      [userId, questId, inc],
    );

    const next = rows[0]?.current_progress;
    const currentProgress = Math.floor(Number(next ?? 0));
    return { userId, questId, currentProgress, alreadyApplied: false };
  }

  /** Returns the raw counter for a (user, quest) pair, or 0 if no row. */
  async getProgress(userId: string, questId: string): Promise<number> {
    const row = await this.repo.findOne({ where: { userId, questId } });
    if (!row) return 0;
    return Math.floor(Number(row.currentProgress));
  }

  /** All quest counters for a single user, keyed by questId. */
  async getAllProgress(userId: string): Promise<Record<string, number>> {
    const rows = await this.repo.find({ where: { userId } });
    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.questId] = Math.floor(Number(row.currentProgress));
    }
    return out;
  }
}
