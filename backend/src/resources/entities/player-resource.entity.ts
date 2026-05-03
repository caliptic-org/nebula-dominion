import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ResourceType } from './resource-config.entity';

@Entity('player_resources')
@Index(['playerId'])
@Index(['playerId', 'resourceType'], { unique: true })
export class PlayerResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'resource_type', type: 'enum', enum: ResourceType })
  resourceType: ResourceType;

  @Column({ type: 'bigint', default: 0 })
  amount: number;

  @Column({ name: 'current_age', type: 'int', default: 1 })
  currentAge: number;

  @Column({ name: 'building_level', type: 'int', default: 1 })
  buildingLevel: number;

  @Column({ name: 'last_collected_at', type: 'timestamptz', default: () => 'NOW()' })
  lastCollectedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
