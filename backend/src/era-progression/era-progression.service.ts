import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { PlayerEraProgress } from './entities/player-era-progress.entity';
import { EraCatchupPackage } from './entities/era-catchup-package.entity';
import { EraMiniQuest, MiniQuestStatus } from './entities/era-mini-quest.entity';
import { EraMechanicUnlock } from './entities/era-mechanic-unlock.entity';
import { TriggerEraTransitionDto } from './dto/trigger-transition.dto';
import { RedisService } from '../redis/redis.service';

const PRODUCTION_BOOST_HOURS = 24;
const MINI_QUEST_DEADLINE_HOURS = 48;

// Resource threshold: player must be able to cover at least 80% of transition cost
const ERA_TRANSITION_RESOURCE_THRESHOLD_PCT = 0.8;

// Era transition costs (minerals, gas). Era N→N+1 cost.
const ERA_TRANSITION_COSTS: Record<number, { minerals: number; gas: number }> = {
  1: { minerals: 1000, gas: 500 },
  2: { minerals: 3000, gas: 1500 },
  3: { minerals: 8000, gas: 4000 },
  4: { minerals: 20000, gas: 10000 },
};

// First unit type code per era for the free unlock reward
const ERA_FREE_UNIT_CODES: Record<number, string> = {
  2: 'human_soldier',
  3: 'human_soldier',
  4: 'human_soldier',
  5: 'human_soldier',
};

// Progressive mechanics per era (Era 2+ only)
// Each entry: mechanic code, hours after transition before unlock (0 = immediate)
const ERA_MECHANICS: Record<number, Array<{ code: string; name: string; nameTr: string; hoursDelay: number }>> = {
  2: [
    { code: 'resource_extraction', name: 'Advanced Resource Extraction', nameTr: 'Gelişmiş Kaynak Çıkarımı', hoursDelay: 0 },
    { code: 'alliance_bonuses', name: 'Alliance Bonus System', nameTr: 'İttifak Bonus Sistemi', hoursDelay: 16 },
    { code: 'advanced_merge', name: 'Advanced Unit Merging', nameTr: 'Gelişmiş Birim Birleştirme', hoursDelay: 32 },
  ],
  3: [
    { code: 'sector_warfare', name: 'Sector Warfare', nameTr: 'Sektör Savaşı', hoursDelay: 0 },
    { code: 'dark_matter_harvest', name: 'Dark Matter Harvesting', nameTr: 'Karanlık Madde Hasadı', hoursDelay: 16 },
    { code: 'mutation_chains', name: 'Mutation Chain System', nameTr: 'Mutasyon Zinciri Sistemi', hoursDelay: 32 },
  ],
  4: [
    { code: 'galactic_dominion', name: 'Galactic Dominion', nameTr: 'Galaktik Egemenlik', hoursDelay: 0 },
    { code: 'champion_trials', name: 'Champion Trials', nameTr: 'Şampiyon Sınavları', hoursDelay: 16 },
  ],
};

