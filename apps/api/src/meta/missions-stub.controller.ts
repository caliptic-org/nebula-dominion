import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

/* Daily quest stub.
 *
 * Mirrors the shape of backend/src/daily-engagement/daily-engagement.controller
 * so the UI sees the same field names. Five rotating quests + a daily login
 * streak. Static seed; refreshes from the wall clock for the streak day. */

type QuestKind = 'pve' | 'pvp' | 'build' | 'merge' | 'donate' | 'login';

interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { gold?: number; gems?: number; xp?: number };
  claimed: boolean;
}

const QUESTS: Quest[] = [
  { id: 'q1', kind: 'pve',    title: 'PvE Avı',         description: '3 PvE savaş kazan',                  progress: 1, target: 3, reward: { gold: 200, xp: 60 },  claimed: false },
  { id: 'q2', kind: 'build',  title: 'İnşaatçı',         description: '2 yeni yapı inşa et',                progress: 0, target: 2, reward: { gold: 300 },           claimed: false },
  { id: 'q3', kind: 'merge',  title: 'Promosyon',        description: '1 birim terfi ettir',                progress: 0, target: 1, reward: { gems: 15, xp: 80 },  claimed: false },
  { id: 'q4', kind: 'donate', title: 'Loncaya Bağış',    description: '500 kaynak bağışla',                 progress: 320, target: 500, reward: { gold: 150 },     claimed: false },
  { id: 'q5', kind: 'pvp',    title: 'Arena Galibi',     description: '1 PvP zafer',                        progress: 0, target: 1, reward: { gems: 25, xp: 120 }, claimed: false },
];

@ApiTags('missions (stub)')
@Controller('daily')
export class MissionsStubController {
  @Get('quests/:playerId')
  @ApiOperation({ summary: 'Get the day\'s quests for a player (stub seed)' })
  quests(@Param('playerId') playerId: string) {
    return {
      playerId,
      day: new Date().toISOString().slice(0, 10),
      quests: QUESTS,
      bonusUnlockedAt: 4, // claim daily bonus chest at 4/5 done
      totalDone: QUESTS.filter((q) => q.progress >= q.target).length,
    };
  }

  @Get('streak/:playerId')
  @ApiOperation({ summary: 'Daily login streak (stub seed)' })
  streak(@Param('playerId') playerId: string) {
    const today = new Date();
    return {
      playerId,
      currentStreak: 4,
      longestStreak: 9,
      lastClaimedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      nextRewardAt: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      rewards: [
        { day: 1, reward: { gold: 100 },  claimed: true  },
        { day: 2, reward: { gold: 200 },  claimed: true  },
        { day: 3, reward: { gold: 300 },  claimed: true  },
        { day: 4, reward: { gems: 25 },   claimed: true  },
        { day: 5, reward: { gems: 50 },   claimed: false },
        { day: 6, reward: { gold: 1000 }, claimed: false },
        { day: 7, reward: { gems: 150, titleUnlock: 'Sürekli Komutan' }, claimed: false },
      ],
    };
  }
}
