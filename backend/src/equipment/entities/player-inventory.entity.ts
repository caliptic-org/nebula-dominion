import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EquipmentItem } from './equipment-item.entity';

@Entity('player_inventory')
@Index(['playerId'])
@Index(['playerId', 'itemId'], { unique: true })
export class PlayerInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'item_id', type: 'varchar', length: 255 })
  itemId: string;

  @ManyToOne(() => EquipmentItem, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item: EquipmentItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
