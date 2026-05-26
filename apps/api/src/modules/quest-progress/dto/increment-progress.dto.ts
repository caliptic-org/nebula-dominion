import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

/**
 * Payload for POST /api/v1/quest-progress/increment.
 *
 * - `questId` matches the symbolic id in the missions catalog (e.g.
 *   'battles_won'). Hard cap at 80 chars so a stray runaway string can't
 *   bloat the index.
 * - `amount` defaults to 1; capped to keep a single faulty caller from
 *   completing every quest in one shot.
 * - `idempotencyKey` is OPTIONAL but recommended: when present the same key
 *   is rejected as a no-op on the second call (per quest). Use the natural
 *   event id — `battle:<matchId>` or `building:<buildingId>` — so two calls
 *   for the same event don't double-count.
 */
export class IncrementProgressDto {
  @IsString()
  @MaxLength(80)
  questId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
