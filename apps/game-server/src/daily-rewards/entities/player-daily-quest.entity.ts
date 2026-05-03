import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('player_daily_quests')
@Unique(['userId', 'questDate', 'questType'])
export class PlayerDailyQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  /** UTC date string YYYY-MM-DD */
  @Column({ name: 'quest_date', type: 'varchar', length: 10 })
  questDate: string;

  @Column({ name: 'quest_type', type: 'varchar', length: 64 })
  questType: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'target_amount', type: 'int', default: 1 })
  targetAmount: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ name: 'xp_reward', type: 'int', default: 0 })
  xpReward: number;

  @Column({ name: 'mineral_reward', type: 'int', default: 0 })
  mineralReward: number;

  @Column({ name: 'gas_reward', type: 'int', default: 0 })
  gasReward: number;

  @Column({ name: 'energy_reward', type: 'int', default: 0 })
  energyReward: number;

  @Column({ name: 'awards_loot_box', type: 'boolean', default: false })
  awardsLootBox: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
