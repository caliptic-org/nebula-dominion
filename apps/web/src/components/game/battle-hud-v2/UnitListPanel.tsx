'use client';

import clsx from 'clsx';
import type { BattleUnit } from './types';

interface Props {
  units: BattleUnit[];
  selectedId: string | null;
  populationCap: number;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onSelectIdle: () => void;
  onSelectLowHealth: () => void;
}

const STATUS_LABELS: Record<BattleUnit['status'], string> = {
  attacking: 'SALDIRI',
  defending: 'SAVUN',
  idle: 'BOŞTA',
  moving: 'HAREKET',
};

export function UnitListPanel({
  units,
  selectedId,
  populationCap,
  onSelect,
  onSelectAll,
  onSelectIdle,
  onSelectLowHealth,
}: Props) {
  const idleCount = units.filter((u) => u.status === 'idle').length;
  const lowHpCount = units.filter((u) => u.hp / u.maxHp < 0.4).length;

  return (
    <aside className="battle-left race-panel" aria-label="Birim listesi">
      <div className="panel-header">
        <span>BİRİMLER</span>
        <span className="unit-count">
          {units.length} / {populationCap}
        </span>
      </div>

      <div className="unit-list" role="list">
        {units.map((unit) => {
          const hpPct = unit.hp / unit.maxHp;
          const moralePct = unit.morale / 100;
          const moraleCritical = moralePct < 0.35;
          const isSelected = unit.id === selectedId;
          return (
            <button
              key={unit.id}
              type="button"
              role="listitem"
              className={clsx('unit-row', isSelected && 'selected')}
              onClick={() => onSelect(unit.id)}
              aria-pressed={isSelected}
              aria-label={`${unit.name} — ${Math.round(hpPct * 100)}% can`}
            >
              <div className={clsx('unit-portrait', `status-${unit.status}`)}>
                {unit.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={unit.portrait} alt="" loading="lazy" />
                ) : (
                  <div className="unit-portrait-fallback" aria-hidden>?</div>
                )}
                <span className={clsx('unit-status-badge', unit.status)}>
                  {STATUS_LABELS[unit.status]}
                </span>
              </div>

              <div className="unit-stats">
                <span className="unit-name">{unit.name}</span>

                <div className="stat-bar health-bar" aria-label={`Can ${Math.round(hpPct * 100)} yüzde`}>
                  <div
                    className="stat-fill health-fill"
                    style={{ ['--val' as string]: hpPct }}
                  />
                  <span className="stat-label">{Math.round(hpPct * 100)}%</span>
                </div>

                <div className="stat-bar morale-bar" aria-label={`Moral ${unit.morale}`}>
                  <div
                    className={clsx('stat-fill morale-fill', moraleCritical && 'critical')}
                    style={{ ['--val' as string]: moralePct }}
                  />
                  <span className="stat-label morale-icon">⚡ {unit.morale}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="unit-group-buttons">
        <button type="button" onClick={onSelectAll}>
          Tüm Birimler
        </button>
        <button type="button" onClick={onSelectIdle} disabled={idleCount === 0}>
          Boşta ({idleCount})
        </button>
        <button type="button" onClick={onSelectLowHealth} disabled={lowHpCount === 0}>
          Düşük HP ({lowHpCount})
        </button>
      </div>
    </aside>
  );
}
