import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Battle } from './battle/entities/battle.entity';
import { BattleLog } from './battle/entities/battle-log.entity';
import { Unit } from './units/entities/unit.entity';
import { MutationRule } from './units/entities/mutation-rule.entity';
import { BattleModule } from './battle/battle.module';
import { StorageModule } from './storage/storage.module';
import { RedisModule } from './redis/redis.module';
import { UnitsModule } from './units/units.module';
import { BattleSchema1746100000000 } from './database/migrations/1746100000000-BattleSchema';
import { UnitsSchema1746200000000 } from './database/migrations/1746200000000-UnitsSchema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'nebula_dominion'),
        entities: [Battle, BattleLog, Unit, MutationRule],
        migrations: [BattleSchema1746100000000, UnitsSchema1746200000000],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    RedisModule,
    StorageModule,
    BattleModule,
    UnitsModule,
  ],
})
export class AppModule {}
