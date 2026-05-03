import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AGE_XP_THRESHOLDS } from './level-config';

export interface AgeThresholdConfig {
  age: number;
  xpStart: number;
  xpEnd: number;
  f2pDaysFrom: number;
  f2pDaysTo: number;
}

/**
 * Manages XP threshold configuration with hot-reload support.
 * On startup, compiled defaults from level-config.ts are used.
 * Call reloadFromDb() to apply DB overrides without restart.
 */
@Injectable()
export class ProgressionConfigService {
  private readonly logger = new Logger(ProgressionConfigService.name);

  // In-memory cache: age → threshold config
  private thresholds: Map<number, AgeThresholdConfig> = new Map();

  constructor(
    @Optional()
    @InjectEntityManager()
    private readonly entityManager?: EntityManager,
  ) {
    this.loadDefaults();
  }

  private loadDefaults(): void {
    for (const [age, cfg] of Object.entries(AGE_XP_THRESHOLDS)) {
      const ageNum = Number(age);
      this.thresholds.set(ageNum, {
        age: ageNum,
        xpStart: cfg.start,
        xpEnd: cfg.end,
        f2pDaysFrom: cfg.f2pDaysFrom,
        f2pDaysTo: cfg.f2pDaysTo,
      });
    }
    this.logger.log('Loaded default XP thresholds from compiled config');
  }

  getThreshold(age: number): AgeThresholdConfig {
    const cfg = this.thresholds.get(age);
    if (!cfg) {
      throw new Error(`No XP threshold configured for age ${age}`);
    }
    return cfg;
  }

  getAllThresholds(): AgeThresholdConfig[] {
    return Array.from(this.thresholds.values()).sort((a, b) => a.age - b.age);
  }

  /**
   * Reloads thresholds from the xp_threshold_config DB table.
   * Rows missing from DB keep their compiled defaults.
   * Safe to call at runtime — updates are atomic via Map swap.
   */
  async reloadFromDb(): Promise<{ success: boolean; reason?: string }> {
    if (!this.entityManager) {
      this.logger.warn('No entity manager injected; skipping DB reload');
      return { success: false, reason: 'No entity manager available' };
    }

    try {
      const rows: Array<{
        age: number;
        xp_start: number;
        xp_end: number;
        f2p_days_from: number;
        f2p_days_to: number;
      }> = await this.entityManager.query('SELECT age, xp_start, xp_end, f2p_days_from, f2p_days_to FROM xp_threshold_config WHERE active = true ORDER BY age');

      const updated = new Map<number, AgeThresholdConfig>(this.thresholds);
      for (const row of rows) {
        updated.set(row.age, {
          age: row.age,
          xpStart: row.xp_start,
          xpEnd: row.xp_end,
          f2pDaysFrom: row.f2p_days_from,
          f2pDaysTo: row.f2p_days_to,
        });
      }
      this.thresholds = updated;
      this.logger.log(`Hot-reloaded XP thresholds from DB: ${rows.length} overrides applied`);
      return { success: true };
    } catch (err) {
      this.logger.error('Failed to reload XP thresholds from DB', err);
      return { success: false, reason: String(err) };
    }
  }
}
