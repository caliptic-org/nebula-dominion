import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private allowedOrigins: string[];

  setAllowedOrigins(origins: string[]): void {
    this.allowedOrigins = origins;
  }

  async connectToRedis(redisUrl: string): Promise<void> {
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => pubClient.once('ready', resolve).once('error', reject)),
      new Promise<void>((resolve, reject) => subClient.once('ready', resolve).once('error', reject)),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.allowedOrigins, methods: ['GET', 'POST'] },
      pingInterval: 10000,
      pingTimeout: 5000,
      transports: ['websocket', 'polling'],
    });
    server.adapter(this.adapterConstructor);
    return server;
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn'] });
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const redisUrl = config.get<string>('redisUrl', 'redis://localhost:6379');
  const corsOrigins = config.get<string[]>('cors.origins', ['http://localhost:3000']);

  const redisAdapter = new RedisIoAdapter(app);
  redisAdapter.setAllowedOrigins(corsOrigins);
  await redisAdapter.connectToRedis(redisUrl);
  app.useWebSocketAdapter(redisAdapter);

  const port = config.get<number>('port', 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`Game server listening on port ${port}`);

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
