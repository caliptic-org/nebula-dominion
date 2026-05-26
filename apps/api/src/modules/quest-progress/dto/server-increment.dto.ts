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
