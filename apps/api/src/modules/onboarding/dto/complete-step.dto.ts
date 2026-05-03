import { IsString, IsOptional } from 'class-validator';

export class CompleteStepDto {
  @IsString()
  userId: string;

  @IsString()
  stepId: string;

  @IsOptional()
  @IsString()
  selectedRace?: string;
}
