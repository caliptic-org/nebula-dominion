import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('guild_weekly_rank')
@Index(['weekKey', 'guildId'], { unique: true })
@Index(['weekKey', 'rank'])
export class GuildWeeklyRank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'week_key', type: 'varchar', length: 16 })
  weekKey: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'guild_name', type: 'varchar', length: 64 })
  guildName: string;

  @Column({ name: 'guild_tag', type: 'varchar', length: 5 })
  guildTag: string;

  @Column({ name: 'contribution_total', type: 'bigint' })
  contributionTotal: string;

  @Column({ type: 'int' })
  rank: number;

  @Column({ name: 'member_count', type: 'int' })
  memberCount: number;

  @CreateDateColumn({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;
}
