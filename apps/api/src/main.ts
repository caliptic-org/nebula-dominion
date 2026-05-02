import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const config = app.get(ConfigService);

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = config.get<string[]>('cors.origins', ['http://localhost:3000']);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  if (config.get<boolean>('swagger.enabled', true)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nebula Dominion API')
      .setDescription('REST API for the Nebula Dominion strategy game')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('games', 'Game sessions')
      .addTag('buildings', 'Building construction and management')
      .addTag('resources', 'Resource management')
      .addTag('units', 'Unit training and management')
      .addTag('health', 'Health checks')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log('Swagger docs available at /api/docs');
  }

  const port = config.get<number>('port', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`API server listening on port ${port}`);

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
