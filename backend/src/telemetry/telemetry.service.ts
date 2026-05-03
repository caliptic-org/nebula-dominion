import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FunnelEvent } from './entities/funnel-event.entity';
import { FunnelEventDto } from './dto/ingest-events.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(FunnelEvent)
    private readonly eventRepo: Repository<FunnelEvent>,
  ) {}

  async ingestBatch(dtos: FunnelEventDto[]): Promise<{ inserted: number }> {
    const entities = dtos.map((dto) =>
      this.eventRepo.create({
        userId: dto.userId,
        sessionId: dto.sessionId,
        eventName: dto.eventName,
        properties: dto.properties ?? {},
        platform: dto.platform ?? null,
        device: dto.device ?? null,
        race: dto.race ?? null,
        era: dto.era ?? null,
        occurredAt: new Date(dto.occurredAt),
      }),
    );

    await this.eventRepo.insert(entities);
    this.logger.log(`Inserted ${entities.length} funnel events`);
    return { inserted: entities.length };
  }

  async getRetentionCohorts(): Promise<unknown[]> {
    return this.eventRepo.query(`
      SELECT
        cohort_date,
        cohort_size,
        day_number,
        active_users,
        retention_pct
      FROM v_cohort_retention
      ORDER BY cohort_date DESC, day_number
      LIMIT 200
    `);
  }

  async getOnboardingFunnel(): Promise<unknown[]> {
    return this.eventRepo.query(`
      SELECT step_order, step, started, completed, avg_time_spent_sec, completion_pct
      FROM v_onboarding_funnel
    `);
  }

  async getBattleLoadTimes(): Promise<unknown[]> {
    return this.eventRepo.query(`
      SELECT day, sample_count, p50_ms, p90_ms, p99_ms
      FROM v_battle_load_times
      LIMIT 90
    `);
  }
}
