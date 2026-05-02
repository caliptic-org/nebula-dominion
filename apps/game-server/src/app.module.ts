import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { GameModule } from './game/game.module';
import { AntiCheatModule } from './anti-cheat/anti-cheat.module';
import { HealthModule } from './health/health.module';
import { ProgressionModule } from './progression/progression.module';
import { ChatModule } from './chat/chat.module';
import { PlayerLevel } from './progression/entities/player-level.entity';
import { XpTransaction } from './progression/entities/xp-transaction.entity';
import { ChatMessage } from './chat/entities/chat-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [PlayerLevel, XpTransaction, ChatMessage],
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
      }),
    }),
    AuthModule,
    PlayersModule,
    ResourcesModule,
    BuildingsModule,
    WorkersModule,
    MatchmakingModule,
    GameModule,
    AntiCheatModule,
    HealthModule,
    ProgressionModule,
    ChatModule,
  ],
})
export class AppModule {}
