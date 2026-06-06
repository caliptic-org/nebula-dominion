import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MissionType } from '../entities/mission-claim.entity';

/**
 * Mission claim request.
 *
 * Previously this DTO carried a `reward: ClaimRewardDto` field that the
 * controller forwarded straight through to the wallet grant. A live
 * playtest showed lv1→14 in 31 calls by passing `reward.xp: 50000` for
 * arbitrary mission IDs. The fix is structural: the client can no
 * longer specify reward amounts — the service looks them up in the
 * server-side `missions.catalog.ts`. The shape is intentionally minimal
 * (id + type) so any future request fields go through DTO validation
 * with explicit intent.
 *
 * Backward compat: older clients still POSTing a `reward` payload have
 * it stripped by the global ValidationPipe (`whitelist: true` is set in
 * main.ts) — no 400, the legacy field is just ignored.
 */
export class ClaimMissionDto {
  @ApiProperty({ description: 'Mission id from the FE / server catalog', example: 'story-2' })
  @IsString()
  missionId: string;

  @ApiProperty({
    description: 'Mission category',
    enum: ['story', 'weekly', 'achievement', 'daily'],
  })
  @IsString()
  @IsIn(['story', 'weekly', 'achievement', 'daily'])
  missionType: MissionType;
}

/**
 * Server-internal reward shape returned from
 * `missions.catalog.resolveMissionReward()`. The service result type
 * and the mission_claims `rewardJson` column both reference it. Kept
 * here (not just in the catalog file) so consumers don't have to import
 * an additional module for a value-shape type.
 */
export interface CanonicalReward {
  gold?: number;
  gems?: number;
  xp?: number;
}
