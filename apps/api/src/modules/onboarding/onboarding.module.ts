import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorialProgress } from './entities/tutorial-progress.entity';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { InternalServiceGuard } from '../quest-progress/guards/internal-service.guard';

@Module({
  imports: [TypeOrmModule.forFeature([TutorialProgress])],
  // InternalServiceGuard is reused from the quest-progress module so the
  // internal /onboarding/progress/:userId endpoint can be authenticated by
  // game-server with the same X-Internal-Service shared secret pattern
  // (audit B1 / CLAUDE.md §1).
  providers: [OnboardingService, InternalServiceGuard],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}
