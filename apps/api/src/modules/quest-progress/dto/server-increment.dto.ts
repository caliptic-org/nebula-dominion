import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

/**
 * Payload for the server-to-server (game-server → api) increment call.
 *
 * Same shape as `IncrementProgressDto` plus the `userId` field — game-server
 * is the one that knows the canonical player id for a battle / building
 * event, so the api side doesn't need a JWT here. If/when we add an
 * internal-service shared secret guard, it lands as a `@UseGuards(...)`
 * on the controller without changing the wire contract.
 */
export class ServerIncrementProgressDto {
  @IsString()
  @MaxLength(64)
  userId: string;

  @IsString()
  @MaxLength(80)
  questId: string;

  // Capped at 50 — even legitimate game events (battle ends with N kills,
  // building completes) almost never need to bump a counter by more than
  // a handful. The previous Max(1000) was overly generous; the audit
  // (workflow wf_cea4d7f7-3f1, B1) flagged it as a fast-progression vector
  // alongside the (now-fixed) IDOR. game-server's notifier never sends
  // amounts above 5 in practice.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
