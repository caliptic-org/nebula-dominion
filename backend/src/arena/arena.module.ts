import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArenaPlayerStats } from './entities/arena-player-stats.entity';
import { ArenaMatch } from './entities/arena-match.entity';
import { ArenaController } from './arena.controller';
import { ArenaService } from './arena.service';
import { RedisModule } from '../redis/redis.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GuildModule } from '../guild/guild.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArenaPlayerStats, ArenaMatch]),
    RedisModule,
    AnalyticsModule,
    GuildModule,
  ],
  controllers: [ArenaController],
  providers: [ArenaService],
  exports: [ArenaService],
})
export class ArenaModule {}
