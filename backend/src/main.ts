import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AnalyticsService } from './analytics/analytics.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { initSentry } from './common/sentry.init';

async function bootstrap() {
  // Must run before NestFactory so Sentry captures bootstrap errors too
  initSentry();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global crash filter — resolves AnalyticsService from DI container
  const analyticsService = app.get(AnalyticsService);
  app.useGlobalFilters(new AllExceptionsFilter(analyticsService));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nebula Dominion API')
    .setDescription('Nebula Dominion REST API — battle engine, shop, events, analytics')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('battles')
    .addTag('shop')
    .addTag('analytics')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Battle API listening on port ${port}`);
  logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
