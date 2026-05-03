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

export class ResearchContributeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsInt()
  @Min(1)
  xp: number;
}
