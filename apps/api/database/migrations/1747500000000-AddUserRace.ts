import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRace1747500000000 implements MigrationInterface {
  name = 'AddUserRace1747500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "users_race_enum" AS ENUM ('human','zerg','automaton','beast','demon');
      EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "race" "users_race_enum" NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "race"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_race_enum"`);
  }
}
