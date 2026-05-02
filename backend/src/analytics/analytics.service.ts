import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsEvent } from './entities/event.entity';

export interface ServerEventPayload {
  event_type: string;
  user_id: string;
  session_id: string;
  race?: string;
  tier_age?: number;
  tier_level?: number;
  vip_level?: number;
  app_version?: string;
  properties?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepo: Repository<AnalyticsEvent>,
  ) {}

  async track(dto: TrackEventDto): Promise<void> {
    await this.persist([dto]);
  }

  async trackBatch(dtos: TrackEventDto[]): Promise<void> {
    if (dtos.length === 0) return;
    await this.persist(dtos);
  }

  // Called from other services (server-side events, no client_ts)
  async trackServer(payload: ServerEventPayload): Promise<void> {
    try {
      const event = this.eventRepo.create({
        event_type: payload.event_type,
        user_id: payload.user_id,
        session_id: payload.session_id,
        race: payload.race ?? null,
        tier_age: payload.tier_age ?? null,
        tier_level: payload.tier_level ?? null,
        vip_level: payload.vip_level ?? null,
        app_version: payload.app_version ?? null,
        client_ts: null,
        properties: payload.properties ?? {},
      });
      await this.eventRepo.save(event);
    } catch (err) {
      // Analytics must never break the calling service
      this.logger.error(`Failed to persist server event ${payload.event_type}`, err);
    }
  }

  private async persist(dtos: TrackEventDto[]): Promise<void> {
    try {
      const entities = dtos.map((dto) =>
        this.eventRepo.create({
          event_type: dto.event_type,
          user_id: dto.user_id,
          session_id: dto.session_id,
          race: dto.race ?? null,
          tier_age: dto.tier_age ?? null,
          tier_level: dto.tier_level ?? null,
          vip_level: dto.vip_level ?? null,
          device: dto.device ?? null,
          app_version: dto.app_version ?? null,
          client_ts: dto.client_ts ? new Date(dto.client_ts) : null,
          properties: dto.properties ?? {},
        }),
      );
      await this.eventRepo.save(entities);
    } catch (err) {
      this.logger.error(`Failed to persist ${dtos.length} analytics event(s)`, err);
      throw err;
    }
  }
}
