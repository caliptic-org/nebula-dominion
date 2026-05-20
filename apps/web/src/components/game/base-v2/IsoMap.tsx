'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { Race } from '@/types/units';
import { CAPITAL_BACKDROPS, type GroundRaceKey } from './asset-manifest';
import type { BaseBuilding, RaceBaseSnapshot } from './types';

interface Props {
  snapshot: RaceBaseSnapshot;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

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

const STATUS_LABEL: Record<BaseBuilding['status'], string> = {
  idle: 'Hazır',
  producing: 'Üretim sürüyor',
  upgrading: 'Yükseltiliyor',
  damaged: 'Hasarlı',
};

export function IsoMap({ snapshot, selectedId, onSelect }: Props) {
  const backdrop = CAPITAL_BACKDROPS[groundKey(snapshot.race)];
  return (
    <main className="base-center" role="region" aria-label="İzometrik üs haritası">
      {/* Backdrop stack (bottom → top, DOM order = paint order):
       *   1. .base-ground-layer       race-tinted gradient floor (always on; CSS-driven)
       *   2. .base-capital-backdrop   CAL-486 cinematic artwork (when slot non-null)
       *   3. .base-ambient-glow       CD-spec pulsing race-glow ellipse
       *   4. .base-sigil-watermark    faint race sigil in bottom-right
       * Iso grid + sprites paint above on z-index 1. */}
      <div className="base-ground-layer" aria-hidden />
      {backdrop && (
        <div
          className="base-capital-backdrop"
          aria-hidden
          style={{ backgroundImage: `url(${backdrop})` }}
        />
      )}
      <div className="base-ambient-glow" aria-hidden />
      <div className="base-sigil-watermark" aria-hidden />
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
