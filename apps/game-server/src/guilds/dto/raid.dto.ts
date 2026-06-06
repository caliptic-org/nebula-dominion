import { IsInt, IsString, IsUUID, Max, Min } from 'class-validator';

/**
 * Raid attack payload (HIGH ECON-CYC6-02 — audit cycle 6 fix).
 *
 * Previously this DTO had only `@IsInt @Min(1)` on `damage`, so a player
 * could POST `{damage: 999999999}` and one-shot any raid boss — even
 * after the cycle 3 buff multiplier kicked in. The route was also gated
 * by HttpJwtGuard, meaning any logged-in player was an accepted caller.
 *
 * The endpoint is now flagged **internal-service only** (see
 * `GuildsController.attackRaid` — `@UseGuards(InternalServiceGuard)`).
 * The real damage value MUST be recomputed server-side from the
 * attacker's unit stats by whichever battle-resolution path actually
 * triggers the raid hit (PvE finishGame, BossService.attackBoss, or a
 * future GuildRaidBattleService). That caller signs the request with
 * `X-Internal-Service: Bearer <secret>` and asserts which user to
 * credit via `userId` in this body — the player's JWT subject is no
 * longer trusted as the source of identity because there is no player
 * JWT on internal-service calls.
 *
 * The `@Max(1_000_000)` on `damage` is defense-in-depth: a leaked
 * internal-service secret still can't one-shot bosses in a single POST.
 * Honest battle resolvers produce raw-damage values in the thousands at
 * most; 1M leaves four orders of magnitude of headroom.
 */
export class RaidAttackDto {
  /**
   * The acting user the internal caller is asserting damage for. This
   * MUST be set by the trusted backend caller — it is NOT the player's
   * own JWT `sub`, because internal-service callers don't carry one.
   */
  @IsString()
  @IsUUID()
  userId: string;

  /**
   * Server-computed raw damage (pre-buff). Capped at 1M as a hard
   * sanity ceiling — see class JSDoc.
   */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  damage: number;
}
