import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('guild_raid_contributions')
export class GuildRaidContribution {
  @PrimaryColumn({ name: 'raid_id', type: 'uuid' })
  raidId: string;

  @Index()
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'damage_dealt', type: 'bigint', default: 0 })
  damageDealt: number;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'NOW()' })
  joinedAt: Date;

  @Column({ name: 'last_attack_at', type: 'timestamptz', default: () => 'NOW()' })
  lastAttackAt: Date;
}
