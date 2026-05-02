import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CompleteStepDto } from './dto/complete-step.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('steps')
  getSteps() {
    return this.service.getTutorialSteps();
  }

  @Get('progress/:userId')
  getProgress(@Param('userId') userId: string) {
    return this.service.getTutorialSummary(userId);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  startTutorial(@Body('userId') userId: string) {
    return this.service.startTutorial(userId);
  }

  @Post('step/complete')
  @HttpCode(HttpStatus.OK)
  completeStep(@Body() dto: CompleteStepDto) {
    return this.service.completeStep(dto);
  }

  @Post('skip/:userId')
  @HttpCode(HttpStatus.OK)
  skipTutorial(@Param('userId') userId: string) {
    return this.service.skipTutorial(userId);
  }
}
