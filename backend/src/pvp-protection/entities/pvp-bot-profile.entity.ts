import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum BotDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('pvp_bot_profiles')
@Index(['powerScore'])
@Index(['isActive'])
export class PvpBotProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  race: string;

  @Column({ name: 'power_score', type: 'int' })
  powerScore: number;

  @Column({ type: 'jsonb' })
  units: object;

  @Column({ type: 'enum', enum: BotDifficulty, default: BotDifficulty.MEDIUM })
  difficulty: BotDifficulty;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
