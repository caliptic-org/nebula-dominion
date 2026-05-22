/* Race-specific corner / clip shapes used by tabs, pills, badges, and the
 * base-vitals widget across the handoff screens. Each race has a distinct
 * silhouette language — keeping it centralised so screens stay terse.
 */
import type { CSSProperties } from 'react';
import type { NDRaceKey } from './nd-tokens';

/** Variant strength: 'tab' (small), 'card' (medium), 'panel' (large). */
export type RaceShapeKind = 'tab' | 'card' | 'panel' | 'pill';

export function raceShape(key: NDRaceKey, kind: RaceShapeKind = 'card'): CSSProperties {
  const big = kind === 'panel';
  const small = kind === 'tab' || kind === 'pill';
  switch (key) {
    case 'insan': {
      const c = small ? 4 : big ? 10 : 6;
      return {
        clipPath: `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`,
      };
    }
    case 'zerg':
      return { borderRadius: small ? '12px 3px 12px 3px' : big ? '18px 4px 18px 4px' : '14px 4px 14px 4px' };
    case 'otomat':
      return { borderRadius: 1 };
    case 'canavar':
      return { borderRadius: small ? '2px 8px 1px 6px' : big ? '4px 14px 4px 14px' : '2px 12px 2px 12px' };
    case 'seytan': {
      const t = small ? '30%' : big ? '18%' : '25%';
      const b = small ? '70%' : big ? '82%' : '75%';
      return {
        clipPath: `polygon(50% 0, 100% ${t}, 100% ${b}, 50% 100%, 0 ${b}, 0 ${t})`,
      };
    }
  }
}
