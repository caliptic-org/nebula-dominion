'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { STRUCTURE_ASSETS } from '@/lib/assets';

const TILE_W = 64;
const TILE_H = 36;
const MAP_COLS = 16;
const MAP_ROWS = 12;
const CANVAS_W = 900;
const CANVAS_H = 520;

type TileType = 'empty' | 'asteroid' | 'planet' | 'nebula' | 'battle';

interface Tile {
  col: number;
  row: number;
  type: TileType;
  structure?: string;
  selected?: boolean;
}

interface IsometricTilemapProps {
  race: Race;
  structures?: Array<{ col: number; row: number; structureKey: keyof typeof STRUCTURE_ASSETS }>;
  onTileSelect?: (col: number, row: number) => void;
  showGrid?: boolean;
}

function isoToScreen(col: number, row: number, offsetX: number, offsetY: number) {
  const x = (col - row) * (TILE_W / 2) + offsetX;
  const y = (col + row) * (TILE_H / 2) + offsetY;
  return { x, y };
}

function screenToIso(screenX: number, screenY: number, offsetX: number, offsetY: number) {
  const relX = screenX - offsetX;
  const relY = screenY - offsetY;
  const col = Math.floor((relX / (TILE_W / 2) + relY / (TILE_H / 2)) / 2);
  const row = Math.floor((relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2);
  return { col, row };
}

const TILE_COLORS: Record<TileType, { fill: string; stroke: string; top: string }> = {
  empty:    { fill: '#0d1420', stroke: 'rgba(255,255,255,0.08)', top: '#111a2a' },
  asteroid: { fill: '#1a1612', stroke: 'rgba(255,102,0,0.25)', top: '#22201a' },
  planet:   { fill: '#0a1520', stroke: 'rgba(74,158,255,0.25)', top: '#0f1e2e' },
  nebula:   { fill: '#150c20', stroke: 'rgba(204,0,255,0.25)', top: '#1c1228' },
  battle:   { fill: '#200a0a', stroke: 'rgba(255,0,0,0.25)', top: '#2a1010' },
};

function generateMap(): Tile[][] {
  const map: Tile[][] = [];
  const tileTypes: TileType[] = ['empty', 'empty', 'empty', 'empty', 'asteroid', 'planet', 'nebula'];
  for (let r = 0; r < MAP_ROWS; r++) {
    map[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const rnd = Math.random();
      const type = rnd < 0.7 ? 'empty' : tileTypes[Math.floor(Math.random() * tileTypes.length)];
      map[r][c] = { col: c, row: r, type };
    }
  }
  return map;
}

export function IsometricTilemap({ race, structures = [], onTileSelect, showGrid = true }: IsometricTilemapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<Tile[][]>(generateMap());
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [selectedTile, setSelectedTile] = useState<{ col: number; row: number } | null>(null);
  const [gridVisible, setGridVisible] = useState(showGrid);
  const [zoom, setZoom] = useState(1.0);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const offsetX = CANVAS_W / 2;
  const offsetY = 60 * zoom;
  const raceColor = RACE_DESCRIPTIONS[race].color;

  useEffect(() => {
    setGridVisible(showGrid);
  }, [showGrid]);

  // Preload structure images
  useEffect(() => {
    structures.forEach(({ structureKey }) => {
      const src = STRUCTURE_ASSETS[structureKey];
      if (!imagesRef.current[structureKey]) {
        const img = new Image();
        img.src = src;
        imagesRef.current[structureKey] = img;
      }
    });
    // Place structures on map
    structures.forEach(({ col, row, structureKey }) => {
      if (mapRef.current[row]?.[col]) {
        mapRef.current[row][col].structure = structureKey;
      }
    });
  }, [structures]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current = timestamp * 0.001;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    const bg = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 3, 0, CANVAS_W / 2, CANVAS_H / 3, CANVAS_W * 0.8);
    bg.addColorStop(0, 'rgba(8,15,30,1)');
    bg.addColorStop(1, 'rgba(8,10,16,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Animated nebula glow at background
    const nebulaGrad = ctx.createRadialGradient(CANVAS_W * 0.3, CANVAS_H * 0.2, 0, CANVAS_W * 0.3, CANVAS_H * 0.2, 200);
    const alpha = 0.04 + 0.02 * Math.sin(timeRef.current * 0.5);
    nebulaGrad.addColorStop(0, raceColor.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', 'rgba(') ?? `${raceColor}0a`);
    nebulaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.translate(0, 0);
    ctx.scale(zoom, zoom);

    const map = mapRef.current;

    // Draw tiles back-to-front (painter's algorithm for isometric)
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tile = map[r][c];
        const { x, y } = isoToScreen(c, r, offsetX, offsetY);
        const colors = TILE_COLORS[tile.type];
        const isSelected = selectedTile?.col === c && selectedTile?.row === r;

        const hw = TILE_W / 2;
        const hh = TILE_H / 2;
        const sideH = 12;

        // Left face
        ctx.beginPath();
        ctx.moveTo(x - hw, y + hh);
        ctx.lineTo(x, y + hh + sideH);
        ctx.lineTo(x, y + hh + sideH + sideH * 0.5);
        ctx.lineTo(x - hw, y + hh + sideH * 0.5);
        ctx.closePath();
        ctx.fillStyle = isSelected
          ? raceColor + '40'
          : (tile.type === 'empty' ? '#09101a' : colors.fill + 'cc');
        ctx.fill();

        // Right face
        ctx.beginPath();
        ctx.moveTo(x + hw, y + hh);
        ctx.lineTo(x, y + hh + sideH);
        ctx.lineTo(x, y + hh + sideH + sideH * 0.5);
        ctx.lineTo(x + hw, y + hh + sideH * 0.5);
        ctx.closePath();
        ctx.fillStyle = isSelected
          ? raceColor + '25'
          : (tile.type === 'empty' ? '#060c14' : colors.fill + '99');
        ctx.fill();

        // Top face (diamond)
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + hw, y + hh);
        ctx.lineTo(x, y + TILE_H);
        ctx.lineTo(x - hw, y + hh);
        ctx.closePath();

        if (isSelected) {
          const glow = ctx.createRadialGradient(x, y + hh, 0, x, y + hh, hw);
          glow.addColorStop(0, raceColor + '60');
          glow.addColorStop(1, raceColor + '20');
          ctx.fillStyle = glow;
        } else {
          ctx.fillStyle = colors.top;
        }
        ctx.fill();

        // Grid stroke on top face
        if (gridVisible) {
          ctx.strokeStyle = isSelected ? raceColor + 'aa' : colors.stroke;
          ctx.lineWidth = isSelected ? 1.5 : 0.5;
          ctx.stroke();
        }

        // Type indicator dots
        if (tile.type === 'nebula') {
          ctx.fillStyle = '#cc00ff88';
          ctx.beginPath();
          ctx.arc(x, y + hh, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile.type === 'asteroid') {
          ctx.fillStyle = '#ff660088';
          ctx.beginPath();
          ctx.arc(x - 4, y + hh - 2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 3, y + hh + 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile.type === 'planet') {
          ctx.fillStyle = '#4a9eff66';
          ctx.beginPath();
          ctx.arc(x, y + hh, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Structure image
        if (tile.structure) {
          const img = imagesRef.current[tile.structure];
          if (img?.complete && img.naturalWidth > 0) {
            const imgW = TILE_W * 0.9;
            const imgH = imgW * (img.naturalHeight / img.naturalWidth);
            ctx.drawImage(img, x - imgW / 2, y + hh - imgH + 8, imgW, imgH);
          }
        }

        // Animated selected glow pulse
        if (isSelected) {
          const pulseAlpha = 0.3 + 0.3 * Math.sin(timeRef.current * 3);
          ctx.shadowColor = raceColor;
          ctx.shadowBlur = 12 + 8 * Math.sin(timeRef.current * 3);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + hw, y + hh);
          ctx.lineTo(x, y + TILE_H);
          ctx.lineTo(x - hw, y + hh);
          ctx.closePath();
          ctx.strokeStyle = raceColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = pulseAlpha;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }
      }
    }

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [zoom, selectedTile, raceColor, gridVisible, offsetX, offsetY]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const sx = (e.clientX - rect.left) * scaleX / zoom;
    const sy = (e.clientY - rect.top) * scaleY / zoom;
    const { col, row } = screenToIso(sx, sy, offsetX, offsetY);
    if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
      setSelectedTile({ col, row });
      onTileSelect?.(col, row);
    }
  }, [zoom, offsetX, offsetY, onTileSelect]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(1.8, Math.max(0.5, z - e.deltaY * 0.001)));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '];
    if (!navKeys.includes(e.key)) return;
    e.preventDefault();

    setSelectedTile(prev => {
      const start = prev ?? { col: Math.floor(MAP_COLS / 2), row: Math.floor(MAP_ROWS / 2) };
      let { col, row } = start;
      switch (e.key) {
        case 'ArrowUp':    row = Math.max(0, row - 1); break;
        case 'ArrowDown':  row = Math.min(MAP_ROWS - 1, row + 1); break;
        case 'ArrowLeft':  col = Math.max(0, col - 1); break;
        case 'ArrowRight': col = Math.min(MAP_COLS - 1, col + 1); break;
      }
      onTileSelect?.(col, row);
      return { col, row };
    });
  }, [onTileSelect]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ background: '#080a10' }}>
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setGridVisible(v => !v)}
          className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-widest
                     bg-black/60 border border-white/10 hover:border-white/25 transition-colors"
          style={{ color: gridVisible ? 'var(--color-race)' : '#555' }}
          title="Grid toggle"
          aria-label="Toggle grid"
          aria-pressed={gridVisible}
        >
          GRID
        </button>
        <button
          onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
          className="w-7 h-7 rounded-full bg-black/60 border border-white/10 hover:border-white/25
                     flex items-center justify-center text-sm transition-colors text-text-secondary"
          title="Zoom in"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
          className="w-7 h-7 rounded-full bg-black/60 border border-white/10 hover:border-white/25
                     flex items-center justify-center text-sm transition-colors text-text-secondary"
          title="Zoom out"
          aria-label="Zoom out"
        >−</button>
      </div>

      {/* Selected tile info */}
      {selectedTile && (
        <div
          className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-full text-[10px] font-display font-bold uppercase tracking-widest"
          style={{
            background: 'rgba(8,10,16,0.85)',
            border: '1px solid var(--color-race)',
            color: 'var(--color-race)',
          }}
        >
          Tile [{selectedTile.col}, {selectedTile.row}]
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="application"
        style={{ display: 'block', width: '100%', cursor: 'pointer' }}
        aria-label="İzometrik oyun haritası — ok tuşlarıyla tile seç"
      />

      {/* Tile type legend */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 flex-wrap justify-end">
        {[
          { type: 'asteroid', color: '#ff6600', label: 'Asteroid' },
          { type: 'planet', color: '#4a9eff', label: 'Gezegen' },
          { type: 'nebula', color: '#cc00ff', label: 'Nebula' },
        ].map(({ color, label }) => (
          <div
            key={label}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display"
            style={{ background: 'rgba(8,10,16,0.7)', color }}
          >
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
