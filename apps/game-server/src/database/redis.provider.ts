import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const InjectRedis = () => Inject(REDIS_CLIENT);

@Injectable()
class RedisClient extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly config: ConfigService) {
    super(config.get<string>('redisUrl', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useClass: RedisClient,
};
