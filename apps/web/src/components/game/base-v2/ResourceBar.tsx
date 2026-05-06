'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ABILITY_ICONS } from './asset-manifest';
import type { ResourceState } from './types';

interface Props {
  resources: ResourceState;
  elapsedSeconds: number;
}

const formatClock = (totalSeconds: number) => {
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

function ResourceCounter({
  icon,
  iconAsset,
  label,
  value,
  rate,
  color,
}: {
  icon: string;
  iconAsset?: string;
  label: string;
  value: number | string;
  rate?: number;
  color?: string;
}) {
  const [bumped, setBumped] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setBumped(true);
      const t = window.setTimeout(() => setBumped(false), 380);
      return () => window.clearTimeout(t);
    }
  }, [value]);

  return (
    <div className="base-resource-item" title={label}>
      {iconAsset ? (
        <Image
          src={iconAsset}
          alt=""
          width={20}
          height={20}
          className="base-resource-icon-img"
          unoptimized
        />
      ) : (
        <span className="base-resource-icon" aria-hidden>{icon}</span>
      )}
      <span className={`base-resource-value${bumped ? ' is-bumped' : ''}`} style={color ? { color } : undefined}>
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </span>
      {typeof rate === 'number' && rate !== 0 && (
        <span className={`base-resource-rate ${rate > 0 ? 'positive' : 'negative'}`}>
          {rate > 0 ? '+' : ''}{rate}/s
        </span>
      )}
      <span className="base-resource-label">{label}</span>
    </div>
  );
}

export function ResourceBar({ resources, elapsedSeconds }: Props) {
  return (
    <header className="base-resource-bar" aria-label="Kaynak çubuğu">
      <ResourceCounter
        icon="💎"
        label="Mineral"
        value={resources.mineral}
        rate={resources.rates.mineral}
        color="#7cc6ff"
      />
      <ResourceCounter
        icon="⚗️"
        iconAsset={ABILITY_ICONS.gas}
        label="Gaz"
        value={resources.gas}
        rate={resources.rates.gas}
        color="#7cffaa"
      />
      <ResourceCounter
        icon="⚡"
        iconAsset={ABILITY_ICONS.energy}
        label="Enerji"
        value={resources.energy}
        rate={resources.rates.energy}
        color="#ffd84a"
      />
      <ResourceCounter
        icon="👥"
        iconAsset={ABILITY_ICONS.population}
        label="Nüfus"
        value={`${resources.population.current} / ${resources.population.cap}`}
        color={resources.population.current >= resources.population.cap ? '#ff4d6b' : undefined}
      />
      <div className="base-clock" aria-label="Savaş zamanı">
        <span className="base-clock-time">{formatClock(elapsedSeconds)}</span>
        <span className="base-clock-label">Savaş Zamanı</span>
      </div>
    </header>
  );
}