// Mini-quest templates per era
const ERA_MINI_QUESTS: Record<number, Array<{
  title: string; titleTr: string; description: string; descriptionTr: string;
  objectiveType: string; objectiveTarget: number;
}>> = {
  2: [
    {
      title: 'Train Your First Era 2 Unit',
      titleTr: 'İlk Çağ 2 Birimi Eğit',
      description: 'Train 3 units in the new era to get familiar with Era 2 forces.',
      descriptionTr: 'Yeni çağda 3 birim eğiterek Çağ 2 kuvvetlerine alış.',
      objectiveType: 'train_units',
      objectiveTarget: 3,
    },
    {
      title: 'Gather Resources',
      titleTr: 'Kaynak Topla',
      description: 'Produce 500 minerals to establish your Era 2 economy.',
      descriptionTr: 'Çağ 2 ekonomini kurmak için 500 mineral üret.',
      objectiveType: 'produce_minerals',
      objectiveTarget: 500,
    },
    {
      title: 'Win a Battle',
      titleTr: 'Bir Savaş Kazan',
      description: 'Defeat an opponent using your new Era 2 capabilities.',
      descriptionTr: 'Yeni Çağ 2 yeteneklerini kullanarak bir rakibi yenilgiye uğrat.',
      objectiveType: 'win_battle',
      objectiveTarget: 1,
    },
  ],
  3: [
    {
      title: 'Conquer a Sector',
      titleTr: 'Bir Sektör Fethет',
      description: 'Capture your first sector to claim Era 3 territory.',
      descriptionTr: 'Çağ 3 topraklarını talep etmek için ilk sektörünü ele geçir.',
      objectiveType: 'capture_sector',
      objectiveTarget: 1,
    },
    {
      title: 'Harvest Dark Matter',
      titleTr: 'Karanlık Madde Hasadı',
      description: 'Collect 200 dark matter units using Era 3 technology.',
      descriptionTr: 'Çağ 3 teknolojisini kullanarak 200 karanlık madde birimi topla.',
      objectiveType: 'harvest_dark_matter',
      objectiveTarget: 200,
    },
    {
      title: 'Era 3 Alliance Mission',
      titleTr: 'Çağ 3 İttifak Görevi',
      description: 'Complete 2 alliance battles to strengthen your Era 3 standing.',
      descriptionTr: 'Çağ 3 konumunu güçlendirmek için 2 ittifak savaşı tamamla.',
      objectiveType: 'alliance_battle',
      objectiveTarget: 2,
    },
  ],
  4: [
    {
      title: 'Dominate the Galaxy',
      titleTr: 'Galaksiyi Hükmet',
      description: 'Control 3 sectors simultaneously in Era 4.',
      descriptionTr: 'Çağ 4\'te aynı anda 3 sektörü kontrol et.',
      objectiveType: 'control_sectors',
      objectiveTarget: 3,
    },
    {
      title: 'Champion Trial I',
      titleTr: 'Şampiyon Sınavı I',
      description: 'Win 5 battles on your path to becoming a Champion.',
      descriptionTr: 'Şampiyon olmaya giden yolda 5 savaş kazan.',
      objectiveType: 'win_battle',
      objectiveTarget: 5,
    },
    {
      title: 'Reach for Supremacy',
      titleTr: 'Üstünlüğe Ulaş',
      description: 'Achieve top 10 in the Diamond League.',
      descriptionTr: 'Elmas Lig\'de ilk 10\'a gir.',
      objectiveType: 'league_rank',
      objectiveTarget: 10,
    },
  ],
  5: [
    {
      title: 'Champion\'s Dominion',
      titleTr: 'Şampiyonun Egemenliği',
      description: 'Control 5 sectors as the galactic Champion.',
      descriptionTr: 'Galaktik Şampiyon olarak 5 sektörü kontrol et.',
      objectiveType: 'control_sectors',
      objectiveTarget: 5,
    },
    {
      title: 'Legendary Battles',
      titleTr: 'Efsanevi Savaşlar',
      description: 'Win 10 battles in your Champion era.',
      descriptionTr: 'Şampiyon çağında 10 savaş kazan.',
      objectiveType: 'win_battle',
      objectiveTarget: 10,
    },
    {
      title: 'Mentor the Next Generation',
      titleTr: 'Yeni Nesli Mentor Et',
      description: 'Help 3 alliance members transition to Era 2.',
      descriptionTr: 'İttifaktaki 3 üyenin Çağ 2\'ye geçmesine yardım et.',
      objectiveType: 'help_era_transition',
      objectiveTarget: 3,
    },
  ],
};

@Injectable()
export class EraProgressionService {
  private readonly logger = new Logger(EraProgressionService.name);

