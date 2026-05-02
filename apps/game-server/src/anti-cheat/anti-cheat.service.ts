import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameRoom, GameStatus } from '../game/room.service';
import { ActionType, GameActionDto } from '../game/dto/game-action.dto';

interface RateBucket {
  count: number;
  windowStart: number;
}

@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);
  private readonly rateBuckets = new Map<string, RateBucket>();
  private readonly maxActionsPerSecond: number;

  constructor(private readonly config: ConfigService) {
    this.maxActionsPerSecond = config.get<number>('game.maxActionsPerSecond', 10);
    // Prune stale buckets every minute to prevent memory growth
    setInterval(() => this.pruneRateBuckets(), 60_000);
  }

  /**
   * Returns a violation reason string if the action is invalid, or null if valid.
   */
  validate(userId: string, dto: GameActionDto, room: GameRoom): string | null {
    // 1. Rate limiting — prevents action spam / bot behaviour
    if (!this.checkRate(userId)) {
      this.logger.warn(`Rate limit exceeded: userId=${userId}`);
      return 'Rate limit exceeded';
    }

    // 2. Player must be in the room
    const player = room.players[userId];
    if (!player) return 'Not a player in this room';

    // 3. Game must be active
    if (room.status !== GameStatus.IN_PROGRESS) return 'Game is not in progress';

    // 4. Duplicate sequence number guard (replay attack prevention)
    if (dto.sequenceNumber >= 0 && dto.sequenceNumber <= player.lastActionSequence) {
      this.logger.warn(`Duplicate sequence from ${userId}: seq=${dto.sequenceNumber} last=${player.lastActionSequence}`);
      return 'Duplicate or out-of-order action';
    }

    // 5. Turn enforcement for offensive actions
    const turnRequired = [
      ActionType.ATTACK,
      ActionType.MOVE_UNIT,
      ActionType.USE_ABILITY,
      ActionType.MERGE_UNITS,
      ActionType.MUTATE_UNIT,
      ActionType.END_TURN,
    ];
    if (turnRequired.includes(dto.type) && room.currentPlayerId !== userId) {
      return 'Not your turn';
    }

    // 6. Payload sanity: prevent oversized payloads
    if (dto.payload) {
      const size = JSON.stringify(dto.payload).length;
      if (size > 4096) return 'Payload too large';
    }

    return null;
  }

  private checkRate(userId: string): boolean {
    const now = Date.now();
    let bucket = this.rateBuckets.get(userId);

    if (!bucket || now - bucket.windowStart >= 1000) {
      bucket = { count: 1, windowStart: now };
    } else {
      bucket.count++;
    }

    this.rateBuckets.set(userId, bucket);
    return bucket.count <= this.maxActionsPerSecond;
  }

  private pruneRateBuckets(): void {
    const cutoff = Date.now() - 5000;
    for (const [key, bucket] of this.rateBuckets) {
      if (bucket.windowStart < cutoff) this.rateBuckets.delete(key);
    }
  }
}
