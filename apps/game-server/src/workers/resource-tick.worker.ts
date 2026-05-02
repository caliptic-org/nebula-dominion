import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../resources/entities/resource.entity';
import { ResourcesService } from '../resources/resources.service';
import { BuildingsService } from '../buildings/buildings.service';

@Injectable()
export class ResourceTickWorker {
  private readonly logger = new Logger(ResourceTickWorker.name);
  private isRunning = false;

  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    private readonly resourcesService: ResourcesService,
    private readonly buildingsService: BuildingsService,
  ) {}

  /** Runs every 30 seconds */
  @Cron('*/30 * * * * *')
  async handleResourceTick(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Resource tick still running — skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startMs = Date.now();

    try {
      const completed = await this.buildingsService.completeOverdueConstructions();
      if (completed > 0) {
        this.logger.log(`Completed ${completed} construction(s) this tick.`);
      }

      const playerIds = await this.getActivePlayerIds();
      if (playerIds.length === 0) return;

      let processed = 0;
      for (const playerId of playerIds) {
        try {
          await this.resourcesService.applyTick(playerId);
          processed++;
        } catch (err) {
          this.logger.error(`Failed to apply tick for player ${playerId}: ${(err as Error).message}`);
        }
      }

      const elapsed = Date.now() - startMs;
      this.logger.debug(`Resource tick completed: ${processed}/${playerIds.length} players in ${elapsed}ms`);
    } catch (err) {
      this.logger.error(`Resource tick error: ${(err as Error).message}`, (err as Error).stack);
    } finally {
      this.isRunning = false;
    }
  }

  private async getActivePlayerIds(): Promise<string[]> {
    const rows = await this.resourceRepo
      .createQueryBuilder('r')
      .select('r.player_id', 'playerId')
      .where('(r.mineral_per_tick > 0 OR r.gas_per_tick > 0 OR r.energy_per_tick > 0)')
      .getRawMany<{ playerId: string }>();

    return rows.map((r) => r.playerId);
  }
}
