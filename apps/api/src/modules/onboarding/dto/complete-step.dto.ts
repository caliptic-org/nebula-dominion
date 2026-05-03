import { IsString, IsOptional } from 'class-validator';

export class CompleteStepDto {
  @IsString()
  stepId: string;

  @IsOptional()
  @IsString()
  selectedRace?: string;
}
