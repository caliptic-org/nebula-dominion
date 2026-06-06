import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit cycle 13 — C13-AUDIT-02: forgiving backfill of legacy story rows.
 *
 * ## Why this migration exists
 *
 * Before cycle 6, `StoryService.completeChapter()` had no order gate, no
 * prerequisite check, and no level gate. A caller could POST any
 * chapterId from the catalog in any order, and the legacy implementation
 * always:
 *
 *   1. appended `chapterId` to `completed_chapters`
 *   2. advanced `current_chapter` to the next chapter id (when that
 *      branch existed in pre-cycle-6 code paths)
 *
 * Result: legitimate legacy rows exist with shapes like
 *
 *   completed_chapters = ['ch_05_iron_dawn']
 *   current_chapter    = 'ch_06_hydra_rises'
 *
 * — the `current_chapter` pointer was advanced past chapters the user
 * never recorded as complete (ch_01..ch_04 missing).
 *
 * Post-cycle-6, `completeChapter()` enforces TWO gates that interact
 * catastrophically with these rows:
 *
 *   a) Linear order gate: `chapterId` MUST equal `current_chapter`. So
 *      only `ch_06_hydra_rises` is accepted in the example above.
 *   b) Prereq check: every chapter with `number < ch_06.number` must be
 *      in `completed_chapters`. ch_01..ch_04 are missing → BLOCKED.
 *
 * Net effect: the user can never POST ch_06 (prereq missing) AND can
 * never POST ch_05 either (linear-order gate rejects it because
 * `current_chapter !== ch_05`). The account is permanently soft-locked
 * out of every future story reward — gold, gems, XP, titles.
 *
 * ## Fix — forgiving backfill
 *
 * For every row where `current_chapter` points past chapters NOT in
 * `completed_chapters`, set `completed_chapters` to the FULL ordered set
 * of chapter ids with `number < current_chapter.number`. The next
 * complete POST then satisfies both the linear-order gate (chapterId
 * already equals `current_chapter`) and the prereq check (all earlier
 * chapter ids now in the array).
 *
 * ### Reward semantics
 *
 * Backfill is intentionally **non-retroactive**. We do NOT credit gold,
 * gems, XP, or titles for the chapters we mark complete here. Cycle 6
 * reward delivery only fires inside `StoryService.completeChapter()`'s
 * pessimistic-write transaction; backfilled rows skip that path
 * entirely. Players keep their existing wallet, level, and titles
 * exactly as-is. The migration only restores their ability to make
 * forward progress.
 *
 * Rationale: a retroactive credit would (a) double-credit any player
 * who had received rewards through the legacy echo response and (b)
 * collide with the cycle-3 UNIQUE constraint on
 * `xp_transactions(user_id, source, reference_id)` for any chapter
 * whose XP grant already landed. Forgoing the back-credit is the
 * conservative posture.
 *
 * ### Audit trail
 *
 * Each backfilled row appends the sentinel marker `__legacy_backfill__`
 * to the `titles` text[] array. The marker is filtered out by the
 * controller serialiser (see story.controller serialisation; players
 * never see it) but lets a future audit run:
 *
 *   SELECT count(*) FROM story_progress
 *     WHERE '__legacy_backfill__' = ANY(titles);
 *
 * to count affected accounts. We piggy-back on the existing `titles`
 * text[] (added in 1779925000000) instead of adding a new boolean
 * column so the migration is a pure UPDATE — no schema change, no
 * DEFAULT backfill rewrite of the whole table.
 *
 * ### Idempotency
 *
 * Re-running the migration is safe:
 *   - the WHERE clause skips rows that already have the
 *     `__legacy_backfill__` marker
 *   - the WHERE clause skips rows whose `completed_chapters` already
 *     contains all earlier chapter ids
 * Both checks are evaluated in SQL so a second `up()` call is a no-op.
 *
 * ### Chapter catalog reference
 *
 * Chapter id ↔ number mapping is hard-coded here as a CTE rather than
 * imported from `story.config.ts`. Migrations run inside TypeORM's
 * compiled context and importing the runtime catalog risks pulling in
 * NestJS dependencies the migration runner doesn't have. The mapping
 * below is a verbatim copy of `STORY_CHAPTERS` at the cycle-13 cutoff
 * — see `apps/api/src/modules/story/story.config.ts`. If chapters are
 * added or renumbered LATER, write a NEW migration; do NOT edit this
 * one in place (TypeORM tracks executed migrations by class name and
 * will not re-run an edited file).
 */
