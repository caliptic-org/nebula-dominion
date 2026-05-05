'use client';

import { useMemo } from 'react';
import type { SolarSystem, RaceCode } from './types';
import { computeVoronoi, polygonToSvgPoints } from './voronoi';

interface TerritoryLayerProps {
  systems: SolarSystem[];
  width: number;
  height: number;
}

/** Per-race CSS variable mapping for fill + stroke. */
const RACE_VAR_FALLBACK: Record<RaceCode, string> = {
  human: '#4a9eff',
  zerg: '#44ff44',
  automat: '#00cfff',
  beast: '#ff6600',
  demon: '#cc00ff',
};

/**
 * Voronoi-tiled territory polygons. Owner-less seeds still receive a cell
 * but render as a translucent neutral shape, which keeps the tessellation
 * visually contiguous instead of leaving holes.
 */
export function TerritoryLayer({ systems, width, height }: TerritoryLayerProps) {
  const cells = useMemo(
    () => computeVoronoi(
      systems.map((s) => ({ id: s.id, position: s.position })),
      { x: 0, y: 0, width, height },
    ),
    [systems, width, height],
  );

  return (
    <svg
      className="galaxy-territory-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <defs>
        <radialGradient id="territory-fade" r="50%" cx="50%" cy="50%">
          <stop offset="60%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </radialGradient>
        <mask id="territory-fade-mask">
          <rect width="100%" height="100%" fill="url(#territory-fade)" />
        </mask>
      </defs>
      {cells.map((cell) => {
        const sys = systems.find((s) => s.id === cell.seedId);
        if (!sys || !sys.owner) return null;
        const color = RACE_VAR_FALLBACK[sys.owner];
        return (
          <polygon
            key={cell.seedId}
            data-race={sys.owner}
            data-contested={sys.contested ? 'true' : undefined}
            className={
              'territory-region' + (sys.contested ? ' contested' : '')
            }
            points={polygonToSvgPoints(cell.polygon)}
            style={{
              fill: `var(--race-primary, ${color})`,
              stroke: `var(--race-primary, ${color})`,
            }}
          />
        );
      })}
    </svg>
  );
}
