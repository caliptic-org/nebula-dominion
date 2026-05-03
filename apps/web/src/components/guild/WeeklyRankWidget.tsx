'use client';

import { GuildBadge } from './GuildBadge';

interface WeeklyRankWidgetProps {
  rank: number | null;
  weeklyContribution: number;
  raidAttendance: number;
  isChampion: boolean;
}

export function WeeklyRankWidget({
  rank,
  weeklyContribution,
  raidAttendance,
  isChampion,
}: WeeklyRankWidgetProps) {
  return (
    <section
      aria-labelledby="rank-heading"
      className="glass-card p-5 flex flex-col sm:flex-row gap-5 items-center"
      style={{ background: 'linear-gradient(135deg, var(--color-race-dim) 0%, transparent 70%)' }}
    >
      <div className="flex flex-col items-center gap-1 shrink-0">
        <GuildBadge kind={isChampion ? 'champion' : 'tier'} tier={2} locked={!isChampion && rank === null} />
        {rank !== null && (
          <span className="font-display text-3xl font-black text-gradient-race leading-none">
            #{rank}
          </span>
        )}
      </div>

      <div className="flex-1 w-full space-y-3">
        <div>
          <h2 id="rank-heading" className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary">
            Haftalık Lonca Rank
          </h2>
          <p className="text-text-muted text-xs">Pazartesi 09:00'da sıfırlanır.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card">
            <p className="text-text-muted text-xs mb-1">Bu hafta katkı</p>
            <p className="font-display text-xl font-black text-text-primary">
              {weeklyContribution.toLocaleString('tr-TR')}
              <span className="text-text-muted text-xs font-normal"> pts</span>
            </p>
          </div>
          <div className="stat-card">
            <p className="text-text-muted text-xs mb-1">Raid katılım</p>
            <p className="font-display text-xl font-black text-text-primary">
              %{Math.round(raidAttendance * 100)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
