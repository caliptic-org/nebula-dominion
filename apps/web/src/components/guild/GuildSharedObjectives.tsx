'use client';

import { SharedObjective } from '@/types/guild';

interface GuildSharedObjectivesProps {
  objectives: SharedObjective[];
}

const formatRemaining = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'süresi doldu';
  const hr = Math.floor(diff / 3_600_000);
  if (hr >= 24) {
    const d = Math.floor(hr / 24);
    const rh = hr % 24;
    return `${d}g ${rh}s kaldı`;
  }
  const min = Math.floor((diff % 3_600_000) / 60_000);
  return `${hr}s ${min}dk kaldı`;
};

export function GuildSharedObjectives({ objectives }: GuildSharedObjectivesProps) {
  if (objectives.length === 0) {
    return (
      <section aria-labelledby="objectives-heading" className="space-y-3">
        <h2
          id="objectives-heading"
          className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary"
        >
          Ortak Hedefler
        </h2>
        <div className="glass-card p-5 text-text-muted text-sm text-center">
          Bu sezon için ortak hedef yayınlanmadı.
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="objectives-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2
            id="objectives-heading"
            className="font-display text-sm font-bold tracking-widest uppercase text-text-secondary"
          >
            Ortak Hedefler
          </h2>
          <p className="text-text-muted text-xs">Tüm üyelerin katkısı puana eklenir.</p>
        </div>
        <span className="badge badge-accent">{objectives.length} hedef</span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2" role="list">
        {objectives.map((obj) => (
          <li key={obj.id}>
            <ObjectiveCard objective={obj} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ObjectiveCardProps {
  objective: SharedObjective;
}

function ObjectiveCard({ objective }: ObjectiveCardProps) {
  const pct = Math.min(100, (objective.currentValue / objective.targetValue) * 100);
  const complete = pct >= 100;

  return (
    <article
      className="objective-card"
      aria-label={`${objective.title}: ${objective.currentValue} / ${objective.targetValue} ${objective.unit}`}
    >
      <header className="objective-card__head">
        <span className="objective-card__icon" aria-hidden>
          {objective.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="objective-card__title">{objective.title}</h3>
          <p className="objective-card__desc">{objective.description}</p>
        </div>
        {complete && <span className="badge badge-brand">Tamam</span>}
      </header>

      <div
        className="capacity-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={objective.targetValue}
        aria-valuenow={objective.currentValue}
      >
        <div className="capacity-bar__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="objective-card__numbers">
        <span className="objective-card__progress">
          <span className="objective-card__current">
            {objective.currentValue.toLocaleString('tr-TR')}
          </span>
          <span className="objective-card__target">
            {' '}
            / {objective.targetValue.toLocaleString('tr-TR')} {objective.unit}
          </span>
        </span>
        <span className="objective-card__pct">%{Math.floor(pct)}</span>
      </div>

      <footer className="objective-card__foot">
        <span className="objective-card__contributors">
          <span aria-hidden>👥</span> {objective.contributorCount} katkıcı
        </span>
        <span className="objective-card__time">{formatRemaining(objective.expiresAt)}</span>
      </footer>

      <p className="objective-card__reward">
        <span className="objective-card__reward-label">Ödül</span>
        <span className="objective-card__reward-value">{objective.rewardLabel}</span>
      </p>
    </article>
  );
}
