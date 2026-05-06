'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { ABILITY_ICONS } from '../base-v2/asset-manifest';
import type { AbilityDef, BattleUnit, ControlGroup } from './types';

function abilityIcon(a: AbilityDef): string | undefined {
  return a.iconKey ? ABILITY_ICONS[a.iconKey] : undefined;
}

interface Props {
  unit: BattleUnit | null;
  abilities: AbilityDef[];
  controlGroups: ControlGroup[];
  activeGroup: number | null;
  onCastAbility: (id: string) => void;
  onSelectGroup: (num: number) => void;
}

export function BattleCommandCard({
  unit,
  abilities,
  controlGroups,
  activeGroup,
  onCastAbility,
  onSelectGroup,
}: Props) {
  return (
    <footer className="battle-command race-panel" aria-label="Komut kartı">
      <div className="battle-portrait">
        {unit && unit.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.portrait} alt={unit.name} />
        ) : (
          <div className="battle-portrait-empty" aria-hidden>—</div>
        )}
        {unit && (
          <>
            <div className="portrait-bars">
              <div className="portrait-hp-bar">
                <div
                  className="portrait-hp-fill"
                  style={{ ['--val' as string]: unit.hp / unit.maxHp }}
                />
              </div>
              <div className="portrait-mp-bar">
                <div
                  className="portrait-mp-fill"
                  style={{ ['--val' as string]: unit.morale / 100 }}
                />
              </div>
            </div>
            <span className="portrait-unit-name">{unit.name}</span>
          </>
        )}
      </div>

      <div className="ability-grid" role="group" aria-label="Yetenekler">
        {abilities.map((ability) => {
          const onCooldown = ability.remainingCooldown > 0;
          const cdRatio = ability.cooldownSeconds > 0
            ? ability.remainingCooldown / ability.cooldownSeconds
            : 0;
          const iconUrl = abilityIcon(ability);
          return (
            <button
              key={ability.id}
              type="button"
              className={clsx(
                'ability-btn',
                ability.ultimate && 'ultimate',
                onCooldown ? 'cooldown' : 'ready',
              )}
              onClick={() => !onCooldown && onCastAbility(ability.id)}
              disabled={onCooldown}
              data-hotkey={ability.hotkey}
              data-ability={ability.id}
              title={`${ability.name}${onCooldown ? ` — ${ability.remainingCooldown.toFixed(1)}s` : ''}\n${ability.description}`}
            >
              <span className="ability-hotkey">{ability.hotkey}</span>
              <div className={clsx('ability-icon', ability.ultimate && 'ultimate-glow')}>
                {iconUrl ? (
                  <Image
                    src={iconUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="ability-icon-img"
                    unoptimized
                  />
                ) : (
                  <span className="ability-glyph" aria-hidden>{ability.glyph}</span>
                )}
                <div
                  className="cooldown-overlay"
                  style={{ ['--cd' as string]: cdRatio }}
                />
                {onCooldown && (
                  <span className="cd-timer">{Math.ceil(ability.remainingCooldown)}</span>
                )}
              </div>
              <span className="ability-name">{ability.name}</span>
            </button>
          );
        })}
      </div>

      <div className="battle-group-select" role="group" aria-label="Kontrol grupları">
        {controlGroups.map((g) => (
          <button
            key={g.num}
            type="button"
            className={clsx('group-slot', g.size === 0 && 'empty', activeGroup === g.num && 'active')}
            onClick={() => onSelectGroup(g.num)}
            disabled={g.size === 0}
            aria-pressed={activeGroup === g.num}
            aria-label={`Grup ${g.num} — ${g.size} birim`}
          >
            <span className="group-num">{g.num}</span>
            <span className="group-size">{g.size}</span>
          </button>
        ))}
      </div>
    </footer>
  );
}
