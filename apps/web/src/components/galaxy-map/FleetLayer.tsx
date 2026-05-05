'use client';

import { useEffect, useRef } from 'react';
import type { Fleet } from './types';

interface FleetLayerProps {
  fleets: Fleet[];
  width: number;
  height: number;
}

const RACE_COLOR = {
  human: '#4a9eff',
  zerg: '#44ff44',
  automat: '#00cfff',
  beast: '#ff6600',
  demon: '#cc00ff',
} as const;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Canvas-rendered fleets. Position is computed every frame from departedAt
 * /arrivalAt timestamps — no per-frame React state, no DOM thrash. Health
 * bar appears for size>=3.
 */
export function FleetLayer({ fleets, width, height }: FleetLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fleetsRef = useRef(fleets);

  useEffect(() => {
    fleetsRef.current = fleets;
  }, [fleets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      for (const fleet of fleetsRef.current) {
        const { position, destination, departedAt, arrivalAt } = fleet;
        let x = position.x;
        let y = position.y;

        if (destination && departedAt != null && arrivalAt != null && arrivalAt > departedAt) {
          const t = Math.max(0, Math.min(1, (now - departedAt) / (arrivalAt - departedAt)));
          const e = easeInOutCubic(t);
          x = position.x + (destination.x - position.x) * e;
          y = position.y + (destination.y - position.y) * e;
        }

        drawFleetIcon(ctx, fleet, x, y);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="galaxy-fleet-canvas"
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );
}

function drawFleetIcon(ctx: CanvasRenderingContext2D, fleet: Fleet, x: number, y: number) {
  const color = RACE_COLOR[fleet.raceId];
  // Galaxy/sector zoom shows tiny triangles. We size by fleet.size; the
  // map layer scales us up for system zoom — no need to compute LOD here.
  const baseSize = 6 + fleet.size * 1.5;

  // Heading toward destination
  let angle = 0;
  if (fleet.destination) {
    angle = Math.atan2(fleet.destination.y - y, fleet.destination.x - x);
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  if (fleet.type === 'attack') {
    // Sharp arrow pointing forward
    ctx.beginPath();
    ctx.moveTo(0, -baseSize);
    ctx.lineTo(baseSize * 0.6, baseSize);
    ctx.lineTo(0, baseSize * 0.5);
    ctx.lineTo(-baseSize * 0.6, baseSize);
    ctx.closePath();
  } else if (fleet.type === 'defense') {
    // Shield
    ctx.beginPath();
    ctx.moveTo(0, -baseSize);
    ctx.lineTo(baseSize * 0.7, -baseSize * 0.4);
    ctx.lineTo(baseSize * 0.7, baseSize * 0.4);
    ctx.quadraticCurveTo(baseSize * 0.7, baseSize, 0, baseSize);
    ctx.quadraticCurveTo(-baseSize * 0.7, baseSize, -baseSize * 0.7, baseSize * 0.4);
    ctx.lineTo(-baseSize * 0.7, -baseSize * 0.4);
    ctx.closePath();
  } else {
    // Transport — rounded rect
    ctx.beginPath();
    const w = baseSize * 0.8;
    const h = baseSize * 0.5;
    ctx.roundRect?.(-w, -h, w * 2, h * 2, 2);
    if (!ctx.roundRect) ctx.rect(-w, -h, w * 2, h * 2);
    ctx.closePath();
  }

  ctx.fillStyle = color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#040810';
  ctx.stroke();

  ctx.restore();

  // Health bar for size >= 3
  if (fleet.size >= 3) {
    const w = baseSize * 1.6;
    const barY = y + baseSize + 3;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x - w / 2, barY, w, 2);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, barY, w * Math.max(0, Math.min(1, fleet.health)), 2);
  }
}
