import { Module } from '@nestjs/common';
import { FormationsController } from './formations.controller';
import { FormationsService } from './formations.service';

/* Minimal Formations module stub.
 *
 * The web `/formation` screen consumes three endpoints — `/formations`,
 * `/formations/templates`, `/units/player/:id` — that didn't exist in the
 * api yet. Without them the screen would 404 three times on every visit,
 * showing the swallowed empty-state but logging noisy network errors.
 *
 * The list/save/template endpoints still use the in-memory store on the
 * controller; FormationsService is currently only responsible for
 * `POST /formations/power` (server-authoritative power calc that reads
 * the game-server-owned `player_units` + `player_commanders` tables
 * via raw SQL). When the real formation persistence ships, the list /
 * save endpoints move into the service too.
 */
@Module({
  controllers: [FormationsController],
  providers: [FormationsService],
})
export class FormationsModule {}
