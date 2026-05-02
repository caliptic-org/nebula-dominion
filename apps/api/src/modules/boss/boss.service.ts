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

  async getAge2Bosses() {
    return this.bossRepository
      .createQueryBuilder('boss')
      .where('boss.code IN (:...codes)', { codes: ['hydra_phase1', 'hydra_phase2', 'titan_phase1', 'titan_phase2', 'titan_phase3'] })
      .orderBy('boss.code', 'ASC')
      .addOrderBy('boss.phase', 'ASC')
      .getMany();
  }

  async getHydraEncounters() {
    return this.bossRepository
      .createQueryBuilder('boss')
      .where('boss.code LIKE :pattern', { pattern: 'hydra%' })
      .orderBy('boss.phase', 'ASC')
      .getMany();
  }

  async getTitanEncounters() {
    return this.bossRepository
      .createQueryBuilder('boss')
      .where('boss.code LIKE :pattern', { pattern: 'titan%' })
      .orderBy('boss.phase', 'ASC')
      .getMany();
  }

  /**
   * Seed Age 2 boss encounters (Hydra and Titan).
   * Safe to call multiple times — skips existing records.
   */
  async seedAge2Bosses(ageId: string): Promise<{ seeded: string[]; skipped: string[] }> {
    const seeded: string[] = [];
    const skipped: string[] = [];

    const age2BossData: Omit<BossEncounter, 'id' | 'createdAt' | 'age'>[] = [
      {
        code: 'hydra_phase1',
        name: 'Hidra — Faz 1: Uyanış',
        phase: 1,
        ageId,
        levelRequired: 12,
        hp: '80000',
        attack: 35,
        defense: 20,
        speed: 2,
        mechanics: [
          { name: 'venom_spray', cooldown: 3, damage_pct: 120, effect: 'poison_dot' },
          { name: 'head_regeneration', cooldown: 5, damage_pct: 0, effect: 'heal_10pct' },
        ],
        phases: [
          { phase: 1, hp_threshold: 1.0 },
          { phase: 2, hp_threshold: 0.5 },
        ],
        weaknesses: [{ type: 'fire', multiplier: 1.5 }],
        resistances: [{ type: 'poison', multiplier: 0.0 }],
        rewards: { gold: 10000, gems: 300, badge: 'hydra_slayer_1' },
        lore: 'Hidra, Çağ 2\'nin derinliklerinden ortaya çıkan çok başlı bir yaratıktır. Her kesilen baş, iki yenisiyle büyür.',
        isActive: true,
      },
      {
        code: 'hydra_phase2',
        name: 'Hidra — Faz 2: Öfke',
        phase: 2,
        ageId,
        levelRequired: 12,
        hp: '50000',
        attack: 55,
        defense: 15,
        speed: 4,
        mechanics: [
          { name: 'venom_spray', cooldown: 2, damage_pct: 150, effect: 'poison_dot' },
          { name: 'multi_bite', cooldown: 3, damage_pct: 200, effect: 'multi_target' },
          { name: 'berserk_mode', cooldown: 10, damage_pct: 300, effect: 'attack_boost' },
        ],
        phases: [
          { phase: 2, hp_threshold: 1.0 },
        ],
        weaknesses: [{ type: 'fire', multiplier: 2.0 }, { type: 'ice', multiplier: 1.25 }],
        resistances: [{ type: 'poison', multiplier: 0.0 }, { type: 'physical', multiplier: 0.75 }],
        rewards: { gold: 25000, gems: 750, title: 'Hidra Avcısı', badge: 'hydra_slayer_2' },
        lore: 'Hidra yaralandıkça daha da güçlenir. Öfkesi doruk noktasında tüm başları aynı anda saldırıya geçer.',
        isActive: true,
      },
      {
        code: 'titan_phase1',
        name: 'Titan — Faz 1: Demir Zırh',
        phase: 1,
        ageId,
        levelRequired: 15,
        hp: '150000',
        attack: 50,
        defense: 40,
        speed: 1,
        mechanics: [
          { name: 'ground_slam', cooldown: 4, damage_pct: 180, effect: 'stun_1turn' },
          { name: 'iron_shield', cooldown: 6, damage_pct: 0, effect: 'damage_reduction_50pct' },
        ],
        phases: [
          { phase: 1, hp_threshold: 1.0 },
          { phase: 2, hp_threshold: 0.6 },
          { phase: 3, hp_threshold: 0.3 },
        ],
        weaknesses: [{ type: 'energy', multiplier: 1.75 }, { type: 'quantum', multiplier: 2.0 }],
        resistances: [{ type: 'physical', multiplier: 0.5 }, { type: 'fire', multiplier: 0.75 }],
        rewards: { gold: 20000, gems: 500, badge: 'titan_hunter_1' },
        lore: 'Titan, antik bir savaş makinesidir. Zırhı neredeyse kırılmazdır; sadece enerji silahları etkili olabilir.',
        isActive: true,
      },
      {
        code: 'titan_phase2',
        name: 'Titan — Faz 2: Çekirdek Açılımı',
        phase: 2,
        ageId,
        levelRequired: 15,
        hp: '100000',
        attack: 70,
        defense: 25,
        speed: 2,
        mechanics: [
          { name: 'core_beam', cooldown: 3, damage_pct: 250, effect: 'armor_pierce' },
          { name: 'seismic_stomp', cooldown: 5, damage_pct: 200, effect: 'aoe_damage' },
          { name: 'self_repair', cooldown: 8, damage_pct: 0, effect: 'heal_15pct' },
        ],
        phases: [
          { phase: 2, hp_threshold: 1.0 },
          { phase: 3, hp_threshold: 0.5 },
        ],
        weaknesses: [{ type: 'energy', multiplier: 2.0 }, { type: 'quantum', multiplier: 2.5 }],
        resistances: [{ type: 'physical', multiplier: 0.25 }],
        rewards: { gold: 35000, gems: 900, badge: 'titan_hunter_2' },
        lore: 'Çekirdek reaktörü açılan Titan daha da tehlikeli hale gelir. Enerji demeti zırhı deler geçer.',
        isActive: true,
      },
      {
        code: 'titan_phase3',
        name: 'Titan — Faz 3: Kıyamet Protokolü',
        phase: 3,
        ageId,
        levelRequired: 15,
        hp: '75000',
        attack: 100,
        defense: 10,
        speed: 3,
        mechanics: [
          { name: 'annihilation_beam', cooldown: 2, damage_pct: 400, effect: 'instant_kill_chance_10pct' },
          { name: 'overload', cooldown: 4, damage_pct: 350, effect: 'aoe_damage_all' },
          { name: 'self_destruct_threat', cooldown: 15, damage_pct: 500, effect: 'countdown_3turns' },
        ],
        phases: [
          { phase: 3, hp_threshold: 1.0 },
        ],
        weaknesses: [{ type: 'energy', multiplier: 3.0 }, { type: 'quantum', multiplier: 3.0 }, { type: 'void', multiplier: 2.0 }],
        resistances: [],
        rewards: {
          gold: 75000,
          gems: 2000,
          title: 'Titan Katili',
          badge: 'titan_slayer',
          unlock: 'age_2_champion',
        },
        lore: 'Kıyamet protokolü devrede. Titan\'ın son savunması — ya onu yok edersiniz ya da o sizi. Zaman dolmadan bitirin.',
        isActive: true,
      },
    ];

    for (const bossData of age2BossData) {
      const existing = await this.bossRepository.findOne({ where: { code: bossData.code } });
      if (existing) {
        skipped.push(bossData.code);
        continue;
      }
      await this.bossRepository.save(this.bossRepository.create(bossData));
      seeded.push(bossData.code);
      this.logger.log(`Age 2 boss seeded: ${bossData.code}`);
    }

    return { seeded, skipped };
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
