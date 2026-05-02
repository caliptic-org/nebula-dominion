import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('payment_webhook_events')
@Unique(['provider', 'eventId'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  provider: string;

  @Column({ name: 'event_id', length: 300 })
  eventId: string;

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ length: 500, nullable: true })
  signature: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_processed', default: false })
  isProcessed: boolean;

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string | null;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;
}
