import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('player_stamina')
@Index(['playerId'], { unique: true })
export class PlayerStamina {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  @Column({ name: 'current_stamina', type: 'int', default: 10 })
  currentStamina: number;

  @Column({ name: 'max_stamina', type: 'int', default: 10 })
  maxStamina: number;

  // tracks when the last regen calculation was persisted
  @Column({ name: 'last_regen_at', type: 'timestamptz' })
  lastRegenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
