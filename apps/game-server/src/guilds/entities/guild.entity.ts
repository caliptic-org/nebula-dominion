import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { GuildMember } from './guild-member.entity';

@Entity('guilds')
export class Guild {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 5 })
  tag: string;

  @Index()
  @Column({ name: 'leader_id', type: 'varchar', length: 255 })
  leaderId: string;

  @Column({ name: 'age_unlocked_at', type: 'timestamptz', nullable: true })
  ageUnlockedAt: Date | null;

  @Column({ name: 'tier_score', type: 'int', default: 0 })
  tierScore: number;

  @Column({ name: 'member_count', type: 'int', default: 1 })
  memberCount: number;

  @OneToMany(() => GuildMember, (m) => m.guild)
  members: GuildMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
