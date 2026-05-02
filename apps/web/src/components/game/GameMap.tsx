'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PlayerUnit, Race, RACE_DESCRIPTIONS, UNIT_DISPLAY_NAMES } from '@/types/units';

const GRID_COLS = 20;
const GRID_ROWS = 15;
const CELL_SIZE = 36;

function getUnitColor(unit: PlayerUnit): string {
  return RACE_DESCRIPTIONS[unit.race].color;
}

function getUnitLetter(unit: PlayerUnit): string {
  const name = UNIT_DISPLAY_NAMES[unit.type];
  return name.charAt(0).toUpperCase();
}

interface GameMapProps {
  units: PlayerUnit[];
  selectedUnitId: string | null;
  onSelectUnit: (unit: PlayerUnit | null) => void;
  onMoveUnit: (unitId: string, toX: number, toY: number) => void;
}

export function GameMap({ units, selectedUnitId, onSelectUnit, onMoveUnit }: GameMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = GRID_COLS * CELL_SIZE;
    const H = GRID_ROWS * CELL_SIZE;

    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, H);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(W, y * CELL_SIZE);
      ctx.stroke();
    }

    // Selected unit movement range highlight
    const selectedUnit = units.find((u) => u.id === selectedUnitId);
    if (selectedUnit) {
      const speed = selectedUnit.speed;
      for (let dx = -speed; dx <= speed; dx++) {
        for (let dy = -speed; dy <= speed; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= speed) {
            const tx = selectedUnit.positionX + dx;
            const ty = selectedUnit.positionY + dy;
            if (tx >= 0 && tx < GRID_COLS && ty >= 0 && ty < GRID_ROWS) {
              ctx.fillStyle = `${RACE_DESCRIPTIONS[selectedUnit.race].color}18`;
              ctx.fillRect(tx * CELL_SIZE + 1, ty * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
          }
        }
      }
    }

    // Draw units
    for (const unit of units) {
      if (!unit.isAlive) continue;
      const x = unit.positionX;
      const y = unit.positionY;
      if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) continue;

      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;
      const isSelected = unit.id === selectedUnitId;
      const color = getUnitColor(unit);
      const letter = getUnitLetter(unit);
      const padding = 4;

      // Selection glow
      if (isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      // Unit shape: Human = square, Zerg = circle, Automaton = diamond
      if (unit.race === Race.HUMAN) {
        // Filled square
        ctx.fillStyle = isSelected ? color : `${color}aa`;
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(px + padding, py + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2, 3);
        ctx.fill();
        ctx.stroke();
      } else if (unit.race === Race.ZERG) {
        // Filled circle
        ctx.fillStyle = isSelected ? color : `${color}aa`;
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;
        const r = CELL_SIZE / 2 - padding;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Diamond shape for Automaton
        ctx.fillStyle = isSelected ? color : `${color}aa`;
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;
        const size = CELL_SIZE / 2 - padding;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Unit letter
      ctx.fillStyle = isSelected ? '#000' : '#fff';
      ctx.font = `bold ${Math.round(CELL_SIZE * 0.35)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, px + CELL_SIZE / 2, py + CELL_SIZE / 2);

      // HP bar at bottom of cell
      const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
      const barY = py + CELL_SIZE - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px + padding, barY, CELL_SIZE - padding * 2, 3);
      const hpColor = hpPct > 0.6 ? '#44dd44' : hpPct > 0.3 ? '#ffaa22' : '#ff4444';
      ctx.fillStyle = hpColor;
      ctx.fillRect(px + padding, barY, (CELL_SIZE - padding * 2) * hpPct, 3);
    }

    // Coordinate labels at edges (every 5 cells)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = 0; x < GRID_COLS; x += 5) {
      ctx.fillText(String(x), x * CELL_SIZE + CELL_SIZE / 2, 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < GRID_ROWS; y += 5) {
      ctx.fillText(String(y), 3, y * CELL_SIZE + CELL_SIZE / 2);
    }
  }, [units, selectedUnitId]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE);
      const clickY = Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE);

      // Check if a unit is at this cell
      const clickedUnit = units.find(
        (u) => u.isAlive && u.positionX === clickX && u.positionY === clickY,
      );

      if (clickedUnit) {
        onSelectUnit(clickedUnit.id === selectedUnitId ? null : clickedUnit);
      } else if (selectedUnitId) {
        // Move selected unit to this cell
        onMoveUnit(selectedUnitId, clickX, clickY);
        onSelectUnit(null);
      }
    },
    [units, selectedUnitId, onSelectUnit, onMoveUnit],
  );

  const W = GRID_COLS * CELL_SIZE;
  const H = GRID_ROWS * CELL_SIZE;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
          Savaş Haritası
        </h3>
        <span style={{ fontSize: 11, color: '#555' }}>
          Birim seçmek için tıklayın • Hareket için boş hücreye tıklayın
        </span>
      </div>
      <div
        style={{
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          background: '#0a0e1a',
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleCanvasClick}
          style={{
            display: 'block',
            cursor: selectedUnitId ? 'crosshair' : 'pointer',
            maxWidth: '100%',
          }}
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        {[
          { shape: 'square', label: 'İnsan', color: '#4a9eff' },
          { shape: 'circle', label: 'Zerg', color: '#44dd44' },
          { shape: 'diamond', label: 'Automaton', color: '#ff8800' },
        ].map(({ shape, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              {shape === 'square' && (
                <rect x="1" y="1" width="12" height="12" rx="2" fill={color} opacity="0.8" />
              )}
              {shape === 'circle' && (
                <circle cx="7" cy="7" r="6" fill={color} opacity="0.8" />
              )}
              {shape === 'diamond' && (
                <polygon points="7,1 13,7 7,13 1,7" fill={color} opacity="0.8" />
              )}
            </svg>
            <span style={{ fontSize: 11, color: '#888' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
