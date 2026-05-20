'use client';

import clsx from 'clsx';
import { Race } from '@/types/units';
import { BATTLEFIELD_BOUNDS } from './types';
import type { BattleUnit, DamageNumber, StatusEffectType } from './types';
import { BATTLEFIELD_TEXTURES, GROUND_TEXTURES, type GroundRaceKey } from '../base-v2/asset-manifest';

interface Props {
  units: BattleUnit[];
  enemies: BattleUnit[];
  selectedUnitId: string | null;
  damageNumbers: DamageNumber[];
  race: Race;
  onSelectUnit: (id: string) => void;
}

/** Map Race enum to the English manifest key. */
function groundKey(race: Race): GroundRaceKey {
  switch (race) {
    case Race.INSAN:   return 'human';
    case Race.ZERG:    return 'zerg';
    case Race.OTOMAT:  return 'automat';
    case Race.CANAVAR: return 'beast';
    case Race.SEYTAN:  return 'demon';
    default:           return 'human';
  }
}

const STATUS_EFFECT_GLYPHS: Record<StatusEffectType, string> = {
  shield:     '🛡',
  poison:     '☠',
  burn:       '🔥',
  freeze:     '❄',
  stun:       '⚡',
  regenerate: '💚',
  haste:      '💨',
  slow:       '🐌',
};

export function BattleGround({
  units,
  enemies,
  selectedUnitId,
  damageNumbers,
  race,
  onSelectUnit,
}: Props) {
  const key = groundKey(race);
  const groundUrl = BATTLEFIELD_TEXTURES[key as keyof typeof BATTLEFIELD_TEXTURES] ?? GROUND_TEXTURES[key];
  return (
    <section className="battle-arena" aria-label="Savaş alanı">
      <div
        className="battle-ground"
        style={groundUrl ? { backgroundImage: `url(${groundUrl})` } : undefined}
        aria-hidden
      />
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
          const hpCritical = isFriendly && unit.hp / unit.maxHp < 0.25;
          const activeEffects = unit.statusEffects?.filter((fx) => fx.duration > 0) ?? [];

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
              data-hp-critical={hpCritical ? 'true' : undefined}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              onClick={isFriendly ? () => onSelectUnit(unit.id) : undefined}
              aria-label={`${isFriendly ? 'Dost' : 'Düşman'} birim: ${unit.name}`}
              tabIndex={isFriendly ? 0 : -1}
            >
              {/* Status effect icon strip — only shown for friendly units */}
              {isFriendly && activeEffects.length > 0 && (
                <div className="unit-sprite-effects" aria-hidden>
                  {activeEffects.slice(0, 3).map((fx, idx) => (
                    <span key={`${fx.type}-${idx}`} className={`status-effect-icon ${fx.type}`}>
                      {STATUS_EFFECT_GLYPHS[fx.type]}
                      {fx.stacks && fx.stacks > 1 && (
                        <span className="status-effect-stacks">{fx.stacks}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

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
