import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UnitType } from '../constants/race-configs.constants';
import { Race } from '../../matchmaking/dto/join-queue.dto';

@Entity('training_queue')
@Index(['playerId', 'isComplete'])
export class TrainingQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id' })
  @Index()
  playerId: string;

  @Column({ name: 'building_id' })
  buildingId: string;

  @Column({ type: 'enum', enum: UnitType, name: 'unit_type' })
  unitType: UnitType;

  @Column({ type: 'enum', enum: Race })
  race: Race;

  @Column({ name: 'completes_at', type: 'timestamptz' })
  completesAt: Date;

  @Column({ name: 'is_complete', default: false })
  isComplete: boolean;

  /**
   * Batch size — how many units this single queue row represents. Defaults
   * to 1 so legacy callers and the single-unit happy path stay unchanged.
   * Cost is deducted at insert time as `unitCost × count`, duration scales
   * linearly (`baseDuration × count`), and the completion worker spawns
   * `count` units when the row flips to isComplete. The DB CHECK enforces
   * 1..99 to match the frontend stepper's cap (migration 1779810000000).
   */
  @Column({ type: 'int', default: 1 })
  count: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
