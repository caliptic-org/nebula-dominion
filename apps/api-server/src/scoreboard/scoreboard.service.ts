import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerScore } from './entities/player-score.entity';
import { ScoreboardQueryDto } from './dto/scoreboard-query.dto';

export interface ScoreboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  totalScore: number;
  battlesWon: number;
  battlesLost: number;
  eloRating: number;
  winStreak: number;
}

export interface ScoreboardPage {
  entries: ScoreboardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ScoreboardService {
  constructor(
    @InjectRepository(PlayerScore) private readonly scoreRepo: Repository<PlayerScore>,
  ) {}

  async getLeaderboard(query: ScoreboardQueryDto): Promise<ScoreboardPage> {
    const { page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    const [rows, total] = await this.scoreRepo.findAndCount({
      order: { totalScore: 'DESC', eloRating: 'DESC' },
      skip: offset,
      take: limit,
    });

    const entries: ScoreboardEntry[] = rows.map((row, idx) => ({
      rank: offset + idx + 1,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      totalScore: row.totalScore,
      battlesWon: row.battlesWon,
      battlesLost: row.battlesLost,
      eloRating: row.eloRating,
      winStreak: row.winStreak,
    }));

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPlayerRank(userId: string): Promise<ScoreboardEntry & { globalRank: number }> {
    const score = await this.scoreRepo.findOne({ where: { userId } });
    if (!score) throw new NotFoundException('Player score not found');

    // Count how many players rank above this one
    const aboveCount = await this.scoreRepo
      .createQueryBuilder('ps')
      .where('ps.total_score > :score OR (ps.total_score = :score AND ps.elo_rating > :elo)', {
        score: score.totalScore,
        elo: score.eloRating,
      })
      .getCount();

    return {
      rank: aboveCount + 1,
      globalRank: aboveCount + 1,
      userId: score.userId,
      username: score.username,
      displayName: score.displayName,
      totalScore: score.totalScore,
      battlesWon: score.battlesWon,
      battlesLost: score.battlesLost,
      eloRating: score.eloRating,
      winStreak: score.winStreak,
    };
  }

  async getTopByElo(limit = 10): Promise<ScoreboardEntry[]> {
    const rows = await this.scoreRepo.find({
      order: { eloRating: 'DESC' },
      take: Math.min(limit, 100),
    });

    return rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      totalScore: row.totalScore,
      battlesWon: row.battlesWon,
      battlesLost: row.battlesLost,
      eloRating: row.eloRating,
      winStreak: row.winStreak,
    }));
  }
}
