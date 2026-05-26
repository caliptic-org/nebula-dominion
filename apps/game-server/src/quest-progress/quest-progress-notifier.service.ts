import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin HTTP client that fires off quest-progress increments to the main api.
 *
 * Design choices:
 *   - Fire-and-forget: callers MUST NOT await network success. Any failure is
 *     swallowed + logged. A missed increment is acceptable; a game action
 *     that fails because the missions service is down is not.
 *   - Idempotency: the caller supplies an `idempotencyKey` derived from the
 *     natural event id (matchId for battles, buildingId for buildings) so
 *     duplicate calls in the same process collapse into a single bump on
 *     the api side. The api's process-local dedupe ring is best-effort;
 *     callers SHOULD also avoid calling twice for the same event.
 *   - Endpoint: `${API_BASE_URL}/api/v1/quest-progress/increment`. Defaults
 *     to http://localhost:4000 (the api's default port; see
 *     apps/api/src/main.ts). Override via API_BASE_URL env var.
 *
 * Bot players (userId starts with 'bot:') are skipped — bots don't have
 * an account on the api side and we'd just generate noise rows.
 */
@Injectable()
export class QuestProgressNotifier {
  private readonly logger = new Logger(QuestProgressNotifier.name);
  private readonly apiBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const raw = process.env.API_BASE_URL || this.config.get<string>('apiBaseUrl') || 'http://localhost:4000';
    this.apiBaseUrl = raw.replace(/\/+$/, '');
  }

  /**
   * Schedule an increment without blocking the caller.
   *
   * The promise is intentionally unawaited at call sites. Errors are
   * logged here so they never bubble up to game-server request handlers.
   */
  notify(userId: string, questId: string, idempotencyKey?: string, amount = 1): void {
    if (!userId || userId.startsWith('bot:')) {
      // Bots have no missions / accounts on the api side.
      return;
    }

    const url = `${this.apiBaseUrl}/api/v1/quest-progress/increment`;
    const body = {
      userId,
      questId,
      amount,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };

    // Native fetch (Node 18+). Wrapped in an immediately-invoked async
    // arrow so we can swallow errors WITHOUT making the outer call async.
    (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          this.logger.warn(
            `quest-progress increment HTTP ${res.status} userId=${userId} questId=${questId}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `quest-progress increment failed userId=${userId} questId=${questId}: ${(err as Error).message}`,
        );
      }
    })();
  }
}
