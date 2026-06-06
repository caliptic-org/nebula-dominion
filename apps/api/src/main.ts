import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  /**
   * Trust proxy configuration — REQUIRED for accurate client IP detection.
   *
   * Deploy topology (see CLAUDE.md):
   *   Cloudflare Tunnel → bastion nginx (10.10.10.10) → api container
   *
   * Without `trust proxy`, Express reports `req.ip` as the nginx upstream
   * peer (a single LXC bridge address), which means every external client
   * collapses into the same IP. This destroys @nestjs/throttler's per-IP
   * rate-limiting (cycle 3 added a 5/min global limit on auth endpoints) —
   * one attacker would exhaust the bucket for every legitimate user, and
   * brute-force defenses become useless.
   *
   * We trust ONLY the bastion nginx IP (10.10.10.10/32) and localhost
   * (for local dev / health checks). Trusting `true` or `'loopback'` alone
   * would allow public clients to spoof X-Forwarded-For from the open
   * internet — we explicitly do not.
   *
   * After this setting, Express parses X-Forwarded-For from trusted hops
   * and exposes the real client IP via `req.ip` (and the full chain via
   * `req.ips`). The default ThrottlerStorage keyer uses `req.ip`, so the
   * rate-limit buckets become per-client as intended.
   */
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', '10.10.10.10/32, 127.0.0.1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const corsOrigins = process.env.CORS_ORIGINS;
  if (process.env.NODE_ENV === 'production' && !corsOrigins) {
    throw new Error('CORS_ORIGINS must be set in production');
  }
  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',') : ['http://localhost:3010', 'http://localhost:3000'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nebula Dominion API')
    .setDescription('Nebula Dominion Game Backend API - v5 (Age 5 / Subspace / Premium Shop)')
    .setVersion('5.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Nebula Dominion API running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
