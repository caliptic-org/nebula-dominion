import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum GuildRaidDropSource {
  BASE = 'base',
  TOP5_BONUS = 'top5_bonus',
  CAPPED_EXCESS = 'capped_excess',
}

@Entity('guild_raid_drops')
export class GuildRaidDrop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'raid_id', type: 'uuid' })
  raidId: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'essence_amount', type: 'int' })
  essenceAmount: number;

  @Column({ type: 'enum', enum: GuildRaidDropSource })
  source: GuildRaidDropSource;

  @CreateDateColumn({ name: 'awarded_at' })
  awardedAt: Date;
}
