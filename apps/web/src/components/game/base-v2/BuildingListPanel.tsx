'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { BaseBuilding } from './types';

interface Props {
  buildings: BaseBuilding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_LABELS: Record<BaseBuilding['status'], string> = {
  idle: 'Hazır',
  producing: 'Üretiyor',
  upgrading: 'Yükseltiyor',
  damaged: 'Hasarlı',
};

export function BuildingListPanel({ buildings, selectedId, onSelect }: Props) {
  return (
    <aside className="base-left-panel" aria-label="Yapı listesi">
      <div className="base-panel-header">Yapılar · {buildings.length}</div>
      <ul className="base-building-list">
        {buildings.map((b) => {
          const slots = Array.from({ length: Math.max(b.queueCapacity, b.queue.length, 0) }, (_, i) => b.queue[i] ?? null);
          return (
            <li key={b.id}>
              <button
                type="button"
                className={clsx('base-building-row', selectedId === b.id && 'is-selected')}
                onClick={() => onSelect(b.id)}
                aria-pressed={selectedId === b.id}
              >
                <span className="base-building-thumb">
                  <Image src={b.thumbnail} alt="" width={48} height={48} unoptimized />
                  <span className="base-building-level">Lv.{b.level}</span>
                </span>
                <span className="base-building-info">
                  <span className="base-building-name">{b.name}</span>
                  {slots.length > 0 && (
                    <span className="base-queue-strip" aria-hidden={slots.every((s) => !s)}>
                      {slots.slice(0, 5).map((slot, idx) => {
                        if (!slot) {
                          return (
                            <span key={`empty-${idx}`} className="base-queue-slot is-empty">·</span>
                          );
                        }
                        const progress = 1 - slot.remainingSeconds / slot.buildSeconds;
                        const isActive = idx === 0;
                        return (
                          <span
                            key={slot.id}
                            className={clsx('base-queue-slot', isActive && 'is-active')}
                            title={`${slot.unitLabel} · ${Math.ceil(slot.remainingSeconds)}s`}
                          >
                            <span aria-hidden>{slot.unitIcon}</span>
                            {isActive && (
                              <>
                                <span className="base-queue-timer">{Math.ceil(slot.remainingSeconds)}s</span>
                                <span
                                  className="base-queue-progress"
                                  style={{ ['--progress' as string]: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                                />
                              </>
                            )}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </span>
                <span className={`base-building-status ${b.status}`}>
                  {STATUS_LABELS[b.status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
