import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoryProgress } from './entities/story-progress.entity';
import {
  STORY_CHAPTERS,
  getChapterById,
  getChaptersByAge,
} from './story.config';

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor(
    @InjectRepository(StoryProgress)
    private readonly progressRepo: Repository<StoryProgress>,
  ) {}

  getAllChapters() {
    return STORY_CHAPTERS;
  }

  getChaptersByAge(age: number) {
    return getChaptersByAge(age);
  }

  getChapter(id: string) {
    const chapter = getChapterById(id);
    if (!chapter) throw new NotFoundException(`Bölüm '${id}' bulunamadı`);
    return chapter;
  }

  async getOrCreateProgress(userId: string): Promise<StoryProgress> {
    let record = await this.progressRepo.findOne({ where: { userId } });
    if (!record) {
      record = this.progressRepo.create({
        userId,
        completedChapters: [],
        currentChapter: 'ch_01_arrival',
        lastChoice: null,
      });
      await this.progressRepo.save(record);
    }
    return record;
  }

  async getUserProgress(userId: string) {
    const record = await this.getOrCreateProgress(userId);
    const currentChapterDef = getChapterById(record.currentChapter);
    const completedCount = record.completedChapters.length;
    const totalChapters = STORY_CHAPTERS.length;

    return {
      userId,
      completedChapters: record.completedChapters,
      completedCount,
      totalChapters,
      currentChapter: currentChapterDef ?? null,
      progressPercent: Math.round((completedCount / totalChapters) * 100),
      lastChoice: record.lastChoice,
      updatedAt: record.updatedAt,
    };
  }

  async completeChapter(
    userId: string,
    chapterId: string,
    choiceId?: string,
  ): Promise<{ progress: StoryProgress; reward: object | null; nextChapter: object | null }> {
    const chapter = getChapterById(chapterId);
    if (!chapter) throw new NotFoundException(`Bölüm '${chapterId}' bulunamadı`);

    const record = await this.getOrCreateProgress(userId);

    if (record.completedChapters.includes(chapterId)) {
      throw new BadRequestException(`Bölüm '${chapterId}' zaten tamamlandı`);
    }

    if (choiceId && chapter.choices) {
      const choice = chapter.choices.find((c) => c.id === choiceId);
      if (!choice) throw new BadRequestException(`Seçim '${choiceId}' bu bölümde yok`);
      record.lastChoice = { chapterId, choiceId, outcome: choice.outcome };
    }

    record.completedChapters = [...record.completedChapters, chapterId];

    if (chapter.nextChapterId) {
      record.currentChapter = chapter.nextChapterId;
    }

    await this.progressRepo.save(record);

    this.logger.log(`Story chapter '${chapterId}' completed by user=${userId}`);

    const nextChapterDef = chapter.nextChapterId ? getChapterById(chapter.nextChapterId) : null;

    return {
      progress: record,
      reward: chapter.reward ?? null,
      nextChapter: nextChapterDef ?? null,
    };
  }

  async getAvailableChapters(userId: string, playerLevel: number) {
    const record = await this.getOrCreateProgress(userId);
    return STORY_CHAPTERS.filter(
      (c) =>
        c.levelRequirement <= playerLevel &&
        !record.completedChapters.includes(c.id),
    );
  }
}
