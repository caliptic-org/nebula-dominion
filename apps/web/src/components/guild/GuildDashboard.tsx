'use client';

import { useEffect, useState } from 'react';
import { GuildProfile, TIER_LABEL } from '@/types/guild';
import { guildApi } from '@/lib/guildApi';
import { GuildCrest } from './GuildCrest';
import { GuildBadge } from './GuildBadge';
import { GuildCapacityBar } from './GuildCapacityBar';
import { GuildMembersList } from './GuildMembersList';
import { WeeklyRankWidget } from './WeeklyRankWidget';
import { RaidBossHero } from './RaidBossHero';

interface GuildDashboardProps {
  guildId: string;
}

export function GuildDashboard({ guildId }: GuildDashboardProps) {
  const [profile, setProfile] = useState<GuildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    guildApi.getProfile(guildId).then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  if (loading) {
    return (
      <div className="glass-card p-8 text-center text-text-muted">Lonca paneli yükleniyor…</div>
    );
  }
  if (!profile) {
    return (
      <div className="glass-card p-8 text-center text-status-warning">
        Lonca bulunamadı — kurulum sürecinde bir aksaklık olmuş olabilir.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-guild-tag={profile.tag}>
      <header className="glass-card p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <GuildCrest race={profile.race} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="font-display text-2xl font-black text-text-primary leading-none">
              {profile.name}
            </h1>
            <span className="badge badge-race">[{profile.tag}]</span>
            {profile.isChampion && <span className="badge badge-energy">⭐ Şampiyon</span>}
          </div>
          <p className="text-text-secondary text-sm mb-3">{profile.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span>Çağ {profile.ageUnlockedAt}+ kilidi</span>
            <span>•</span>
            <span>{TIER_LABEL[profile.tier]}</span>
            <span>•</span>
            <span>Tier puan: {profile.tierScore.toLocaleString('tr-TR')}</span>
          </div>
        </div>
        <GuildBadge kind="tier" tier={profile.tier} />
      </header>

      <section aria-labelledby="capacity-heading" className="glass-card p-5">
        <h2
          id="capacity-heading"
          className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary mb-3"
        >
          Üye Kapasitesi
        </h2>
        <GuildCapacityBar current={profile.memberCount} tier={profile.tier} />
      </section>

      <WeeklyRankWidget
        rank={profile.weeklyRank}
        weeklyContribution={profile.weeklyDonations}
        raidAttendance={profile.weeklyRaidAttendance}
        isChampion={profile.isChampion}
      />

      <section aria-labelledby="raid-heading" className="space-y-3">
        <h2 id="raid-heading" className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary">
          Bu Haftaki Raid
        </h2>
        <RaidBossHero
          difficulty="hard"
          bossName="Mutasyon Lordu Vex"
          bossSubtitle="Haftalık Lonca Raid · Pazar 21:00"
          weeklyDropMultiplier={2}
        />
      </section>

      {profile.researchProjectName && (
        <section aria-labelledby="research-heading" className="glass-card p-5">
          <h2
            id="research-heading"
            className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary mb-3"
          >
            Tech Ağacı — Aktif Araştırma
          </h2>
          <p className="font-display text-base font-bold text-text-primary mb-2">
            {profile.researchProjectName}
          </p>
          <div className="capacity-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profile.researchProgressPct}>
            <div className="capacity-bar__fill" style={{ width: `${profile.researchProgressPct}%` }} />
          </div>
          <p className="text-text-muted text-xs mt-2">
            Lonca geneline %{profile.researchProgressPct} tamamlandı — tamamlanınca buff aktif olur.
          </p>
        </section>
      )}

      <GuildMembersList members={profile.members} />
    </div>
  );
}
