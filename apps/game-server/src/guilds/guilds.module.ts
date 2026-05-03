import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guild } from './entities/guild.entity';
import { GuildMember } from './entities/guild-member.entity';
import { GuildEvent } from './entities/guild-event.entity';
import { GuildTutorialState } from './entities/guild-tutorial-state.entity';
import { GuildsService } from './guilds.service';
import { GuildsController } from './guilds.controller';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guild, GuildMember, GuildEvent, GuildTutorialState]),
    ResourcesModule,
  ],
  providers: [GuildsService],
  controllers: [GuildsController],
  exports: [GuildsService],
})
export class GuildsModule {}
