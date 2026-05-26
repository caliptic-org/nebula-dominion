import { Global, Module } from '@nestjs/common';
import { QuestProgressNotifier } from './quest-progress-notifier.service';

/**
 * Quest progress notifier module.
 *
 * Marked `@Global` so the notifier is injectable from any feature module
 * (GameService for battle completions, BuildingsService for building
 * completions, …) without each of them importing this module explicitly.
 * The service has no DB / Redis deps so global scope is safe.
 */
@Global()
@Module({
  providers: [QuestProgressNotifier],
  exports: [QuestProgressNotifier],
})
export class QuestProgressModule {}
