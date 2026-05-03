import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('player_resources')
export class PlayerResource {
  @PrimaryColumn({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'mineral_per_hour', type: 'float', default: 0 })
  mineralPerHour: number;

  @Column({ name: 'gas_per_hour', type: 'float', default: 0 })
  gasPerHour: number;

  @Column({ name: 'energy_per_hour', type: 'float', default: 0 })
  energyPerHour: number;

  @Column({ name: 'population_current', type: 'int', default: 0 })
  populationCurrent: number;

  @Column({ name: 'population_capacity', type: 'int', default: 100 })
  populationCapacity: number;

  @Column({ name: 'prev_mineral_per_hour', type: 'float', default: 0 })
  prevMineralPerHour: number;

  @Column({ name: 'prev_gas_per_hour', type: 'float', default: 0 })
  prevGasPerHour: number;

  @Column({ name: 'prev_energy_per_hour', type: 'float', default: 0 })
  prevEnergyPerHour: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
