import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('player_resources')
export class PlayerResources {
  @PrimaryColumn('uuid')
  playerId: string;

  @Column({ default: 2400 })
  mineral: number;

  @Column({ default: 840 })
  gas: number;

  @Column({ default: 1200 })
  energy: number;

  @Column({ default: 12 })
  population: number;

  @Column({ name: 'population_cap', default: 50 })
  populationCap: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
