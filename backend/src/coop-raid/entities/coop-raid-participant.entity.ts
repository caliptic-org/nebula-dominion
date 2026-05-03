import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('coop_raid_participants')
@Index(['runId', 'userId'], { unique: true })
@Index(['userId'])
export class CoopRaidParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'damage_dealt', type: 'int', default: 0 })
  damageDealt: number;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  @Column({ name: 'gas_drop', type: 'int', default: 0 })
  gasDrop: number;

  @Column({ name: 'rare_mat_drop', type: 'int', default: 0 })
  rareMatDrop: number;

  @Column({ name: 'mutation_essence_drop', type: 'int', default: 0 })
  mutationEssenceDrop: number;

  @Column({ name: 'rewards_granted', type: 'boolean', default: false })
  rewardsGranted: boolean;
}
