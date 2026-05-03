import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfanityWord } from './entities/profanity-word.entity';

const RELOAD_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class ProfanityService implements OnModuleInit {
  private readonly logger = new Logger(ProfanityService.name);
  private words: string[] = [];
  private regex: RegExp | null = null;
  private loadedAt = 0;

  constructor(
    @InjectRepository(ProfanityWord)
    private readonly repo: Repository<ProfanityWord>,
  ) {}

  async onModuleInit() {
    await this.reload();
  }

  async reload(): Promise<void> {
    const rows = await this.repo.find({ where: { isActive: true } });
    this.words = rows.map((r) => r.word.toLowerCase());
    if (this.words.length === 0) {
      this.regex = null;
    } else {
      const escaped = this.words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      this.regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    }
    this.loadedAt = Date.now();
    this.logger.log(`Loaded ${this.words.length} profanity words`);
  }

  private async ensureFresh(): Promise<void> {
    if (Date.now() - this.loadedAt > RELOAD_INTERVAL_MS) {
      await this.reload();
    }
  }

  async filter(content: string): Promise<{ clean: string; filtered: boolean }> {
    await this.ensureFresh();
    if (!this.regex) return { clean: content, filtered: false };
    let filtered = false;
    const clean = content.replace(this.regex, (match) => {
      filtered = true;
      return '*'.repeat(match.length);
    });
    return { clean, filtered };
  }

  async addWord(word: string): Promise<ProfanityWord> {
    const normalized = word.trim().toLowerCase();
    const existing = await this.repo.findOne({ where: { word: normalized } });
    if (existing) {
      existing.isActive = true;
      const saved = await this.repo.save(existing);
      await this.reload();
      return saved;
    }
    const created = await this.repo.save(this.repo.create({ word: normalized }));
    await this.reload();
    return created;
  }

  async removeWord(word: string): Promise<void> {
    await this.repo.update({ word: word.trim().toLowerCase() }, { isActive: false });
    await this.reload();
  }

  async list(): Promise<string[]> {
    await this.ensureFresh();
    return [...this.words];
  }
}
