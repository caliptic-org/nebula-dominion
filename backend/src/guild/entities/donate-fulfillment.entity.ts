import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResourceType } from '../../resources/entities/resource-config.entity';

@Entity('donate_fulfillments')
@Index(['requestId'])
@Index(['donorId', 'createdAt'])
@Index(['donorId', 'recipientId', 'createdAt'])
export class DonateFulfillment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'donor_id', type: 'uuid' })
  donorId: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @Column({ name: 'resource_type', type: 'enum', enum: ResourceType })
  resourceType: ResourceType;

  @Column({ type: 'int' })
  amount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
