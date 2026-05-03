import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('player_power')
export class PlayerPower {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'commander_score', type: 'int', default: 0 })
  commanderScore: number;

  @Column({ name: 'research_score', type: 'int', default: 0 })
  researchScore: number;

  @Column({ type: 'varchar', length: 32, default: 'human' })
  race: string;

  @Column({ name: 'prev_commander_score', type: 'int', default: 0 })
  prevCommanderScore: number;

  @Column({ name: 'prev_research_score', type: 'int', default: 0 })
  prevResearchScore: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
