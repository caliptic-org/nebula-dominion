import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-user commander progression record.
 *
 * One row per (user_id, commander_id) pair. `level` + `xp` drive the
 * commander's bonus amplification (see commanders.constants.ts). `is_active`
 * is mutually exclusive across rows for the same user — enforced by a
 * partial unique index in migration 1779830000000.
 *
 * `unlocked_at` is NULL until the player meets the unlock criteria for
 * this commander (the 4th tier slot starts locked; the first 3 starter
 * commanders for the player's race are unlocked on first GET /commanders).
 *
 * Bonus engine reads (commander_id, level) → computes scaled bonuses.
 * Catalog metadata (name, title, skill description, portrait) lives in
 * commanders.constants.ts — not duplicated here.
 */
@Entity('player_commanders')
@Index(['userId'])
export class PlayerCommander {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'commander_id', length: 64 })
  commanderId: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  /** BIGINT in Postgres → string in TypeORM by default for safety. We
   *  parse to Number for arithmetic but Cap at 2^53; commander XP grows
   *  geometrically but never exceeds INT range in practice. */
  @Column({ type: 'bigint', default: '0' })
  xp: string;

  @Column({ name: 'unlocked_at', type: 'timestamptz', nullable: true })
  unlockedAt: Date | null;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'last_battle_at', type: 'timestamptz', nullable: true })
  lastBattleAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
