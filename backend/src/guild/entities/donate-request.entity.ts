import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResourceType } from '../../resources/entities/resource-config.entity';

export enum DonateRequestStatus {
  OPEN = 'open',
  FULFILLED = 'fulfilled',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('donate_requests')
@Index(['guildId', 'status', 'expiresAt'])
@Index(['requesterId', 'createdAt'])
export class DonateRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guild_id', type: 'uuid' })
  guildId: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId: string;

  @Column({ name: 'resource_type', type: 'enum', enum: ResourceType })
  resourceType: ResourceType;

  @Column({ name: 'amount_requested', type: 'int' })
  amountRequested: number;

  @Column({ name: 'amount_fulfilled', type: 'int', default: 0 })
  amountFulfilled: number;

  @Column({ type: 'enum', enum: DonateRequestStatus, default: DonateRequestStatus.OPEN })
  status: DonateRequestStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
