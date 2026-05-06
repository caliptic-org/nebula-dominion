'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { BaseBuilding, ResourceState } from './types';

interface Props {
  building: BaseBuilding | null;
  resources: ResourceState;
  onCancelQueueItem: (buildingId: string, queueId: string) => void;
  onUpgrade: (buildingId: string) => void;
  onDemolish: (buildingId: string) => void;
}

export function BuildingDetailPanel({
  building,
  resources,
  onCancelQueueItem,
  onUpgrade,
  onDemolish,
}: Props) {
  if (!building) {
    return (
      <aside className="base-right-panel" aria-label="Yapı detayı">
        <div className="base-panel-header">Detay</div>
        <div className="base-detail-empty">
          Bir yapı seç — sol panelden veya haritadan.
        </div>
      </aside>
    );
  }

  const hpPct = Math.max(0, Math.min(1, building.hp / building.maxHp));
  const upgrade = building.upgrade;
  const upgradeAffordable =
    !!upgrade &&
    resources.mineral >= upgrade.costMineral &&
    resources.gas >= upgrade.costGas;

  return (
    <aside className="base-right-panel" aria-label="Yapı detayı">
      <div className="base-panel-header">{building.name}</div>
      <div className="base-detail">
        <div className="base-detail-header">
          <div className="base-detail-portrait">
            <Image src={building.thumbnail} alt="" width={72} height={72} unoptimized />
          </div>
          <div>
            <h2 className="base-detail-name">{building.name}</h2>
            <div className="base-detail-meta">
              Seviye {building.level} / {building.maxLevel}
            </div>
            <div className="base-detail-hp" aria-label="Sağlık">
              <div className="base-detail-hp-bar">
                <div className="base-detail-hp-fill" style={{ ['--hp' as string]: hpPct }} />
              </div>
              <span className="base-detail-hp-label">
                {Math.round(building.hp).toLocaleString('tr-TR')} / {building.maxHp.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
        </div>

        {building.queueCapacity > 0 && (
          <section className="base-detail-section">
            <h3>Üretim Kuyruğu · {building.queue.length} / {building.queueCapacity}</h3>
            {building.queue.length === 0 ? (
              <div className="base-detail-meta">Kuyruk boş.</div>
            ) : (
              <div className="base-queue-full">
                {building.queue.map((item, idx) => {
                  const isActive = idx === 0;
                  const progress = 1 - item.remainingSeconds / item.buildSeconds;
                  return (
                    <div
                      key={item.id}
                      className={clsx('base-queue-item', isActive && 'is-active')}
                    >
                      <div className="base-queue-item-portrait" aria-hidden>{item.unitIcon}</div>
                      <div className="base-queue-item-info">
                        <span className="base-queue-item-name">
                          {item.unitLabel} {!isActive && `· #${idx + 1}`}
                        </span>
                        {isActive && (
                          <span className="base-queue-item-bar">
                            <span
                              className="base-queue-item-fill"
                              style={{ ['--progress' as string]: Math.max(0, Math.min(1, progress)) }}
                            />
                          </span>
                        )}
                      </div>
                      <div className="base-queue-item-time">{Math.ceil(item.remainingSeconds)}s</div>
                      <button
                        type="button"
                        className="base-queue-cancel"
                        aria-label="Kuyruktan kaldır"
                        onClick={() => onCancelQueueItem(building.id, item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {upgrade && (
          <section className="base-detail-section">
            <h3>Yükseltme</h3>
            <button
              type="button"
              className="base-upgrade-btn"
              disabled={!upgradeAffordable}
              onClick={() => onUpgrade(building.id)}
            >
              <span className="base-upgrade-label">
                Lv.{upgrade.nextLevel} Yükselt
              </span>
              <span className="base-upgrade-cost">
                {upgrade.costMineral > 0 && <>💎 {upgrade.costMineral}</>}
                {upgrade.costGas > 0 && <> · ⚗️ {upgrade.costGas}</>}
              </span>
              <span className="base-upgrade-time">{upgrade.seconds}s</span>
            </button>
          </section>
        )}

        <section className="base-detail-section">
          <h3>Tehlike Bölgesi</h3>
          <button
            type="button"
            className="base-demolish-btn"
            onClick={() => onDemolish(building.id)}
          >
            <span className="base-upgrade-label">Yık</span>
            <span className="base-upgrade-cost">Geri: %50 kaynak</span>
            <span className="base-upgrade-time">5s</span>
          </button>
        </section>
      </div>
    </aside>
  );
}
