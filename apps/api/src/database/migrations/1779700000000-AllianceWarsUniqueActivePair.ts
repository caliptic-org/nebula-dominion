import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backstops the alliance-war duplicate-prevention check with a DB-level
 * partial UNIQUE index.
 *
 * The application layer (AllianceWarService.declareWar) already rejects a
 * second declaration between the same pair while one is DECLARED or ACTIVE,
 * but a TOCTOU race between two simultaneous POSTs would slip through. The
 * partial unique index closes that gap:
 *
 *   - Order-agnostic: keys on LEAST(attacker_id, defender_id) and
 *     GREATEST(...), so (A→B) and (B→A) collide identically.
 *   - Status-filtered: only DECLARED + ACTIVE rows are unique. Once a war
 *     ends (status=ENDED or TRUCE), the pair can declare again.
 *
 * Additional helper indexes on attacker_id and defender_id keep the common
 * "list wars where I'm a participant" query off a sequential scan.
 *
 * Idempotent — uses IF NOT EXISTS so the migration is safe to re-run.
 */
export class AllianceWarsUniqueActivePair1779700000000 implements MigrationInterface {
  name = 'AllianceWarsUniqueActivePair1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_alliance_wars_active_pair"
        ON public.alliance_wars (
          LEAST(attacker_id, defender_id),
          GREATEST(attacker_id, defender_id)
        )
        WHERE status IN ('declared', 'active');
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alliance_wars_attacker_id"
        ON public.alliance_wars (attacker_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alliance_wars_defender_id"
        ON public.alliance_wars (defender_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alliance_wars_defender_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alliance_wars_attacker_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_alliance_wars_active_pair";`);
  }
}
