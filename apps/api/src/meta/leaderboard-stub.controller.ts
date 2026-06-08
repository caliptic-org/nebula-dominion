import { Controller, Get, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/* Leaderboard controller (class name kept for history — no longer a stub).
 *
 * cycle 24 LB-HARDCODED-STUB: replaced the 14 hardcoded fake entries with REAL
 * rankings queried from the shared DB, now that cycle-23 made player_levels.elo
 * a durable ranked rating:
 *   - power  → players by total_xp (overall account power)
 *   - pvp    → players by elo (the ranked ladder; only ranked_games>0 appear)
 *   - weekly → players active in the last 7 days, by total_xp
 *   - guild  → alliances by aggregate member total_xp (FE 'alliance' tab maps
 *              category 'alliance' → 'guild')
 * `me` returns the caller's real elo + ladder rank.
 *
 * The api reads game-server-owned tables (player_levels) over the shared
 * DataSource — same pattern as battles-stub.controller / daily-engagement
 * (CLAUDE.md §1: api + game-server share one Postgres DB). Read-only; no
 * migration. On a query error each handler degrades to an empty board (honest)
 * rather than re-introducing fabricated names.
 */

type Category = 'power' | 'pvp' | 'guild' | 'weekly';
type FeRace = 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';

// users.race is the English Race enum (human/automaton/beast/demon); the FE
// leaderboard keys are Turkish. Map BE→FE so RACES[entry.race] resolves.
const RACE_BE_TO_FE: Record<string, FeRace> = {
  human: 'insan',
  zerg: 'zerg',
  automaton: 'otomat',
  beast: 'canavar',
  demon: 'seytan',
};
function feRace(beRace: string | null | undefined): FeRace {
  return RACE_BE_TO_FE[(beRace ?? '').toLowerCase()] ?? 'insan';
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  race: FeRace;
  score: number;
  allianceTag: string;
}

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardStubController {
  private readonly logger = new Logger(LeaderboardStubController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List real leaderboard entries (power/pvp/weekly = players, guild = alliances)' })
  @ApiQuery({ name: 'category', required: false, enum: ['power', 'pvp', 'guild', 'weekly'] })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('category') category?: Category,
    @Query('limit') limit?: string,
  ): Promise<{ category: Category; total: number; entries: LeaderboardEntry[] }> {
    const cat: Category = ['power', 'pvp', 'guild', 'weekly'].includes(category as string)
      ? (category as Category)
      : 'power';
    const n = Math.max(1, Math.min(50, Number(limit) || 20));

    try {
      const entries = cat === 'guild'
        ? await this.guildEntries(n)
        : await this.playerEntries(cat, n);
      return { category: cat, total: entries.length, entries };
    } catch (err) {
      this.logger.error(
        `leaderboard query failed (category=${cat}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return { category: cat, total: 0, entries: [] };
    }
  }

  /** Player rankings. The sort column + filter are chosen from a fixed switch
   *  (never interpolated from user input); limit is parameterized. */
  private async playerEntries(cat: Exclude<Category, 'guild'>, limit: number): Promise<LeaderboardEntry[]> {
    // score column, the metric players are ranked by, and the activity filter
    const cfg = {
      power: { scoreCol: 'pl.total_xp', where: 'pl.total_xp > 0' },
      pvp: { scoreCol: 'pl.elo', where: 'pl.ranked_games > 0' },
      weekly: { scoreCol: 'pl.total_xp', where: "pl.total_xp > 0 AND pl.updated_at >= NOW() - INTERVAL '7 days'" },
    }[cat];

    const rows = (await this.dataSource.query(
      `
      SELECT u.id::text AS id, u.username AS name, u.race AS race,
             ${cfg.scoreCol} AS score
        FROM player_levels pl
        JOIN users u ON u.id::text = pl.user_id
       WHERE u.is_active = true
         AND ${cfg.where}
       ORDER BY ${cfg.scoreCol} DESC, u.username ASC
       LIMIT $1
      `,
      [limit],
    )) as Array<{ id: string; name: string; race: string | null; score: string | number }>;

    return rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      name: r.name,
      race: feRace(r.race),
      score: Math.max(0, Math.floor(Number(r.score) || 0)),
      allianceTag: '',
    }));
  }

  /** Alliance rankings — alliances by aggregate member total_xp, leader's race
   *  as the representative sigil. */
  private async guildEntries(limit: number): Promise<LeaderboardEntry[]> {
    const rows = (await this.dataSource.query(
      `
      SELECT a.id::text AS id, a.name AS name, a.tag AS tag, lu.race AS race,
             COALESCE(SUM(pl.total_xp), 0) AS score
        FROM alliances a
        LEFT JOIN alliance_members am ON am.alliance_id = a.id
        -- player_levels.user_id is varchar; alliance_members.user_id and
        -- alliances.leader_id are uuid — cast to text so the cross-table
        -- joins don't trip "operator does not exist: varchar = uuid".
        LEFT JOIN player_levels pl ON pl.user_id = am.user_id::text
        LEFT JOIN users lu ON lu.id::text = a.leader_id::text
       GROUP BY a.id, a.name, a.tag, lu.race
       ORDER BY score DESC, a.name ASC
       LIMIT $1
      `,
      [limit],
    )) as Array<{ id: string; name: string; tag: string | null; race: string | null; score: string | number }>;

    return rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      name: r.name,
      race: feRace(r.race),
      score: Math.max(0, Math.floor(Number(r.score) || 0)),
      allianceTag: r.tag ?? '',
    }));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "The caller's real ladder standing (elo + rank; rank null until they play ranked)" })
  async me(@Request() req: any): Promise<{ rank: number | null; name: string; score: number }> {
    const id: string = req.user?.id ?? 'unknown';
    const fallbackName: string = req.user?.username ?? 'Sen';

    try {
      const rows = (await this.dataSource.query(
        `
        SELECT pl.elo AS elo, pl.ranked_games AS ranked_games, u.username AS name
          FROM player_levels pl
          JOIN users u ON u.id::text = pl.user_id
         WHERE pl.user_id = $1
         LIMIT 1
        `,
        [id],
      )) as Array<{ elo: string | number; ranked_games: string | number; name: string }>;

      if (rows.length === 0) {
        // No progression row yet — unranked at the 1000 baseline.
        return { rank: null, name: fallbackName, score: 1000 };
      }

      const elo = Math.max(0, Math.floor(Number(rows[0].elo) || 1000));
      const rankedGames = Number(rows[0].ranked_games) || 0;
      const name = rows[0].name ?? fallbackName;

      if (rankedGames <= 0) {
        // Has a row but never played ranked — show the rating, no rank.
        return { rank: null, name, score: elo };
      }

      const higherRows = (await this.dataSource.query(
        `SELECT COUNT(*)::int AS higher FROM player_levels WHERE ranked_games > 0 AND elo > $1`,
        [elo],
      )) as Array<{ higher: number }>;
      const higher = Number(higherRows?.[0]?.higher ?? 0);

      return { rank: higher + 1, name, score: elo };
    } catch (err) {
      this.logger.error(
        `leaderboard/me failed user=${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { rank: null, name: fallbackName, score: 0 };
    }
  }
}
