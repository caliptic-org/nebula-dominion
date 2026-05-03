import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuildInactiveMarker } from './entities/guild-inactive-marker.entity';
import { Guild } from '../guild/entities/guild.entity';
import { GuildMember } from '../guild/entities/guild-member.entity';
import { InactiveGuardController } from './inactive-guard.controller';
import { InactiveGuardService } from './inactive-guard.service';

@Module({
  imports: [TypeOrmModule.forFeature([GuildInactiveMarker, Guild, GuildMember])],
  controllers: [InactiveGuardController],
  providers: [InactiveGuardService],
  exports: [InactiveGuardService],
})
export class InactiveGuardModule {}
