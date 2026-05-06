'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { BaseBuilding, CommandAction, ResourceState } from './types';

interface Props {
  building: BaseBuilding | null;
  resources: ResourceState;
  onCommand: (buildingId: string, action: CommandAction) => void;
}

const COMMAND_GRID_SLOTS = 8;

const STATUS_LABEL: Record<BaseBuilding['status'], string> = {
  idle: 'Hazır',
  producing: 'Üretiyor',
  upgrading: 'Yükseltiliyor',
  damaged: 'Hasarlı',
};

function isAffordable(action: CommandAction, resources: ResourceState) {
  if (action.costMineral && resources.mineral < action.costMineral) return false;
  if (action.costGas && resources.gas < action.costGas) return false;
  if (action.costEnergy && resources.energy < action.costEnergy) return false;
  if (
    action.popCost &&
    resources.population.current + action.popCost > resources.population.cap
  ) {
    return false;
  }
  return true;
}

export function CommandCard({ building, resources, onCommand }: Props) {
  const [hoveredAction, setHoveredAction] = useState<CommandAction | null>(null);

  useEffect(() => {
    setHoveredAction(null);
  }, [building?.id]);

  // Hotkey listener — pressing a building's command hotkey fires the action.
  useEffect(() => {
    if (!building) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const action = building.commands.find((a) => a.hotkey.toLowerCase() === e.key.toLowerCase());
      if (action && isAffordable(action, resources)) {
        e.preventDefault();
        onCommand(building.id, action);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [building, resources, onCommand]);

  const slots = Array.from({ length: COMMAND_GRID_SLOTS }, (_, i) => building?.commands[i] ?? null);
  const previewAction = hoveredAction ?? building?.commands[0] ?? null;

  return (
    <footer className="base-command-card" aria-label="Komut kartı">
      <div className="base-command-portrait">
        {building ? (
          <>
            <div className="base-command-portrait-img">
              <Image src={building.thumbnail} alt="" width={80} height={80} unoptimized />
            </div>
            <div>
              <div className="base-command-portrait-name">{building.name}</div>
              <div className="base-command-portrait-status">{STATUS_LABEL[building.status]}</div>
              <div className="base-command-portrait-status">Lv.{building.level} / {building.maxLevel}</div>
            </div>
          </>
        ) : (
          <div className="base-command-portrait-status">Bir yapı veya birim seç.</div>
        )}
      </div>

      <div className="base-command-buttons" role="group" aria-label="Komut butonları">
        {slots.map((action, idx) => {
          if (!action) {
            return <button key={`empty-${idx}`} type="button" className="base-cmd-btn base-cmd-empty" aria-hidden tabIndex={-1} />;
          }
          const affordable = isAffordable(action, resources);
          return (
            <button
              key={action.id}
              type="button"
              className={clsx('base-cmd-btn', !affordable && 'is-insufficient')}
              data-hotkey={action.hotkey}
              onClick={() => affordable && building && onCommand(building.id, action)}
              onMouseEnter={() => setHoveredAction(action)}
              onMouseLeave={() => setHoveredAction(null)}
              onFocus={() => setHoveredAction(action)}
              onBlur={() => setHoveredAction(null)}
              disabled={!affordable}
              title={`${action.label} (${action.hotkey})`}
              aria-label={`${action.label} — kısayol ${action.hotkey}`}
            >
              <span className="base-cmd-hotkey">{action.hotkey}</span>
              <span className="base-cmd-icon" aria-hidden>{action.icon}</span>
              <span className="base-cmd-label">{action.label}</span>
              {(action.costMineral || action.costGas) && (
                <span className="base-cmd-cost">
                  {action.costMineral ? `💎${action.costMineral}` : ''}
                  {action.costGas ? ` ⚗️${action.costGas}` : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="base-command-info" aria-live="polite">
        {previewAction ? (
          <>
            <div className="base-command-info-title">{previewAction.label}</div>
            <div className="base-command-info-text">{previewAction.description}</div>
            <div className="base-command-info-meta">
              {previewAction.costMineral ? `Mineral ${previewAction.costMineral} · ` : ''}
              {previewAction.costGas ? `Gaz ${previewAction.costGas} · ` : ''}
              {previewAction.buildSeconds ? `${previewAction.buildSeconds}s` : ''}
            </div>
          </>
        ) : (
          <>
            <div className="base-command-info-title">Komut Bekleniyor</div>
            <div className="base-command-info-text">
              Bir yapı seç ve onun komut kartını gör. Q/W/E/R hotkey'leri aktiftir.
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
