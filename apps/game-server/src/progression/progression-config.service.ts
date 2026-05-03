import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XpThresholdConfig } from './entities/xp-threshold-config.entity';
import { XP_BASE_AMOUNTS, XpSource } from './config/level-config';

@Injectable()
export class ProgressionConfigService {
  private readonly logger = new Logger(ProgressionConfigService.name);

  constructor(
    @Optional()
    @InjectRepository(XpThresholdConfig)
    private readonly rawRepo: Repository<XpThresholdConfig> | undefined,
  ) {}

  async reloadFromDb(): Promise<{ success: boolean; reason?: string }> {
    if (!this.rawRepo) {
      return { success: false, reason: 'xp_threshold_config repository not registered' };
    }

    try {
      const rows = await this.rawRepo.find();
      for (const row of rows) {
        const source = row.source as XpSource;
        if (source in XP_BASE_AMOUNTS) {
          XP_BASE_AMOUNTS[source] = row.baseAmount;
        }
      }
      this.logger.log(`XP threshold config reloaded: ${rows.length} entries`);
      return { success: true };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to reload xp_threshold_config: ${reason}`);
      return { success: false, reason };
    }
  }
}
