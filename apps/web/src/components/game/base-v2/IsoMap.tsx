'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { Race } from '@/types/units';
import { GROUND_TEXTURES } from './asset-manifest';
import type { BaseBuilding, RaceBaseSnapshot } from './types';

interface Props {
  snapshot: RaceBaseSnapshot;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Map a Race enum value to the matching ground-manifest key. */
function groundKey(race: Race): keyof typeof GROUND_TEXTURES {
  switch (race) {
    case Race.INSAN:   return 'human';
    case Race.ZERG:    return 'zerg';
    case Race.OTOMAT:  return 'automat';
    case Race.CANAVAR: return 'beast';
    case Race.SEYTAN:  return 'demon';
    default:           return 'human';
  }
}

const STATUS_LABEL: Record<BaseBuilding['status'], string> = {
  idle: 'Hazır',
  producing: 'Üretim sürüyor',
  upgrading: 'Yükseltiliyor',
  damaged: 'Hasarlı',
};

export function IsoMap({ snapshot, selectedId, onSelect }: Props) {
  return (
    <main className="base-center" role="region" aria-label="İzometrik üs haritası">
      <div
        className="base-ground-layer"
        aria-hidden
        style={{
          backgroundImage: `url(${GROUND_TEXTURES[groundKey(snapshot.race)]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="base-iso-grid">
        <div className="base-grid-overlay" aria-hidden />
        {snapshot.buildings.map((b) => {
          const isSelected = selectedId === b.id;
          const headPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
          const activeQueue = b.queue[0];
          const tooltipLine =
            b.status === 'producing' && activeQueue
              ? `${activeQueue.unitLabel} üretiliyor · ${Math.ceil(activeQueue.remainingSeconds)}s`
              : STATUS_LABEL[b.status];
          return (
            <button
              key={b.id}
              type="button"
              className={clsx('base-building-sprite', isSelected && 'is-selected')}
              style={{
                ['--iso-x' as string]: b.isoX,
                ['--iso-y' as string]: b.isoY,
              }}
              data-building-id={b.id}
              onClick={() => onSelect(b.id)}
              aria-label={`${b.name} — Seviye ${b.level}, ${STATUS_LABEL[b.status]}`}
              aria-pressed={isSelected}
            >
              <span className="base-sprite-shadow" aria-hidden />
              <Image src={b.isoSprite} alt="" width={132} height={132} unoptimized />
              {(b.status === 'producing' || b.status === 'upgrading') && (
                <span
                  className={clsx(
                    'base-production-ring',
                    b.status === 'upgrading' && 'is-upgrade',
                  )}
                  aria-hidden
                />
              )}
              <span className="base-health-bar" aria-hidden>
                <span className="base-health-fill" style={{ ['--hp' as string]: headPct }} />
              </span>
              <span className="base-building-tooltip" role="tooltip">
                <span className="base-tooltip-title">{b.name} · Lv.{b.level}</span>
                <span className="base-tooltip-line">{tooltipLine}</span>
                <span className="base-tooltip-line">
                  {Math.round(b.hp).toLocaleString('tr-TR')} / {b.maxHp.toLocaleString('tr-TR')} HP
                </span>
                <span className="base-tooltip-hint">Tıkla: detay</span>
              </span>
            </button>
          );
        })}
        {snapshot.rallyPoint && (
          <span
            className="base-rally-marker"
            style={{
              ['--iso-x' as string]: snapshot.rallyPoint.x,
              ['--iso-y' as string]: snapshot.rallyPoint.y,
            }}
            aria-label="Toplanma noktası"
            title="Toplanma Noktası"
          >
            ⚑
          </span>
        )}
      </div>
    </main>
  );
}
