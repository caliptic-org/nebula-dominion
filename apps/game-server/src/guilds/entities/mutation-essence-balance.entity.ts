import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('mutation_essence_balances')
export class MutationEssenceBalance {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
