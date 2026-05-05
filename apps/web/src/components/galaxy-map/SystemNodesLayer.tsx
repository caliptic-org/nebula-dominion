'use client';

import type { SolarSystem } from './types';

interface SystemNodesLayerProps {
  systems: SolarSystem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * DOM-based nodes — kept as DOM (not canvas) so they're individually
 * focusable / clickable. LOD is driven entirely by `data-zoom` on the
 * map root via CSS rules in galaxy-map.css; this component only emits
 * markup for *every* system and lets CSS hide irrelevant detail.
 */
export function SystemNodesLayer({ systems, selectedId, onSelect }: SystemNodesLayerProps) {
  return (
    <div className="galaxy-system-layer">
      {systems.map((sys) => (
        <button
          key={sys.id}
          className={
            'system-node' +
            (sys.underAttack ? ' under-attack' : '') +
            (selectedId === sys.id ? ' is-selected' : '')
          }
          data-race={sys.owner ?? 'neutral'}
          style={{
            left: sys.position.x,
            top: sys.position.y,
          }}
          onClick={() => onSelect(sys.id)}
          aria-label={`${sys.name} sistemi`}
        >
          <span className="system-core" aria-hidden />
          <span className="system-label">{sys.name}</span>

          <div className="resource-badges" aria-hidden>
            {sys.resources.mineral != null && (
              <span className="resource-badge mineral" title={`Mineral: ${sys.resources.mineral}`}>
                <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 8,4 4,8 0,4" fill="currentColor" /></svg>
                <span className="resource-count">{sys.resources.mineral}</span>
              </span>
            )}
            {sys.resources.gas != null && (
              <span className="resource-badge gas" title={`Gas: ${sys.resources.gas}`}>
                <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor" /></svg>
                <span className="resource-count">{sys.resources.gas}</span>
              </span>
            )}
            {sys.resources.energy != null && (
              <span className="resource-badge energy" title={`Enerji: ${sys.resources.energy}`}>
                <svg width="8" height="8" viewBox="0 0 8 8"><polygon points="4,0 6,4 4,4 4,8 2,4 4,4" fill="currentColor" /></svg>
                <span className="resource-count">{sys.resources.energy}</span>
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
