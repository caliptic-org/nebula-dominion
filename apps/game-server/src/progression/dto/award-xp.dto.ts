import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { XpSource } from '../config/level-config';

/**
 * Body for POST /api/progression/award-xp.
 *
 * `referenceId` is REQUIRED (audit fix S4 + F4-econ). Previously
 * @IsOptional, which meant the same caller could submit the same
 * (userId, source) over and over with NULL referenceId — no UNIQUE
 * row in xp_transactions stopped them. Now every grant must declare
 * its origin (mission:abc123, building:xyz, training:..., pvp:battleId,
 * tutorial_complete, etc.) and the DB enforces UNIQUE(user_id, source,
 * reference_id), so a re-tap returns "already credited" without
 * granting again.
 *
 * Callers that genuinely had no natural reference (e.g. legacy
 * fire-and-forget telemetry events) must mint one: a UUID v4, a
 * `<feature>:<entityId>` slug, or even `auto:<timestamp>` — anything
 * deterministic per logical event. NULL is no longer accepted.
 */
export class AwardXpDto {
  @IsString()
  userId: string;

  @IsEnum(XpSource)
  source: XpSource;

  // 1-255 chars; matches the VARCHAR(255) column. MinLength(1) rejects
  // empty strings which Postgres would otherwise treat as distinct from
  // NULL but functionally equivalent to "no reference".
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  referenceId: string;
}
