'use client';

import { useEffect, useRef } from 'react';
import { BATTLEFIELD_BOUNDS } from './types';
import type { BattleUnit } from './types';

interface Props {
  friendlyUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  combats: { x: number; y: number }[];
  raceColor: string;
  selectedUnitId: string | null;
  onJumpTo?: (x: number, y: number) => void;
}

const W = 190;
const H = 140;

export function BattleMinimap({
  friendlyUnits,
  enemyUnits,
  combats,
  raceColor,
  selectedUnitId,
  onJumpTo,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const project = (x: number, y: number) => ({
      x: (x / BATTLEFIELD_BOUNDS.width) * W,
      y: (y / BATTLEFIELD_BOUNDS.height) * H,
    });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(4,8,16,0.95)');
      grad.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle race grid
      ctx.strokeStyle = `${raceColor}22`;
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        const x = (W / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i++) {
        const y = (H / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Friendly units (race color)
      ctx.fillStyle = raceColor;
      friendlyUnits.forEach((u) => {
        const p = project(u.x, u.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, u.id === selectedUnitId ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Selected ring
      const sel = friendlyUnits.find((u) => u.id === selectedUnitId);
      if (sel) {
        const p = project(sel.x, sel.y);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Enemy units (red)
      ctx.fillStyle = '#ff2244';
      enemyUnits.forEach((u) => {
        const p = project(u.x, u.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Active combat pulse
      const phase = (Math.sin(Date.now() / 280) + 1) / 2;
      combats.forEach((c) => {
        const p = project(c.x, c.y);
        ctx.strokeStyle = `rgba(255,34,68,${0.35 + 0.5 * phase})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 + phase * 4, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Static viewport rectangle (mock — center 60% of map)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(W * 0.2, H * 0.2, W * 0.6, H * 0.6);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [friendlyUnits, enemyUnits, combats, raceColor, selectedUnitId]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onJumpTo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wx = (px / W) * BATTLEFIELD_BOUNDS.width;
    const wy = (py / H) * BATTLEFIELD_BOUNDS.height;
    onJumpTo(wx, wy);
  }

  return (
    <div className="battle-minimap" aria-label="Mini harita">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        role="img"
        aria-label="Savaş alanı küçültülmüş görünüm"
      />
      <div className="battle-minimap-legend" aria-hidden>
        <span className="legend-friendly" style={{ background: raceColor }} /> Dost
        <span className="legend-enemy" /> Düşman
      </div>
    </div>
  );
}
