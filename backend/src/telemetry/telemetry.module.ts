import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunnelEvent } from './entities/funnel-event.entity';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [TypeOrmModule.forFeature([FunnelEvent])],
  controllers: [TelemetryController],
  providers: [TelemetryService, ApiKeyGuard, RateLimitGuard],
  exports: [TelemetryService],
})
export class TelemetryModule {}
