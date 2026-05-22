'use client';

import clsx from 'clsx';
import { AllianceWar, AllianceWarStatus } from '@/types/guild';
import { Race } from '@/types/units';

interface GuildWarPanelProps {
  wars: AllianceWar[];
  guildTag: string;
}

const STATUS_LABEL: Record<AllianceWarStatus, string> = {
  preparing: 'Hazırlık',
  active: 'Aktif Çatışma',
  won: 'Zafer',
  lost: 'Mağlubiyet',
};

const OPPONENT_RACE_COLOR: Record<Race, string> = {
  [Race.INSAN]: '#4a9eff',
  [Race.ZERG]: '#44dd44',
  [Race.OTOMAT]: '#00cfff',
  [Race.CANAVAR]: '#ff8800',
  [Race.SEYTAN]: '#8b2fc9',
};

const formatRemaining = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  const past = diff < 0;
  const abs = Math.abs(diff);
  const hr = Math.floor(abs / 3_600_000);
  const min = Math.floor((abs % 3_600_000) / 60_000);
  if (hr >= 24) {
    const d = Math.floor(hr / 24);
    const rh = hr % 24;
    return past ? `${d}g ${rh}s önce` : `${d}g ${rh}s kaldı`;
  }
  if (hr >= 1) return past ? `${hr}s ${min}dk önce` : `${hr}s ${min}dk kaldı`;
  return past ? `${min}dk önce` : `${min}dk kaldı`;
};

export function GuildWarPanel({ wars, guildTag }: GuildWarPanelProps) {
  if (wars.length === 0) {
    return (
      <section aria-labelledby="war-heading" className="space-y-3">
        <h2
          id="war-heading"
          className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary"
        >
          Savaş Paneli
        </h2>
        <div className="glass-card p-5 text-text-muted text-sm text-center">
          Şu anda planlanmış bir ittifak savaşı yok. Yeni bir sezon başladığında burada görünecek.
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="war-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2
            id="war-heading"
            className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary"
          >
            Savaş Paneli
          </h2>
          <p className="text-text-muted text-xs">Aktif, hazırlık ve sonuçlanan ittifak savaşları.</p>
        </div>
        <span className="badge badge-brand">{wars.length} savaş</span>
      </div>

      <ul className="space-y-3" role="list">
        {wars.map((war) => (
          <li key={war.id}>
            <WarCard war={war} guildTag={guildTag} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface WarCardProps {
  war: AllianceWar;
  guildTag: string;
}

function WarCard({ war, guildTag }: WarCardProps) {
  const isActive = war.status === 'active';
  const isPreparing = war.status === 'preparing';
  const total = Math.max(1, war.ourScore + war.theirScore);
  const usPct = (war.ourScore / total) * 100;
  const winning = war.ourScore > war.theirScore;
  const oppColor = OPPONENT_RACE_COLOR[war.opponentRace];
  const slotsPct = Math.min(100, (war.participantCount / war.totalSlots) * 100);

  return (
    <article
      className={clsx('war-card', `war-card--${war.status}`)}
      aria-label={`Savaş: ${war.opponentName} (${STATUS_LABEL[war.status]})`}
    >
      <header className="war-card__header">
        <span className={clsx('war-card__status', `war-card__status--${war.status}`)}>
          {isActive && <span className="war-card__pulse" aria-hidden />}
          {STATUS_LABEL[war.status]}
        </span>
        <span className="war-card__time">{formatRemaining(war.endsAt)}</span>
      </header>

      <div className="war-card__matchup">
        <div className="war-card__side war-card__side--us">
          <span className="war-card__tag" aria-hidden>
            {guildTag}
          </span>
          <span className="war-card__side-label">Biz</span>
        </div>

        <div className="war-card__score-block">
          {isPreparing ? (
            <span className="war-card__vs-pending">vs</span>
          ) : (
            <>
              <span
                className={clsx(
                  'war-card__score',
                  winning ? 'war-card__score--lead' : 'war-card__score--trail'
                )}
              >
                {war.ourScore.toLocaleString('tr-TR')}
              </span>
              <span className="war-card__vs">vs</span>
              <span
                className={clsx(
                  'war-card__score',
                  !winning ? 'war-card__score--lead' : 'war-card__score--trail'
                )}
                style={{ color: oppColor }}
              >
                {war.theirScore.toLocaleString('tr-TR')}
              </span>
            </>
          )}
        </div>

        <div className="war-card__side war-card__side--them">
          <span
            className="war-card__tag war-card__tag--them"
            style={{ borderColor: oppColor, color: oppColor }}
            aria-hidden
          >
            {war.opponentTag}
          </span>
          <span className="war-card__side-label">{war.opponentName}</span>
        </div>
      </div>

      {!isPreparing && (
        <div
          className="war-card__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(usPct)}
          aria-label={`Skor payı: %${Math.round(usPct)} bizim`}
        >
          <div
            className="war-card__bar-us"
            style={{ width: `${usPct}%` }}
          />
          <div
            className="war-card__bar-them"
            style={{ width: `${100 - usPct}%`, background: oppColor }}
          />
        </div>
      )}

      <footer className="war-card__footer">
        <span className="war-card__slots">
          <span className="war-card__slots-fill" style={{ width: `${slotsPct}%` }} />
          <span className="war-card__slots-label">
            {war.participantCount}/{war.totalSlots} savaşçı kayıtlı
          </span>
        </span>
      </footer>
    </article>
  );
}
