import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Sector } from './entities/sector.entity';
import { SectorBattle, SectorBattleStatus } from './entities/sector-battle.entity';
import { WeeklyLeague } from './entities/weekly-league.entity';
import { LeagueParticipant } from './entities/league-participant.entity';
import { AttackSectorDto } from './dto/attack-sector.dto';
import { JoinLeagueDto } from './dto/join-league.dto';
import { RedisService } from '../redis/redis.service';

const SECTOR_BONUS_MULTIPLIERS: Record<string, number> = {
  none: 0,
  attack_boost: 0.15,
  defense_boost: 0.15,
  resource_bonus: 0.20,
  xp_bonus: 0.20,
  dark_matter_bonus: 0.25,
};

@Injectable()
export class SectorWarsService {
  private readonly logger = new Logger(SectorWarsService.name);

  constructor(
    @InjectRepository(Sector) private readonly sectorRepo: Repository<Sector>,
    @InjectRepository(SectorBattle) private readonly battleRepo: Repository<SectorBattle>,
    @InjectRepository(WeeklyLeague) private readonly leagueRepo: Repository<WeeklyLeague>,
    @InjectRepository(LeagueParticipant) private readonly participantRepo: Repository<LeagueParticipant>,
    private readonly redis: RedisService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─── Sector Map ────────────────────────────────────────────────────────────

  async getSectorMap(): Promise<Sector[]> {
    return this.sectorRepo.find({ order: { mapY: 'ASC', mapX: 'ASC' } });
  }

  async getSector(id: string): Promise<Sector> {
    const sector = await this.sectorRepo.findOne({ where: { id }, relations: ['battles'] });
    if (!sector) throw new NotFoundException(`Sector ${id} not found`);
    return sector;
  }

  async getAllianceSectors(allianceId: string): Promise<Sector[]> {
    return this.sectorRepo.find({ where: { controllingAllianceId: allianceId } });
  }

  getSectorBonus(sector: Sector): { type: string; effectivePct: number } {
    const effectivePct = (SECTOR_BONUS_MULTIPLIERS[sector.bonusType] ?? 0) * sector.bonusValue;
    return { type: sector.bonusType, effectivePct };
  }

  // ─── Sector Battle ─────────────────────────────────────────────────────────

  async attackSector(sectorId: string, dto: AttackSectorDto): Promise<SectorBattle> {
    const sector = await this.sectorRepo.findOne({ where: { id: sectorId } });
    if (!sector) throw new NotFoundException(`Sector ${sectorId} not found`);

    if (sector.controllingAllianceId === dto.attackerAllianceId) {
      throw new ConflictException('Your alliance already controls this sector');
    }

    // Check for an in-progress battle on this sector
    const existing = await this.battleRepo.findOne({
      where: { sectorId, status: SectorBattleStatus.IN_PROGRESS },
    });
    if (existing) {
      throw new ConflictException('A battle is already in progress for this sector');
    }

    const battle = this.battleRepo.create({
      sectorId,
      attackerAllianceId: dto.attackerAllianceId,
      attackerPlayerId: dto.attackerPlayerId,
      defenderAllianceId: sector.controllingAllianceId,
      status: SectorBattleStatus.PENDING,
      unitsSnapshot: { unitIds: dto.unitIds },
    });

    const saved = await this.battleRepo.save(battle);

    // Mark sector as contested
    await this.sectorRepo.update(sectorId, {
      isContested: true,
      lastContestedAt: new Date(),
    });

    // Cache contested sector IDs for fast lookup
    await this.redis.set(
      `sector:contested:${sectorId}`,
      JSON.stringify({ battleId: saved.id, startedAt: saved.createdAt }),
      3600,
    );

    this.logger.log(
      `Sector battle ${saved.id} started: alliance ${dto.attackerAllianceId} attacks sector ${sectorId}`,
    );

    return saved;
  }

  async resolveSectorBattle(battleId: string, winnerId: 'attacker' | 'defender'): Promise<SectorBattle> {
    const battle = await this.battleRepo.findOne({ where: { id: battleId }, relations: ['sector'] });
    if (!battle) throw new NotFoundException(`Battle ${battleId} not found`);
    if (battle.status !== SectorBattleStatus.PENDING && battle.status !== SectorBattleStatus.IN_PROGRESS) {
      throw new BadRequestException('Battle is already resolved');
    }

    const status =
      winnerId === 'attacker' ? SectorBattleStatus.ATTACKER_WON : SectorBattleStatus.DEFENDER_WON;

    await this.dataSource.transaction(async (em) => {
      await em.update(SectorBattle, battleId, {
        status,
        endedAt: new Date(),
        attackerScore: winnerId === 'attacker' ? 100 : 40,
        defenderScore: winnerId === 'defender' ? 100 : 40,
      });

      if (winnerId === 'attacker') {
        await em.update(Sector, battle.sectorId, {
          controllingAllianceId: battle.attackerAllianceId,
          isContested: false,
        });
      } else {
        await em.update(Sector, battle.sectorId, { isContested: false });
      }
    });

    await this.redis.del(`sector:contested:${battle.sectorId}`);

    const resolved = await this.battleRepo.findOne({ where: { id: battleId } });
    return resolved!;
  }

  async getActiveBattles(): Promise<SectorBattle[]> {
    return this.battleRepo.find({
      where: [
        { status: SectorBattleStatus.PENDING },
        { status: SectorBattleStatus.IN_PROGRESS },
      ],
      relations: ['sector'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Weekly Leagues ────────────────────────────────────────────────────────

  async getActiveLeagues(): Promise<WeeklyLeague[]> {
    return this.leagueRepo.find({ where: { isActive: true }, order: { tier: 'ASC' } });
  }

  async getLeague(id: string): Promise<WeeklyLeague> {
    const league = await this.leagueRepo.findOne({
      where: { id },
      relations: ['participants'],
    });
    if (!league) throw new NotFoundException(`League ${id} not found`);
    return league;
  }

  async joinLeague(leagueId: string, dto: JoinLeagueDto): Promise<LeagueParticipant> {
    const league = await this.leagueRepo.findOne({ where: { id: leagueId } });
    if (!league) throw new NotFoundException(`League ${leagueId} not found`);
    if (!league.isActive) throw new BadRequestException('This league is not active');

    const existing = await this.participantRepo.findOne({
      where: { leagueId, playerId: dto.playerId },
    });
    if (existing) return existing;

    const participant = this.participantRepo.create({
      leagueId,
      playerId: dto.playerId,
      username: dto.username,
      score: 0,
    });
    const saved = await this.participantRepo.save(participant);

    // Add to Redis sorted set for this league
    await this.redis.zadd(`leaderboard:weekly:${leagueId}`, 0, dto.playerId);

    return saved;
  }

  async addLeagueScore(
    leagueId: string,
    playerId: string,
    points: number,
    battleWon: boolean,
    sectorCaptured = false,
  ): Promise<LeagueParticipant> {
    const participant = await this.participantRepo.findOne({
      where: { leagueId, playerId },
    });
    if (!participant) throw new NotFoundException('Player not in this league');

    participant.score += points;
    if (battleWon) participant.battlesWon += 1;
    else participant.battlesLost += 1;
    if (sectorCaptured) participant.sectorCaptures += 1;

    const saved = await this.participantRepo.save(participant);

    // Update Redis sorted set
    await this.redis.zadd(`leaderboard:weekly:${leagueId}`, saved.score, playerId);

    return saved;
  }

  async getLeagueStandings(
    leagueId: string,
    limit = 50,
  ): Promise<Array<{ rank: number; playerId: string; score: number; username: string }>> {
    // Use Redis sorted set for O(log N) ranking
    const raw = await this.redis.zrevrangeWithScores(`leaderboard:weekly:${leagueId}`, 0, limit - 1);

    if (raw.length > 0) {
      return raw.map((entry, idx) => ({
        rank: idx + 1,
        playerId: entry.value,
        score: entry.score,
        username: '',
      }));
    }

    // Fallback to DB if Redis is cold
    const participants = await this.participantRepo.find({
      where: { leagueId },
      order: { score: 'DESC' },
      take: limit,
    });

    return participants.map((p, idx) => ({
      rank: idx + 1,
      playerId: p.playerId,
      score: p.score,
      username: p.username,
    }));
  }
}
