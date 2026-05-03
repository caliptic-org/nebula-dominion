import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildWeeklyRank } from './entities/guild-weekly-rank.entity';
import { GuildChampionBadge } from './entities/guild-champion-badge.entity';
import { Guild } from '../guild/entities/guild.entity';
import { GuildMember } from '../guild/entities/guild-member.entity';
import { ContributionDaily } from '../guild/entities/contribution-daily.entity';
import { GuildRankController } from './guild-rank.controller';
import { GuildRankService } from './guild-rank.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuildWeeklyRank,
      GuildChampionBadge,
      Guild,
      GuildMember,
      ContributionDaily,
    ]),
    AnalyticsModule,
  ],
  controllers: [GuildRankController],
  providers: [GuildRankService],
  exports: [GuildRankService],
})
export class GuildRankModule {}
