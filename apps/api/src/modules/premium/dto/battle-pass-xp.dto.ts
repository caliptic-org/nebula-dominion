import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Payload for the server-to-server (game-server → api) battle-pass XP grant.
 *
 * Wires the audit fix (BLOCKER F1) for `POST /api/v1/premium/battle-pass/xp`.
 * The endpoint used to accept `{ xpAmount }` from a JWT-authenticated FE
 * call — a player could POST `{ xpAmount: 50000 }` and jump from tier 1
 * to 50 in a single request (XP_PER_TIER is 1000, max tier 50).
 *
 * Same shape rationale as `ServerIncrementProgressDto`: game-server knows
 * the canonical player id for a battle / quest event, so we accept it in
 * the body and gate the route behind `InternalServiceGuard` (shared
 * service secret, same pattern as `/quest-progress/increment`).
 *
 * Fields:
 *   - `userId`        target player (game-server-supplied)
 *   - `xpAmount`      raw amount — clamped further to [0, 1000] in the
 *                     service. The DTO ceiling of 1000 mirrors the
 *                     per-tier XP cost: even a perfect single source
 *                     can't push more than one tier worth in one call.
 *   - `source`        free-form tag for audit / per-source caps later
 *                     (`battle_win`, `daily_quest`, `boss_kill`, ...).
 *   - `referenceId`   MANDATORY — the natural id of the upstream event
 *                     (match id, quest claim id, boss instance id). Used
 *                     as the dedupe key so a retry / duplicate fire from
 *                     game-server can't double-credit the same source.
 */
export class ServerBattlePassXpDto {
  @IsString()
  @MaxLength(64)
  userId: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  xpAmount: number;

  @IsString()
  @MaxLength(40)
  source: string;

  @IsString()
  @MaxLength(120)
  referenceId: string;
}
