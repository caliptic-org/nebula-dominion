'use client';

import type { SolarSystem, TradeLine } from './types';

interface ConnectionLayerProps {
  systems: SolarSystem[];
  lines: TradeLine[];
  width: number;
  height: number;
}

/** Trade routes (gold, dashed) and alliance lines (cyan, solid). Hidden at galaxy zoom. */
export function ConnectionLayer({ systems, lines, width, height }: ConnectionLayerProps) {
  const byId = new Map(systems.map((s) => [s.id, s]));

  return (
    <svg
      className="galaxy-connection-svg"
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
      {lines.map((line, i) => {
        const a = byId.get(line.fromSystemId);
        const b = byId.get(line.toSystemId);
        if (!a || !b) return null;
        const isTrade = line.kind === 'trade';
        return (
          <line
            key={i}
            x1={a.position.x}
            y1={a.position.y}
            x2={b.position.x}
            y2={b.position.y}
            stroke={isTrade ? 'rgba(255, 200, 60, 0.45)' : 'rgba(0, 207, 255, 0.55)'}
            strokeWidth={isTrade ? 1.5 : 1.25}
            strokeDasharray={isTrade ? '6 4' : undefined}
          />
        );
      })}
    </svg>
  );
}
