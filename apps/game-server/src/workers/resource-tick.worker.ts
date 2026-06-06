import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ResourcesService } from '../resources/resources.service';
import { BuildingsService } from '../buildings/buildings.service';
import { UnitsService } from '../units/units.service';
import { GalaxyMapService } from '../map/galaxy-map.service';

@Injectable()
export class ResourceTickWorker {
  private readonly logger = new Logger(ResourceTickWorker.name);
  private isRunning = false;

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly buildingsService: BuildingsService,
    private readonly unitsService: UnitsService,
    private readonly galaxyMapService: GalaxyMapService,
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

      const completedUnits = await this.unitsService.completeTraining();
      if (completedUnits > 0) {
        this.logger.log(`Completed ${completedUnits} training queue entry(ies) this tick.`);
      }

      // Apply resource income from garrisoned galaxy nodes (mineral + gas + science)
      const incomeResults = await this.galaxyMapService.processNodeIncome();
      for (const { userId, mineral, gas, science } of incomeResults) {
        try {
          await this.resourcesService.grant(userId, { mineral, gas, science });
        } catch (err) {
          this.logger.error(
            `Failed to apply node income for player ${userId}: ${(err as Error).message}`,
          );
        }
      }
      if (incomeResults.length > 0) {
        this.logger.log(`Applied galaxy node income to ${incomeResults.length} player(s) this tick.`);
      }

      // Bulk-tick all actively-producing players in a single UPDATE.
      // Replaces a per-player for-of loop (2 queries each → ~2000 queries
      // at 1000 active producers) with one round-trip. The partial index
      // idx_player_resources_active (migration 1779850000000) makes the
      // WHERE filter index-only at scale.
      const processed = await this.resourcesService.applyTickBulk();

      const elapsed = Date.now() - startMs;
      this.logger.debug(`Resource tick completed: ${processed} players in ${elapsed}ms`);
    } catch (err) {
      this.logger.error(`Resource tick error: ${(err as Error).message}`, (err as Error).stack);
    } finally {
      this.isRunning = false;
    }
  }
}
