import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface GameSession {
  userId: string;
  roomId: string;
  socketId: string;
  reconnectToken: string;
  connectedAt: number;
}

const SESSION_BY_USER = (uid: string) => `session:user:${uid}`;
const SESSION_BY_TOKEN = (token: string) => `session:token:${token}`;

@Injectable()
export class SessionService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(SessionService.name);
  private redis: Redis;
  private readonly ttl: number;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(config.get<string>('redisUrl', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
    this.ttl = config.get<number>('game.roomTtlSeconds', 3600) + 120;
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
  }

  async create(userId: string, roomId: string, socketId: string): Promise<string> {
    const reconnectToken = uuidv4();
    const session: GameSession = { userId, roomId, socketId, reconnectToken, connectedAt: Date.now() };
    const payload = JSON.stringify(session);

    const pipeline = this.redis.pipeline();
    pipeline.set(SESSION_BY_USER(userId), payload, 'EX', this.ttl);
    pipeline.set(SESSION_BY_TOKEN(reconnectToken), userId, 'EX', this.ttl);
    await pipeline.exec();

    return reconnectToken;
  }

  async getByUser(userId: string): Promise<GameSession | null> {
    const raw = await this.redis.get(SESSION_BY_USER(userId));
    return raw ? JSON.parse(raw) : null;
  }

  async getByToken(token: string): Promise<GameSession | null> {
    const userId = await this.redis.get(SESSION_BY_TOKEN(token));
    if (!userId) return null;
    return this.getByUser(userId);
  }

  async updateSocket(userId: string, socketId: string): Promise<void> {
    const session = await this.getByUser(userId);
    if (!session) return;
    session.socketId = socketId;
    await this.redis.set(SESSION_BY_USER(userId), JSON.stringify(session), 'KEEPTTL');
  }

  async delete(userId: string): Promise<void> {
    const session = await this.getByUser(userId);
    const pipeline = this.redis.pipeline();
    pipeline.del(SESSION_BY_USER(userId));
    if (session) pipeline.del(SESSION_BY_TOKEN(session.reconnectToken));
    await pipeline.exec();
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
