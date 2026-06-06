import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class StartResearchDto {
  @IsString()
  @IsNotEmpty()
  researchId: string;

  @IsInt()
  @Min(1)
  level: number;
}

// selectedBy field removed (C4-5 security fix): trusting dto.selectedBy
// let an attacker forge research-attribution metadata by posting another
// player's userId as the "initiator" of a guild research track. The
// initiator is now taken from the JWT subject claim in
// GuildsController.startResearch.
//
// userId field removed (P5-S1 security fix): trusting dto.userId let an
// attacker burn another player's XP into a guild research bucket. The
// contributor is now taken from the JWT subject claim in
// GuildsController.contributeResearch.
//
// xp @Max(100_000) added (C6-04 economy fix): contribute() previously
// accepted any positive integer and clamped to xpRequired-xpContributed,
// so a single POST {xp: 9_999_999} could finish an entire research level
// in one call AND mint contribution_pts proportionally — with no debit
// from the player's wallet. The DTO ceiling is the cheap front-line:
// the server-side balance check in guild-research.service.contribute()
// is the authoritative guard.

export class ResearchContributeDto {
  @IsInt()
  @Min(1)
  @Max(100_000)
  xp: number;
}
