import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorialProgress } from './entities/tutorial-progress.entity';
import { CompleteStepDto } from './dto/complete-step.dto';
import {
  TUTORIAL_STEPS,
  TUTORIAL_STEP_IDS,
  getStepById,
  getNextStep,
} from './onboarding.config';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(TutorialProgress)
    private readonly progressRepo: Repository<TutorialProgress>,
  ) {}

  getTutorialSteps() {
    return TUTORIAL_STEPS;
  }

  async getProgress(userId: string): Promise<TutorialProgress> {
    const record = await this.progressRepo.findOne({ where: { userId } });
    if (!record) throw new NotFoundException(`Kullanıcı ${userId} için tutorial ilerlemesi bulunamadı`);
    return record;
  }

  async getOrCreateProgress(userId: string): Promise<TutorialProgress> {
    let record = await this.progressRepo.findOne({ where: { userId } });
    if (!record) {
      record = this.progressRepo.create({
        userId,
        completedSteps: [],
        currentStep: 'welcome',
        selectedRace: null,
        isCompleted: false,
        completedAt: null,
        skipped: false,
      });
      await this.progressRepo.save(record);
      this.logger.log(`Tutorial started for user=${userId}`);
    }
    return record;
  }

  async startTutorial(userId: string): Promise<TutorialProgress> {
    let record = await this.progressRepo.findOne({ where: { userId } });
    if (record) {
      // Reset existing progress
      record.completedSteps = [];
      record.currentStep = 'welcome';
      record.isCompleted = false;
      record.completedAt = null;
      record.skipped = false;
      record.selectedRace = null;
    } else {
      record = this.progressRepo.create({
        userId,
        completedSteps: [],
        currentStep: 'welcome',
        selectedRace: null,
        isCompleted: false,
        completedAt: null,
        skipped: false,
      });
    }
    await this.progressRepo.save(record);
    this.logger.log(`Tutorial (re)started for user=${userId}`);
    return record;
  }

  async completeStep(userId: string, dto: CompleteStepDto): Promise<{ progress: TutorialProgress; reward: object | null }> {
    const record = await this.getOrCreateProgress(userId);

    if (record.isCompleted) {
      throw new BadRequestException('Tutorial zaten tamamlandı');
    }

    const step = getStepById(dto.stepId);
    if (!step) {
      throw new NotFoundException(`Tutorial adımı '${dto.stepId}' bulunamadı`);
    }

    if (record.currentStep !== dto.stepId) {
      throw new BadRequestException(
        `Mevcut adım '${record.currentStep}', '${dto.stepId}' değil`,
      );
    }

    if (record.completedSteps.includes(dto.stepId)) {
      throw new BadRequestException(`Adım '${dto.stepId}' zaten tamamlandı`);
    }

    record.completedSteps = [...record.completedSteps, dto.stepId];

    if (dto.stepId === 'race_selection' && dto.selectedRace) {
      record.selectedRace = dto.selectedRace;
    }

    const nextStep = getNextStep(dto.stepId);
    if (nextStep) {
      record.currentStep = nextStep.id;
    } else {
      record.isCompleted = true;
      record.completedAt = new Date();
      record.currentStep = 'tutorial_complete';
    }

    if (dto.stepId === 'tutorial_complete') {
      record.isCompleted = true;
      record.completedAt = new Date();
    }

    await this.progressRepo.save(record);

    this.logger.log(`Tutorial step '${dto.stepId}' completed by user=${userId}`);

    return {
      progress: record,
      reward: step.reward ?? null,
    };
  }

  async skipTutorial(userId: string): Promise<TutorialProgress> {
    const record = await this.getOrCreateProgress(userId);

    if (record.isCompleted) {
      throw new BadRequestException('Tutorial zaten tamamlandı');
    }

    record.skipped = true;
    record.isCompleted = true;
    record.completedAt = new Date();
    record.currentStep = 'tutorial_complete';
    record.completedSteps = TUTORIAL_STEP_IDS;

    await this.progressRepo.save(record);
    this.logger.log(`Tutorial skipped by user=${userId}`);
    return record;
  }

  async getTutorialSummary(userId: string) {
    const record = await this.getOrCreateProgress(userId);
    const totalSteps = TUTORIAL_STEPS.length;
    const completedCount = record.completedSteps.length;
    const currentStepDef = getStepById(record.currentStep);

    return {
      userId,
      isCompleted: record.isCompleted,
      skipped: record.skipped,
      completedSteps: record.completedSteps,
      completedCount,
      totalSteps,
      progressPercent: Math.round((completedCount / totalSteps) * 100),
      currentStep: currentStepDef ?? null,
      selectedRace: record.selectedRace,
      startedAt: record.createdAt,
      completedAt: record.completedAt,
    };
  }
}
