import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guild } from './entities/guild.entity';
import { GuildMember } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { GuildTutorialState } from './entities/guild-tutorial-state.entity';
import { GuildRaid } from './entities/guild-raid.entity';
import { GuildRaidContribution } from './entities/guild-raid-contribution.entity';
import { GuildRaidDrop } from './entities/guild-raid-drop.entity';
import { MutationEssenceBalance } from './entities/mutation-essence-balance.entity';
import { MutationEssenceWeeklyGrant } from './entities/mutation-essence-weekly-grant.entity';
import { GuildResearchState } from './entities/guild-research-state.entity';
import { GuildResearchContribution } from './entities/guild-research-contribution.entity';
import { GuildsService } from './guilds.service';
import { GuildRaidsService } from './guild-raids.service';
import { GuildResearchService } from './guild-research.service';
import { GuildsController } from './guilds.controller';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Guild,
      GuildMember,
      GuildEvent,
      GuildTutorialState,
      GuildRaid,
      GuildRaidContribution,
      GuildRaidDrop,
      MutationEssenceBalance,
      MutationEssenceWeeklyGrant,
      GuildResearchState,
      GuildResearchContribution,
    ]),
    ResourcesModule,
  ],
  providers: [GuildsService, GuildRaidsService, GuildResearchService],
  controllers: [GuildsController],
  exports: [GuildsService, GuildRaidsService, GuildResearchService],
})
export class GuildsModule {}
