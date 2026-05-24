import { Module } from '@nestjs/common';
import { FormationsController } from './formations.controller';

/* Minimal Formations module stub.
 *
 * The web `/formation` screen consumes three endpoints — `/formations`,
 * `/formations/templates`, `/units/player/:id` — that didn't exist in the
 * api yet. Without them the screen would 404 three times on every visit,
 * showing the swallowed empty-state but logging noisy network errors.
 *
 * This stub returns empty collections + a static template list so the
 * screen renders cleanly and the network tab stays quiet. When the real
 * formation persistence ships, swap the controller body for the service.
 */
@Module({
  controllers: [FormationsController],
})
export class FormationsModule {}
