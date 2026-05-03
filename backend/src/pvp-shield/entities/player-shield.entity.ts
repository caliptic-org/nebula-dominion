import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('player_shields')
@Index(['playerId'], { unique: true })
export class PlayerShield {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  @Column({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;

  @Column({ name: 'shield_removed_at', type: 'timestamptz', nullable: true })
  shieldRemovedAt: Date | null;

  @Column({ name: 'shield_removal_bonus_granted', type: 'boolean', default: false })
  shieldRemovalBonusGranted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
