import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('pvp_stats')
@Index(['playerId'], { unique: true })
export class PvpStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid', unique: true })
  playerId: string;

  @Column({ name: 'consecutive_losses', type: 'int', default: 0 })
  consecutiveLosses: number;

  @Column({ name: 'total_wins', type: 'int', default: 0 })
  totalWins: number;

  @Column({ name: 'total_losses', type: 'int', default: 0 })
  totalLosses: number;

  @Column({ name: 'comeback_bonuses_received', type: 'int', default: 0 })
  comebackBonusesReceived: number;

  @Column({ name: 'last_comeback_at', type: 'timestamptz', nullable: true })
  lastComebackAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
