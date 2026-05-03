import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MapActionType } from '../dto/map-action.dto';

@Entity('map_action_logs')
@Index(['playerId'])
@Index(['playerId', 'createdAt'])
export class MapActionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'player_id' })
  playerId: string;

  @Column({ type: 'enum', enum: MapActionType })
  action: MapActionType;

  @Column({ name: 'target_col' })
  targetCol: number;

  @Column({ name: 'target_row' })
  targetRow: number;

  @Column({ nullable: true })
  result: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
