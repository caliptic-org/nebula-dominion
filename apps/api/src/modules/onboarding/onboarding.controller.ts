import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { CompleteStepDto } from './dto/complete-step.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InternalServiceGuard } from '../quest-progress/guards/internal-service.guard';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('steps')
  getSteps() {
    return this.service.getTutorialSteps();
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProgress(@Request() req: { user: { id: string } }) {
    return this.service.getTutorialSummary(req.user.id);
  }

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  startTutorial(@Request() req: { user: { id: string } }) {
    return this.service.startTutorial(req.user.id);
  }

  @Post('step/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  completeStep(@Request() req: { user: { id: string } }, @Body() dto: CompleteStepDto) {
    return this.service.completeStep(req.user.id, dto);
  }

  @Post('skip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  skipTutorial(@Request() req: { user: { id: string } }) {
    return this.service.skipTutorial(req.user.id);
  }

  /**
   * Internal: read a different user's tutorial progress.
   *
   * Used by game-server's tutorial-complete handler to verify a player
   * actually walked through every step before granting the starter gift.
   * Requires the shared `X-Internal-Service: Bearer <secret>` header so
   * regular clients can't enumerate other players' onboarding state.
   */
  @Get('progress/:userId')
  @UseGuards(InternalServiceGuard)
  @ApiOperation({
    summary:
      "Internal: read a user's tutorial progress. Requires X-Internal-Service header (game-server only).",
  })
  getProgressForUser(@Param('userId') userId: string) {
    return this.service.getTutorialSummary(userId);
  }
}
