import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('guild_contribution_daily')
@Index(['userId', 'day'], { unique: true })
@Index(['guildId', 'day'])
export class ContributionDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'date' })
  day: string;

  @Column({ name: 'donate_made', type: 'int', default: 0 })
  donateMade: number;

  @Column({ name: 'donate_received', type: 'int', default: 0 })
  donateReceived: number;

  @Column({ name: 'chat_message_count', type: 'int', default: 0 })
  chatMessageCount: number;

  // Cumulative raid damage % (0..1+) contributed today across raid runs
  @Column({ name: 'raid_damage_pct', type: 'numeric', precision: 6, scale: 4, default: 0 })
  raidDamagePct: number;

  // Total research XP contributed today
  @Column({ name: 'research_xp_contributed', type: 'int', default: 0 })
  researchXpContributed: number;

  // Number of arena matches played today (cap 15/day toward contribution score)
  @Column({ name: 'arena_match_played', type: 'int', default: 0 })
  arenaMatchPlayed: number;

  @Column({ name: 'points', type: 'int', default: 0 })
  points: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
