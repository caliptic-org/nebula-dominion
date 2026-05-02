import { Inject, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const InjectRedis = () => Inject(REDIS_CLIENT);

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService): Redis => {
    return new Redis(config.get<string>('redisUrl', 'redis://localhost:6379'), {
      maxRetriesPerRequest: 3,
    });
  },
  inject: [ConfigService],
};
