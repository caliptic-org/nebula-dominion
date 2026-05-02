import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { GameState } from '../game-state/entities/game-state.entity';
import { PlayerScore } from '../scoreboard/entities/player-score.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const db = config.get('database');
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          ssl: db.ssl ? { rejectUnauthorized: false } : false,
          entities: [User, GameState, PlayerScore],
          // Migrations are managed separately — never auto-synchronize in production
          synchronize: process.env.NODE_ENV !== 'production',
          migrationsRun: false,
          logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
          // PgBouncer-compatible pool settings
          // PgBouncer manages the actual DB connections; TypeORM pool should be small
          extra: {
            // Pool config passed to node-postgres (pg)
            min: db.poolMin,
            max: db.poolMax,
            idleTimeoutMillis: db.poolIdleTimeoutMs,
            connectionTimeoutMillis: db.poolConnectionTimeoutMs,
            // Required for PgBouncer transaction-pooling mode:
            // session-level state (prepared statements, SET commands) persists
            // per PgBouncer client session, not per backend connection.
            statement_timeout: db.statementTimeout,
            lock_timeout: 10000,
            application_name: 'nebula-dominion-api',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