export class BackfillLegacyStoryProgress1779930000000
  implements MigrationInterface
{
  name = 'BackfillLegacyStoryProgress1779930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // CTE-backed catalog matching apps/api/src/modules/story/story.config.ts
    // at the cycle-13 cutoff. Order matters: number ascending.
    //
    // We compute, per existing story_progress row:
    //   - target_number := the `number` of the row's current_chapter
    //   - expected_set  := array of chapter.id with number < target_number
    //                      (ordered ASC so the persisted array is
    //                      stable / diff-friendly)
    // Then we UPDATE rows where:
    //   - target_number could be resolved (current_chapter is a known id)
    //   - at least one expected prereq id is NOT already present
    //     in completed_chapters (otherwise the row is healthy)
    //   - the row hasn't been backfilled by a prior run of this
    //     migration (sentinel marker absent)

    const sql = `
      WITH catalog (chapter_id, num) AS (
        VALUES
          ('ch_01_arrival',         1::int),
          ('ch_02_first_contact',   2::int),
          ('ch_03_iron_tide',       3::int),
          ('ch_04_age1_end',        4::int),
          ('ch_05_iron_dawn',       5::int),
          ('ch_06_hydra_rises',     6::int),
          ('ch_07_automata_secret', 7::int),
          ('ch_08_titan_protocol',  8::int),
          ('ch_09_new_order',       9::int)
      ),
      target AS (
        SELECT sp.id            AS row_id,
               sp.user_id       AS user_id,
               sp.completed_chapters AS existing_completed,
               sp.titles        AS existing_titles,
               sp.current_chapter AS current_chapter,
               cat.num          AS target_number
        FROM public.story_progress sp
        JOIN catalog cat ON cat.chapter_id = sp.current_chapter
      ),
      expected AS (
        SELECT t.row_id,
               t.user_id,
               t.existing_completed,
               t.existing_titles,
               t.current_chapter,
               t.target_number,
               COALESCE(
                 ARRAY(
                   SELECT c2.chapter_id
                   FROM catalog c2
                   WHERE c2.num < t.target_number
                   ORDER BY c2.num ASC
                 ),
                 ARRAY[]::text[]
               ) AS expected_completed
        FROM target t
      ),
      candidates AS (
        SELECT e.row_id,
               e.user_id,
               e.existing_completed,
               e.existing_titles,
               e.current_chapter,
               e.expected_completed
        FROM expected e
        WHERE
          -- Already backfilled by a previous run → skip.
          NOT ('__legacy_backfill__' = ANY(COALESCE(e.existing_titles, ARRAY[]::text[])))
          -- At least one expected prereq id is missing from
          -- existing completed_chapters → the row is broken and
          -- needs backfill.
          AND EXISTS (
            SELECT 1
            FROM unnest(e.expected_completed) AS exp(id)
            WHERE NOT (exp.id = ANY(COALESCE(e.existing_completed, ARRAY[]::text[])))
          )
      ),
      updated AS (
        UPDATE public.story_progress sp
           SET completed_chapters = c.expected_completed,
               titles = COALESCE(sp.titles, ARRAY[]::text[]) || ARRAY['__legacy_backfill__']::text[],
               updated_at = NOW()
          FROM candidates c
         WHERE sp.id = c.row_id
        RETURNING sp.id, sp.user_id, sp.current_chapter, sp.completed_chapters
      )
      SELECT count(*)::int AS backfilled_count FROM updated;
    `;

    const result = await queryRunner.query(sql);
    const count: number =
      Array.isArray(result) && result[0] && 'backfilled_count' in result[0]
        ? Number(result[0].backfilled_count)
        : 0;

    if (count > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[migration 1779930000000] backfilled ${count} legacy story_progress row(s); ` +
          `completed_chapters set to all chapters with number < current_chapter.number; ` +
          `'__legacy_backfill__' marker appended to titles[]; ` +
          `no retroactive gold/gems/XP credit (cycle 6 reward path bypassed by design).`,
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `[migration 1779930000000] no legacy story_progress rows required backfill ` +
          `(already healthy or previously migrated).`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert: remove the sentinel marker from rows we
    // tagged on the up() pass. We CANNOT reliably restore the prior
    // (broken) `completed_chapters` shape — that data is the bug we
    // fixed and is intentionally lost. Removing the marker is enough
    // to let `up()` run again on the same row in dev/test if the
    // migration needs to be replayed.
    await queryRunner.query(`
      UPDATE public.story_progress
         SET titles = array_remove(COALESCE(titles, ARRAY[]::text[]), '__legacy_backfill__'),
             updated_at = NOW()
       WHERE '__legacy_backfill__' = ANY(COALESCE(titles, ARRAY[]::text[]))
    `);
  }
}
