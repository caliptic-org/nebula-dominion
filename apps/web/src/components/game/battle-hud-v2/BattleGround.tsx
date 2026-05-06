'use client';

import clsx from 'clsx';
import { BATTLEFIELD_BOUNDS } from './types';
import type { BattleUnit, DamageNumber } from './types';

interface Props {
  units: BattleUnit[];
  enemies: BattleUnit[];
  selectedUnitId: string | null;
  damageNumbers: DamageNumber[];
  onSelectUnit: (id: string) => void;
}

export function BattleGround({
  units,
  enemies,
  selectedUnitId,
  damageNumbers,
  onSelectUnit,
}: Props) {
  return (
    <section className="battle-arena" aria-label="Savaş alanı">
      <div className="battle-ground" aria-hidden />
      <div className="battle-ground-haze" aria-hidden />
      <div
        className="battle-world"
        style={{
          aspectRatio: `${BATTLEFIELD_BOUNDS.width} / ${BATTLEFIELD_BOUNDS.height}`,
        }}
      >
        {/* Friendly + enemy unit sprites */}
        {[...units, ...enemies].map((unit) => {
          const xPct = (unit.x / BATTLEFIELD_BOUNDS.width) * 100;
          const yPct = (unit.y / BATTLEFIELD_BOUNDS.height) * 100;
          const isFriendly = unit.side === 'friendly';
          const isSelected = unit.id === selectedUnitId;
          return (
            <button
              key={unit.id}
              type="button"
              className={clsx(
                'unit-sprite',
                isFriendly ? 'friendly' : 'enemy',
                isSelected && 'selected',
                isFriendly && unit.status === 'attacking' && 'taking-damage',
              )}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              onClick={isFriendly ? () => onSelectUnit(unit.id) : undefined}
              aria-label={`${isFriendly ? 'Dost' : 'Düşman'} birim: ${unit.name}`}
              tabIndex={isFriendly ? 0 : -1}
            >
              <div className="unit-sprite-body">
                {isFriendly && unit.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={unit.portrait} alt="" loading="lazy" />
                ) : (
                  <span className="unit-sprite-glyph" aria-hidden>
                    {isFriendly ? '◆' : '◇'}
                  </span>
                )}
              </div>
              <div className="unit-sprite-hp" aria-hidden>
                <div
                  className="unit-sprite-hp-fill"
                  style={{ ['--val' as string]: unit.hp / unit.maxHp }}
                />
              </div>
            </button>
          );
        })}

        {/* Floating damage numbers */}
        <div className="damage-layer" aria-hidden>
          {damageNumbers.map((d) => {
            const xPct = (d.x / BATTLEFIELD_BOUNDS.width) * 100;
            const yPct = (d.y / BATTLEFIELD_BOUNDS.height) * 100;
            return (
              <span
                key={d.id}
                className={clsx('damage-number', `damage-${d.type}`)}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                {d.type === 'miss' ? 'KAÇTI' : d.type === 'heal' ? `+${d.value}` : d.value}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
