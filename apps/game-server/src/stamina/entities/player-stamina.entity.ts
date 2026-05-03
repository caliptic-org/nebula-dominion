import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('player_stamina')
export class PlayerStamina {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'current_stamina', type: 'int', default: 10 })
  currentStamina: number;

  @Column({ name: 'max_stamina', type: 'int', default: 10 })
  maxStamina: number;

  /** Stamina cost deducted per battle */
  @Column({ name: 'cost_per_battle', type: 'int', default: 10 })
  costPerBattle: number;

  /** Regen 1 stamina per N minutes (default 20) */
  @Column({ name: 'regen_interval_minutes', type: 'int', default: 20 })
  regenIntervalMinutes: number;

  @Column({ name: 'last_regen_at', type: 'timestamptz', default: () => 'NOW()' })
  lastRegenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
