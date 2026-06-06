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

    // Sequential progression rule (F-CYCLE3-02 fix):
    //
    // The previous rule allowed any `targetIdx >= currentIdx` and
    // fast-forwarded all intermediate steps to completed. That was the
    // bypass vector — a tampered client could POST {stepId:"tutorial_complete"}
    // from currentStep="welcome" and the server would mark every step
    // completed, flip isCompleted=true, and grant the final-step gift.
    //
    // New rule: only accept `targetIdx <= currentIdx + 1`.
    //   - target === current      → idempotent re-post of the current step
    //                                (FE retry on flaky connection). The
    //                                "already completed" guard below still
    //                                blocks double-rewarding.
    //   - target === current + 1  → normal forward advance, one step at a time.
    //   - target  >  current + 1  → BadRequest. The player must walk the
    //                                tutorial in order; no jumps.
    //   - target  <  current      → BadRequest (backward jump).
    //
    // Coordinates with A3: race-select flow pre-completes welcome+race_selection
    // server-side, so the FE never has to skip forward from welcome.
    const currentIdx = TUTORIAL_STEP_IDS.indexOf(record.currentStep);
    const targetIdx = TUTORIAL_STEP_IDS.indexOf(dto.stepId);
    if (targetIdx < 0) {
      // Defensive — getStepById already guarded this, but keep the safety.
      throw new NotFoundException(`Tutorial adımı '${dto.stepId}' bulunamadı`);
    }

    // Idempotency safety net (audit blocker F1, 2026-06-06).
    //
    // Some progression chains complete a step server-side before the FE
    // ever reports it. UserService.selectRace, for instance, calls
    // completeStep({stepId:'race_selection'}) the moment the player picks
    // a race — by the time the FE renders /tutorial?step=1 and tries to
    // POST whatever it thinks step 1 should be, that step may already be
    // in `completedSteps`. The same problem happens on naive retries
    // (network flake, double-tap on Advance).
    //
    // Old behavior: 400 "Adım '...' zaten tamamlandı" — and depending on
    // the FE map this could also trip the `targetIdx < currentIdx` guard,
    // wedging the player on the current screen with no way forward.
    //
    // New behavior: pure no-op. Return 200 with current progress and
    // `reward: null` (the step already paid out the first time, if it had
    // a reward — we will not pay it again). No DB write, no currentStep
    // movement. This must run BEFORE the order-rule guards below: an
    // already-completed step is by definition behind currentStep, and we
    // don't want to surface that as an error.
    if (record.completedSteps.includes(dto.stepId)) {
      this.logger.debug(
        `completeStep idempotent no-op: user=${userId} step='${dto.stepId}' already completed`,
      );
      return { progress: record, reward: null };
    }

    if (targetIdx < currentIdx) {
      throw new BadRequestException(
        `Mevcut adım '${record.currentStep}', '${dto.stepId}' değil`,
      );
    }
    if (targetIdx > currentIdx + 1) {
      throw new BadRequestException(
        'Adımları sırayla tamamla — bir tutorial adımı atlayamazsın',
      );
    }

    // Only the explicitly-reported step is marked completed. The strict
    // <= current+1 rule above guarantees there are no intermediate steps
    // to fast-forward through.
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