  constructor(
    @InjectRepository(PlayerEraProgress)
    private readonly progressRepo: Repository<PlayerEraProgress>,
    @InjectRepository(EraCatchupPackage)
    private readonly packageRepo: Repository<EraCatchupPackage>,
    @InjectRepository(EraMiniQuest)
    private readonly questRepo: Repository<EraMiniQuest>,
    @InjectRepository(EraMechanicUnlock)
    private readonly mechanicRepo: Repository<EraMechanicUnlock>,
    private readonly redis: RedisService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─── Player Progress ─────────────────────────────────────────────────────────

  async getOrCreateProgress(
    playerId: string,
    allianceId?: string,
    username?: string,
  ): Promise<PlayerEraProgress> {
    let progress = await this.progressRepo.findOne({ where: { playerId } });
    if (!progress) {
      progress = this.progressRepo.create({
        playerId,
        currentEra: 1,
        allianceId: allianceId ?? null,
        username: username ?? null,
      });
      progress = await this.progressRepo.save(progress);
    }
    return progress;
  }

  async getProgress(playerId: string): Promise<PlayerEraProgress> {
    const progress = await this.progressRepo.findOne({ where: { playerId } });
    if (!progress) throw new NotFoundException(`Era progress for player ${playerId} not found`);
    return progress;
  }

  // ─── Transition Eligibility ──────────────────────────────────────────────────

  checkTransitionEligibility(
    currentEra: number,
    currentMinerals: number,
    currentGas: number,
  ): { eligible: boolean; requiredMinerals: number; requiredGas: number; reason?: string } {
    const cost = ERA_TRANSITION_COSTS[currentEra];
    if (!cost) {
      return {
        eligible: false,
        requiredMinerals: 0,
        requiredGas: 0,
        reason: `No transition defined beyond era ${currentEra}`,
      };
    }

    const requiredMinerals = Math.floor(cost.minerals * ERA_TRANSITION_RESOURCE_THRESHOLD_PCT);
    const requiredGas = Math.floor(cost.gas * ERA_TRANSITION_RESOURCE_THRESHOLD_PCT);

    if (currentMinerals < requiredMinerals || currentGas < requiredGas) {
      return {
        eligible: false,
        requiredMinerals,
        requiredGas,
        reason: `Insufficient resources. Need ${requiredMinerals} minerals and ${requiredGas} gas (80% threshold).`,
      };
    }

    return { eligible: true, requiredMinerals, requiredGas };
  }

  // ─── Era Transition ──────────────────────────────────────────────────────────

  async triggerEraTransition(
    playerId: string,
    dto: TriggerEraTransitionDto,
  ): Promise<{
    progress: PlayerEraProgress;
    catchupPackage: EraCatchupPackage;
    isChampion: boolean;
  }> {
    const progress = await this.getOrCreateProgress(playerId, dto.allianceId, dto.username);

    const eligibility = this.checkTransitionEligibility(
      progress.currentEra,
      dto.currentMinerals,
      dto.currentGas,
    );

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    // Check cooldown: can't transition twice if a package is already active from this era
    const existingPackage = await this.packageRepo.findOne({
      where: {
        playerId,
        era: progress.currentEra + 1,
        productionBoostExpiresAt: MoreThan(new Date()),
      },
    });
    if (existingPackage) {
      throw new ConflictException(
        `Era ${progress.currentEra + 1} catch-up package is already active`,
      );
    }

    const targetEra = progress.currentEra + 1;
    const isChampion = targetEra === 5;

    let savedPackageId = '';

    await this.dataSource.transaction(async (em) => {
      // Update player era
      await em.update(PlayerEraProgress, progress.id, {
        currentEra: targetEra,
        eraTransitionedAt: new Date(),
        mineralSnapshot: dto.currentMinerals,
        gasSnapshot: dto.currentGas,
        ...(dto.allianceId ? { allianceId: dto.allianceId } : {}),
        ...(dto.username ? { username: dto.username } : {}),
        ...(isChampion ? { isChampion: true, championAchievedAt: new Date() } : {}),
      });

      // Create catch-up package
      const boostExpiry = new Date();
      boostExpiry.setHours(boostExpiry.getHours() + PRODUCTION_BOOST_HOURS);

      const freeUnitCode = ERA_FREE_UNIT_CODES[targetEra] ?? null;

      const pkg = em.create(EraCatchupPackage, {
        playerId,
        era: targetEra,
        productionBoostPct: 50,
        productionBoostExpiresAt: boostExpiry,
        freeUnitTypeCode: freeUnitCode,
        freeUnitClaimed: false,
        playerEraProgressId: progress.id,
      });
      const savedPkg = await em.save(EraCatchupPackage, pkg);
      savedPackageId = savedPkg.id;

      // Create 3 mini-quests
      const questTemplates = ERA_MINI_QUESTS[targetEra] ?? ERA_MINI_QUESTS[2];
      const questDeadline = new Date();
      questDeadline.setHours(questDeadline.getHours() + MINI_QUEST_DEADLINE_HOURS);

      for (let i = 0; i < questTemplates.length; i++) {
        const tmpl = questTemplates[i];
        const quest = em.create(EraMiniQuest, {
          playerId,
          catchupPackageId: savedPkg.id,
          questNumber: i + 1,
          title: tmpl.title,
          titleTr: tmpl.titleTr,
          description: tmpl.description,
          descriptionTr: tmpl.descriptionTr,
          objectiveType: tmpl.objectiveType,
          objectiveTarget: tmpl.objectiveTarget,
          objectiveCurrent: 0,
          status: MiniQuestStatus.ACTIVE,
          expiresAt: questDeadline,
        });
        await em.save(EraMiniQuest, quest);
      }

      // Create progressive mechanic unlocks (era 2 and above)
      const mechanics = ERA_MECHANICS[targetEra];
      if (mechanics) {
        const now = new Date();
        for (const mechanic of mechanics) {
          const unlocksAt = new Date(now);
          unlocksAt.setHours(unlocksAt.getHours() + mechanic.hoursDelay);

          const unlock = em.create(EraMechanicUnlock, {
            playerId,
            era: targetEra,
            mechanicCode: mechanic.code,
            mechanicName: mechanic.name,
            mechanicNameTr: mechanic.nameTr,
            unlocksAt,
            isUnlocked: mechanic.hoursDelay === 0,
            tutorialShown: false,
            playerEraProgressId: progress.id,
          });
          await em.save(EraMechanicUnlock, unlock);
        }
      }
    });

    // Refresh progress entity
    const updatedProgress = await this.progressRepo.findOne({ where: { playerId } });

    // Cache boost for fast lookup
    const boostKey = `era_boost:${playerId}`;
    await this.redis.set(boostKey, '1.5', PRODUCTION_BOOST_HOURS * 3600);

    // Publish champion notification via Redis pub/sub
    if (isChampion) {
      const allianceId = dto.allianceId ?? progress.allianceId;
      const playerName = dto.username ?? progress.username ?? playerId;
      this.logger.log(`Champion transition: player ${playerId} (${playerName})`);

      if (allianceId) {
        await this.redis.set(
          `champion_notification:${allianceId}:${playerId}`,
          JSON.stringify({
            playerId,
            username: playerName,
            achievedAt: new Date().toISOString(),
            allianceId,
          }),
          86400, // 24h TTL
        );
      }

      this.logger.log(
        `Champion badge granted: ${playerName} is now a Galactic Champion (alliance: ${allianceId ?? 'none'})`,
      );
    }

    this.logger.log(
      `Era transition: player ${playerId} → Era ${targetEra} (champion: ${isChampion})`,
    );

    const catchupPackage = await this.packageRepo.findOne({
      where: { id: savedPackageId },
      relations: ['miniQuests'],
    });

    return {
      progress: updatedProgress!,
      catchupPackage: catchupPackage!,
      isChampion,
    };
  }

  // ─── Production Boost ────────────────────────────────────────────────────────

  async getActiveProductionBoostMultiplier(playerId: string): Promise<{
    hasBoost: boolean;
    multiplier: number;
    boostPct: number;
    expiresAt: Date | null;
  }> {
    // Fast path: Redis cache
    const cached = await this.redis.get(`era_boost:${playerId}`);
    if (cached) {
      return { hasBoost: true, multiplier: 1.5, boostPct: 50, expiresAt: null };
    }

    // DB fallback
    const now = new Date();
    const pkg = await this.packageRepo.findOne({
      where: { playerId, productionBoostExpiresAt: MoreThan(now) },
      order: { productionBoostExpiresAt: 'DESC' },
    });

    if (!pkg) {
      return { hasBoost: false, multiplier: 1.0, boostPct: 0, expiresAt: null };
    }

    // Rehydrate Redis cache with remaining TTL
    const remainingSecs = Math.max(
      0,
      Math.floor((pkg.productionBoostExpiresAt.getTime() - now.getTime()) / 1000),
    );
    if (remainingSecs > 0) {
      await this.redis.set(`era_boost:${playerId}`, '1.5', remainingSecs);
    }

    return {
      hasBoost: true,
      multiplier: 1 + pkg.productionBoostPct / 100,
      boostPct: pkg.productionBoostPct,
      expiresAt: pkg.productionBoostExpiresAt,
    };
  }

  // ─── Catch-up Package ────────────────────────────────────────────────────────

  async getActiveCatchupPackage(playerId: string): Promise<EraCatchupPackage | null> {
    const now = new Date();
    return this.packageRepo.findOne({
      where: { playerId, productionBoostExpiresAt: MoreThan(now) },
      relations: ['miniQuests'],
      order: { createdAt: 'DESC' },
    });
  }

  async claimFreeUnit(
    playerId: string,
    packageId: string,
  ): Promise<{ unitTypeCode: string }> {
    const pkg = await this.packageRepo.findOne({ where: { id: packageId, playerId } });
    if (!pkg) throw new NotFoundException(`Package ${packageId} not found`);
    if (pkg.freeUnitClaimed) throw new ConflictException('Free unit already claimed');
    if (!pkg.freeUnitTypeCode) throw new BadRequestException('No free unit available in this package');

    await this.packageRepo.update(packageId, {
      freeUnitClaimed: true,
      freeUnitClaimedAt: new Date(),
    });

    return { unitTypeCode: pkg.freeUnitTypeCode };
  }

  // ─── Mini Quests ─────────────────────────────────────────────────────────────

  async getActiveQuests(playerId: string): Promise<EraMiniQuest[]> {
    return this.questRepo.find({
      where: { playerId, status: MiniQuestStatus.ACTIVE },
      order: { questNumber: 'ASC' },
    });
  }

  async updateQuestProgress(
    playerId: string,
    questId: string,
    increment: number,
  ): Promise<EraMiniQuest> {
    const quest = await this.questRepo.findOne({ where: { id: questId, playerId } });
    if (!quest) throw new NotFoundException(`Quest ${questId} not found`);
    if (quest.status !== MiniQuestStatus.ACTIVE) {
      throw new BadRequestException(`Quest is not active (status: ${quest.status})`);
    }

    const now = new Date();

    // Expire overdue quests
    if (now > quest.expiresAt) {
      await this.questRepo.update(questId, { status: MiniQuestStatus.EXPIRED });
      throw new BadRequestException('Quest has expired');
    }

    const newCurrent = Math.min(quest.objectiveCurrent + increment, quest.objectiveTarget);
    const completed = newCurrent >= quest.objectiveTarget;

    await this.questRepo.update(questId, {
      objectiveCurrent: newCurrent,
      ...(completed
        ? { status: MiniQuestStatus.COMPLETED, completedAt: now }
        : {}),
    });

    return this.questRepo.findOne({ where: { id: questId } }) as Promise<EraMiniQuest>;
  }

  // ─── Progressive Mechanics ───────────────────────────────────────────────────

  async getProgressiveMechanics(playerId: string): Promise<
    Array<EraMechanicUnlock & { currentlyAvailable: boolean }>
  > {
    const mechanics = await this.mechanicRepo.find({
      where: { playerId },
      order: { unlocksAt: 'ASC' },
    });

    const now = new Date();
    const unlockPromises: Promise<void>[] = [];

    // Auto-unlock mechanics whose time has come
    for (const mechanic of mechanics) {
      if (!mechanic.isUnlocked && now >= mechanic.unlocksAt) {
        mechanic.isUnlocked = true;
        unlockPromises.push(
          this.mechanicRepo.update(mechanic.id, { isUnlocked: true }).then(() => undefined),
        );
      }
    }

    if (unlockPromises.length > 0) {
      await Promise.all(unlockPromises);
    }

    return mechanics.map((m) => ({
      ...m,
      currentlyAvailable: m.isUnlocked || new Date() >= m.unlocksAt,
    }));
  }

  async recordMechanicFirstUse(
    playerId: string,
    mechanicCode: string,
  ): Promise<{ tutorialRequired: boolean }> {
    const mechanic = await this.mechanicRepo.findOne({
      where: { playerId, mechanicCode },
    });

    if (!mechanic) throw new NotFoundException(`Mechanic ${mechanicCode} not found for player`);

    const now = new Date();
    if (now < mechanic.unlocksAt) {
      throw new BadRequestException(
        `Mechanic ${mechanicCode} is not yet available. Unlocks at ${mechanic.unlocksAt.toISOString()}`,
      );
    }

    const tutorialRequired = !mechanic.tutorialShown;

    if (!mechanic.firstUsedAt) {
      await this.mechanicRepo.update(mechanic.id, {
        firstUsedAt: now,
        isUnlocked: true,
        tutorialShown: true,
      });
    }

    return { tutorialRequired };
  }

  // ─── Champion Notifications ──────────────────────────────────────────────────

  async getChampionNotification(
    allianceId: string,
    playerId: string,
  ): Promise<{ playerId: string; username: string; achievedAt: string; allianceId: string } | null> {
    const raw = await this.redis.get(`champion_notification:${allianceId}:${playerId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async getRecentChampions(allianceId: string): Promise<string[]> {
    const pattern = `champion_notification:${allianceId}:*`;
    return this.redis.keys(pattern);
  }
}
