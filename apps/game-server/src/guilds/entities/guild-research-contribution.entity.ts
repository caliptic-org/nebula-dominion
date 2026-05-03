import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('guild_research_contributions')
export class GuildResearchContribution {
  @PrimaryColumn({ name: 'research_state_id', type: 'uuid' })
  researchStateId: string;

  @Index()
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'xp_contributed', type: 'int', default: 0 })
  xpContributed: number;

  @Column({ name: 'last_contrib_at', type: 'timestamptz', default: () => 'NOW()' })
  lastContribAt: Date;
}
