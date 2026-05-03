import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guild } from './entities/guild.entity';
import { GuildMember } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { GuildMute } from './entities/guild-mute.entity';
import { GuildReport } from './entities/guild-report.entity';
import { DonateRequest } from './entities/donate-request.entity';
import { DonateFulfillment } from './entities/donate-fulfillment.entity';
import { ContributionDaily } from './entities/contribution-daily.entity';
import { ProfanityWord } from './entities/profanity-word.entity';
import { ResourceConfig } from '../resources/entities/resource-config.entity';
import { PlayerResource } from '../resources/entities/player-resource.entity';
import { PlayerProgression } from '../progression/entities/player-progression.entity';
import { PlayerPower } from '../stats/entities/player-power.entity';
import { GuildMembershipService } from './guild-membership.service';
import { GuildSuggestionService } from './guild-suggestion.service';
import { GuildSuggestionController } from './guild-suggestion.controller';
import { ProfanityService } from './profanity.service';
import { ContributionService } from './contribution.service';
import { GuildChatService } from './guild-chat.service';
import { GuildChatGateway } from './guild-chat.gateway';
import { GuildChatController } from './guild-chat.controller';
import { GuildModerationService } from './guild-moderation.service';
import { GuildModerationController } from './guild-moderation.controller';
import { GuildDonateService } from './guild-donate.service';
import { GuildDonateController } from './guild-donate.controller';
import { ResourcesModule } from '../resources/resources.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Guild,
      GuildMember,
      GuildEvent,
      ChatMessage,
      GuildMute,
      GuildReport,
      DonateRequest,
      DonateFulfillment,
      ContributionDaily,
      ProfanityWord,
      ResourceConfig,
      PlayerResource,
      PlayerProgression,
      PlayerPower,
    ]),
    ResourcesModule,
    AnalyticsModule,
  ],
  providers: [
    GuildMembershipService,
    GuildSuggestionService,
    ProfanityService,
    ContributionService,
    GuildChatService,
    GuildChatGateway,
    GuildModerationService,
    GuildDonateService,
  ],
  controllers: [
    GuildChatController,
    GuildModerationController,
    GuildDonateController,
    GuildSuggestionController,
  ],
  exports: [
    GuildMembershipService,
    GuildSuggestionService,
    GuildChatService,
    GuildDonateService,
    ContributionService,
  ],
})
export class GuildModule {}
