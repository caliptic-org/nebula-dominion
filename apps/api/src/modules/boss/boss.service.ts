import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BossEncounter } from './entities/boss-encounter.entity';
import { BossAttempt } from './entities/boss-attempt.entity';

interface StartAttemptDto {
  bossCode: string;
  unitsDeployed: Record<string, unknown>[];
}

interface AttackBossDto {
  attemptId: string;
  damageDealt: number;
  mechanicName?: string;
}

@Injectable()
export class BossService {
  private readonly logger = new Logger(BossService.name);

  constructor(
    @InjectRepository(BossEncounter)
    private readonly bossRepository: Repository<BossEncounter>,
    @InjectRepository(BossAttempt)
    private readonly attemptRepository: Repository<BossAttempt>,
  ) {}

  async getAllBosses() {
    return this.bossRepository.find({
      where: { isActive: true },
      order: { phase: 'ASC' },
    });
  }

  async getBossByCode(code: string) {
    const boss = await this.bossRepository.findOne({ where: { code }, relations: ['age'] });
    if (!boss) throw new NotFoundException(`Boss '${code}' bulunamadı`);
    return boss;
  }

  async getDevoringWormEncounters() {
    return this.bossRepository
      .createQueryBuilder('boss')
      .where('boss.code LIKE :pattern', { pattern: 'devouring_worm%' })
      .orderBy('boss.phase', 'ASC')
      .getMany();
  }

  async startAttempt(userId: string, dto: StartAttemptDto): Promise<BossAttempt> {
    const boss = await this.bossRepository.findOne({ where: { code: dto.bossCode } });
    if (!boss) throw new NotFoundException(`Boss '${dto.bossCode}' bulunamadı`);

    const existingActive = await this.attemptRepository.findOne({
      where: { userId, status: 'in_progress' },
    });
    if (existingActive) {
      throw new BadRequestException('Zaten aktif bir boss karşılaşması var. Önce bitirin veya çekilin.');
    }

    const attempt = this.attemptRepository.create({
      userId,
      bossEncounterId: boss.id,
      status: 'in_progress',
      currentPhase: boss.phase,
      bossHpRemaining: boss.hp,
      unitsDeployed: dto.unitsDeployed,
      damageDealt: '0',
      damageTaken: '0',
    });

    const saved = await this.attemptRepository.save(attempt);
    this.logger.log(`Kullanıcı ${userId} boss deneme başlattı: ${boss.name}`);
    return saved;
  }

  async attackBoss(userId: string, dto: AttackBossDto): Promise<Record<string, unknown>> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: dto.attemptId, userId, status: 'in_progress' },
      relations: ['bossEncounter'],
    });
    if (!attempt) throw new NotFoundException('Aktif boss karşılaşması bulunamadı');

    const boss = attempt.bossEncounter;
    const currentHp = parseInt(attempt.bossHpRemaining || boss.hp, 10);
    const newHp = Math.max(0, currentHp - dto.damageDealt);
    const totalDamage = parseInt(attempt.damageDealt, 10) + dto.damageDealt;

    attempt.bossHpRemaining = String(newHp);
    attempt.damageDealt = String(totalDamage);

    if (dto.mechanicName) {
      const mechanic = (boss.mechanics as Array<{ name: string; cooldown: number; damage_pct?: number; effect?: string }>)
        .find((m) => m.name === dto.mechanicName);
      if (mechanic) {
        attempt.mechanicsTriggered = [
          ...attempt.mechanicsTriggered,
          { name: mechanic.name, triggeredAt: new Date() },
        ];
      }
    }

    const bossResponse = this.calculateBossCounterAttack(boss, attempt.currentPhase);
    const newDamageTaken = parseInt(attempt.damageTaken, 10) + bossResponse.damage;
    attempt.damageTaken = String(newDamageTaken);

    const phaseInfo = this.checkPhaseTransition(boss, newHp);
    if (phaseInfo.newPhase > attempt.currentPhase) {
      attempt.currentPhase = phaseInfo.newPhase;
      this.logger.log(`Boss faz geçişi: ${boss.name} faz ${phaseInfo.newPhase}!`);
    }

    let victoryRewards: Record<string, unknown> | null = null;
    if (newHp === 0) {
      attempt.status = 'victory';
      attempt.endedAt = new Date();
      attempt.durationSecs = Math.floor(
        (attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000,
      );
      victoryRewards = boss.rewards;
      attempt.rewardsEarned = victoryRewards;
      this.logger.log(`Boss yenildi: ${boss.name} - kullanıcı: ${userId}`);
    }

    await this.attemptRepository.save(attempt);

    return {
      bossHpRemaining: newHp,
      bossHpMax: parseInt(boss.hp, 10),
      bossHpPct: Math.floor((newHp / parseInt(boss.hp, 10)) * 100),
      bossCounterAttack: bossResponse,
      currentPhase: attempt.currentPhase,
      phaseChanged: phaseInfo.newPhase > (attempt.currentPhase - 1),
      victory: newHp === 0,
      rewards: victoryRewards,
    };
  }

  async retreat(userId: string, attemptId: string): Promise<BossAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId, status: 'in_progress' },
    });
    if (!attempt) throw new NotFoundException('Aktif karşılaşma bulunamadı');

    attempt.status = 'defeat';
    attempt.endedAt = new Date();
    attempt.durationSecs = Math.floor(
      (attempt.endedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    );

    return this.attemptRepository.save(attempt);
  }

  async getLeaderboard(bossCode: string, limit = 20) {
    const boss = await this.bossRepository.findOne({ where: { code: bossCode } });
    if (!boss) throw new NotFoundException('Boss bulunamadı');

    return this.attemptRepository
      .createQueryBuilder('attempt')
      .where('attempt.bossEncounterId = :bossId', { bossId: boss.id })
      .andWhere('attempt.status = :status', { status: 'victory' })
      .orderBy('attempt.damageDealt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getUserAttempts(userId: string, bossCode?: string) {
    const qb = this.attemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.bossEncounter', 'boss')
      .where('attempt.userId = :userId', { userId })
      .orderBy('attempt.createdAt', 'DESC');

    if (bossCode) {
      qb.andWhere('boss.code = :bossCode', { bossCode });
    }

    return qb.take(50).getMany();
  }

  private calculateBossCounterAttack(
    boss: BossEncounter,
    currentPhase: number,
  ): { damage: number; mechanic: string | null } {
    const phaseMultiplier = 1 + (currentPhase - 1) * 0.5;
    const baseDamage = boss.attack * phaseMultiplier;
    const mechanics = boss.mechanics as Array<{ name: string; damage_pct?: number; cooldown: number }>;

    if (mechanics.length > 0 && Math.random() < 0.3) {
      const mechanic = mechanics[Math.floor(Math.random() * mechanics.length)];
      const mechanicDamage = Math.floor(baseDamage * ((mechanic.damage_pct || 100) / 100));
      return { damage: mechanicDamage, mechanic: mechanic.name };
    }

    return {
      damage: Math.floor(baseDamage * (0.8 + Math.random() * 0.4)),
      mechanic: null,
    };
  }

  private checkPhaseTransition(
    boss: BossEncounter,
    currentHp: number,
  ): { newPhase: number } {
    const hpPct = currentHp / parseInt(boss.hp, 10);
    const phases = boss.phases as Array<{ phase: number; hp_threshold: number }>;

    let newPhase = boss.phase;
    for (const phase of phases) {
      if (hpPct <= phase.hp_threshold && phase.phase > newPhase) {
        newPhase = phase.phase;
      }
    }

    return { newPhase };
  }
}
