import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Persisted record of a single mission reward being claimed.
 *
 * One row per (userId, missionId) — the UNIQUE constraint makes the
 * claim endpoint idempotent: a re-POST returns `alreadyClaimed: true`
 * instead of double-crediting the wallet.
 *
 * `missionId` is a stable string identifier from the frontend mission
 * catalog (e.g. `story-2`, `weekly-1`, `ach-3`, `daily-q1`) — not a
 * foreign key, because story/weekly/achievement mission definitions
 * still live client-side. When those move server-side this column
 * becomes the join target.
 *
 * `rewardJson` captures the exact reward shape granted at claim time
 * so future auditing / refunds don't need to back-derive from the
 * (mutable) catalog.
 */
export type MissionType = 'story' | 'weekly' | 'achievement' | 'daily';

@Entity('mission_claims')
@Unique('UQ_mission_claims_user_mission', ['userId', 'missionId'])
export class MissionClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_mission_claims_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'mission_id', type: 'varchar', length: 100 })
  missionId: string;

  @Column({
    name: 'mission_type',
    type: 'varchar',
    length: 20,
  })
  missionType: MissionType;

  @CreateDateColumn({ name: 'claimed_at', type: 'timestamptz' })
  claimedAt: Date;

  @Column({ name: 'reward_json', type: 'jsonb', default: () => "'{}'" })
  rewardJson: { gold?: number; gems?: number; xp?: number };
}
