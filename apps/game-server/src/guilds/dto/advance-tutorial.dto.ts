import { IsEnum } from 'class-validator';
import { TutorialStep } from '../entities/guild-tutorial-state.entity';

export class AdvanceTutorialDto {
  @IsEnum(TutorialStep)
  toStep: TutorialStep;
}
