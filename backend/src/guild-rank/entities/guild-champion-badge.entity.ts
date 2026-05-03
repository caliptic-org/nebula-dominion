import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('guild_champion_badge')
@Index(['guildId', 'weekKey'], { unique: true })
@Index(['activeFrom', 'activeTo'])
export class GuildChampionBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'week_key', type: 'varchar', length: 16 })
  weekKey: string;

  @Column({ type: 'int' })
  rank: number;

  @Column({ name: 'gem_boost_pct', type: 'int', default: 10 })
  gemBoostPct: number;

  @Column({ name: 'active_from', type: 'timestamptz' })
  activeFrom: Date;

  @Column({ name: 'active_to', type: 'timestamptz' })
  activeTo: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
