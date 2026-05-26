import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('galaxy_node_garrison')
@Index(['nodeId', 'userId'], { unique: true })
export class GalaxyNodeGarrison {
  @PrimaryGeneratedColumn()
  id: number;

  /** Matches GALAXY_NODES[n].id (e.g. 'cap', 'c1', 'm1') */
  @Column({ name: 'node_id' })
  nodeId: string;

  /** UUID string matching player_resources.player_id */
  @Column({ name: 'user_id' })
  userId: string;

  /** Number of troops currently garrisoning this node */
  @Column({ name: 'garrison_count', default: 0 })
  garrisonCount: number;

  /** 'mine' | 'colony' | 'relay' | 'capital' */
  @Column({ name: 'node_kind', type: 'varchar', length: 32 })
  nodeKind: string;

  @Column({ name: 'captured_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  capturedAt: Date;

  @Column({ name: 'last_income_at', type: 'timestamp', nullable: true })
  lastIncomeAt: Date | null;
}
