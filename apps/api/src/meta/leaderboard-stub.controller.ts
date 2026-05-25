import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/* Lightweight leaderboard stub.
 *
 * Returns deterministic seed data so the /leaderboard UI can talk to a real
 * endpoint while the full LeaderboardModule (backend/src/leaderboard) is
 * pending. Categories: power | pvp | guild | weekly. */

type Category = 'power' | 'pvp' | 'guild' | 'weekly';

const ENTRIES: Array<{
  rank: number;
  id: string;
  name: string;
  race: 'insan' | 'zerg' | 'otomat' | 'canavar' | 'seytan';
  score: number;
  allianceTag: string;
}> = [
  { rank: 1,  id: 'p1',  name: 'A. Voss',         race: 'insan',   score: 4_872_000, allianceTag: 'YZH' },
  { rank: 2,  id: 'p2',  name: 'Demiurge Prime',  race: 'otomat',  score: 4_581_300, allianceTag: 'OTM' },
  { rank: 3,  id: 'p3',  name: "Mor'gath",        race: 'zerg',    score: 4_210_800, allianceTag: 'KVN' },
  { rank: 4,  id: 'p4',  name: 'Malphas',         race: 'seytan',  score: 3_987_400, allianceTag: 'MHK' },
  { rank: 5,  id: 'p5',  name: 'Khorvash',        race: 'canavar', score: 3_742_100, allianceTag: 'SRÜ' },
  { rank: 6,  id: 'p6',  name: 'Aurelius',        race: 'otomat',  score: 3_611_200, allianceTag: 'OTM' },
  { rank: 7,  id: 'p7',  name: 'Ravenna',         race: 'canavar', score: 3_498_700, allianceTag: 'SRÜ' },
  { rank: 8,  id: 'p8',  name: 'Lilithra',        race: 'seytan',  score: 3_344_500, allianceTag: 'MHK' },
  { rank: 9,  id: 'p9',  name: 'Chen',            race: 'insan',   score: 3_201_800, allianceTag: 'YZH' },
  { rank: 10, id: 'p10', name: "Vex'thara",       race: 'zerg',    score: 3_104_200, allianceTag: 'KVN' },
  { rank: 11, id: 'p11', name: 'Reyes',           race: 'insan',   score: 2_977_500, allianceTag: 'YZH' },
  { rank: 12, id: 'p12', name: 'Threnix',         race: 'zerg',    score: 2_845_000, allianceTag: 'KVN' },
  { rank: 13, id: 'p13', name: 'Crucible',        race: 'otomat',  score: 2_712_300, allianceTag: 'OTM' },
  { rank: 14, id: 'p14', name: 'Vorhaal',         race: 'seytan',  score: 2_601_700, allianceTag: 'MHK' },
];

@ApiTags('leaderboard (stub)')
@Controller('leaderboard')
export class LeaderboardStubController {
  @Get()
  @ApiOperation({ summary: 'List leaderboard entries (stub seed)' })
  @ApiQuery({ name: 'category', required: false, enum: ['power', 'pvp', 'guild', 'weekly'] })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Query('category') category?: Category,
    @Query('limit') limit?: string,
  ) {
    const n = Math.max(1, Math.min(50, Number(limit) || 20));
    // Sort variants by category (cheap permutation so each tab feels distinct).
    const sorted = [...ENTRIES];
    if (category === 'pvp') sorted.reverse();
    else if (category === 'guild') sorted.sort((a, b) => a.allianceTag.localeCompare(b.allianceTag));
    return { category: category ?? 'power', total: sorted.length, entries: sorted.slice(0, n) };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'My leaderboard entry (rank null until cross-player ranking lands)',
  })
  me(@Request() req: any) {
    const id: string = req.user?.id ?? 'unknown';
    const name: string = req.user?.username ?? 'Sen';
    // Stable, deterministic score per user id: FNV-1a 32-bit hash → 50000..149999.
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const score = (Math.abs(h) % 100_000) + 50_000;
    return { rank: null as number | null, name, score };
  }
}
