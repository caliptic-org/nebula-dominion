'use client';

import { useEffect, useRef } from 'react';
import type { RaceBaseSnapshot } from './types';

interface Props {
  snapshot: RaceBaseSnapshot;
  selectedId: string | null;
  raceColor: string;
  onJumpTo: (col: number, row: number) => void;
}

const W = 220;
const H = 156;

export function Minimap({ snapshot, selectedId, raceColor, onJumpTo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = W * ratio;
    canvas.height = H * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, W, H);

    // Background gradient — subtle race tint
    const grad = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, W);
    grad.addColorStop(0, 'rgba(40, 60, 90, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid hatching
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < snapshot.gridWidth; i++) {
      const x = (i / snapshot.gridWidth) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let j = 0; j < snapshot.gridHeight; j++) {
      const y = (j / snapshot.gridHeight) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const tileW = W / snapshot.gridWidth;
    const tileH = H / snapshot.gridHeight;

    // Draw buildings as race-colored squares
    snapshot.buildings.forEach((b) => {
      const x = b.isoX * tileW;
      const y = b.isoY * tileH;
      const isSelected = b.id === selectedId;
      ctx.fillStyle = raceColor;
      ctx.globalAlpha = isSelected ? 1 : 0.85;
      const size = isSelected ? 7 : 5;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      if (isSelected) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - size / 2 - 1, y - size / 2 - 1, size + 2, size + 2);
      }
    });
    ctx.globalAlpha = 1;

    // Rally point
    if (snapshot.rallyPoint) {
      const x = snapshot.rallyPoint.x * tileW;
      const y = snapshot.rallyPoint.y * tileH;
      ctx.fillStyle = raceColor;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Pings
    snapshot.pings.forEach((p) => {
      const px = p.x * tileW;
      const py = p.y * tileH;
      ctx.fillStyle =
        p.tone === 'enemy' ? '#ff4d6b'
        : p.tone === 'ally' ? '#44ff88'
        : '#ffd84a';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      if (p.tone === 'enemy') {
        ctx.strokeStyle = 'rgba(255, 80, 100, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [snapshot, selectedId, raceColor]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.round((x / rect.width) * snapshot.gridWidth);
    const row = Math.round((y / rect.height) * snapshot.gridHeight);
    onJumpTo(col, row);
  };

  return (
    <div
      className="base-minimap"
      role="img"
      aria-label="Mini harita"
      onClick={handleClick}
    >
      <span className="base-minimap-label">Mini Harita</span>
      <canvas ref={canvasRef} style={{ width: W, height: H }} />
      <div
        className="base-minimap-viewport"
        style={{
          left: '20%',
          top: '15%',
          width: '60%',
          height: '60%',
        }}
        aria-hidden
      />
    </div>
  );
}
