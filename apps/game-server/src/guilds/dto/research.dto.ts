import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class StartResearchDto {
  @IsString()
  @IsNotEmpty()
  researchId: string;

  @IsInt()
  @Min(1)
  level: number;

  @IsString()
  @IsNotEmpty()
  selectedBy: string;
}

// userId field removed (P5-S1 security fix): trusting dto.userId let an
// attacker burn another player's XP into a guild research bucket. The
// contributor is now taken from the JWT subject claim in
// GuildsController.contributeResearch.

export class ResearchContributeDto {
  @IsInt()
  @Min(1)
  xp: number;
}
