/* RaceTierPath — handoff 54-level serpentine progression visual.
 *
 * 6 ages × 9 levels = 54 nodes drawn as a left/right snaking path. Race
 * `key` determines node shape (insan hex, zerg blob, otomat square,
 * canavar claw, seytan circle-with-star) per handoff/nd-race-tierpath.jsx.
 */

import { ND, type NDRace } from './nd-tokens';

export interface TierAgeMeta {
  id: number;
  label: string;
  range: [number, number];
  color: string;
}

export const AGES_54: TierAgeMeta[] = [
  { id: 1, label: 'GEZEGENSEL UYANIŞ',     range: [1, 9],   color: 'oklch(0.78 0.16 220)' },
  { id: 2, label: 'YILDIZ SİSTEMİ HAKİM.', range: [10, 18], color: 'oklch(0.82 0.16 80)'  },
  { id: 3, label: 'SEKTÖR GENİŞLEMESİ',    range: [19, 27], color: 'oklch(0.72 0.18 50)'  },
  { id: 4, label: 'GALAKTİK ÇATIŞMA',      range: [28, 36], color: 'oklch(0.65 0.22 25)'  },
  { id: 5, label: 'BOYUTLAR ARASI KEŞİF',  range: [37, 45], color: 'oklch(0.66 0.24 340)' },
  { id: 6, label: 'KOZMİK ÜSTÜNLÜK',       range: [46, 54], color: 'oklch(0.62 0.22 15)'  },
];

interface NodePos {
  lv: number;
  age: number;
  x: number;
  y: number;
  ageColor: string;
  name: string;
}

interface RaceTierPathProps {
  race: NDRace;
  currentLevel?: number;
  levelNames?: Record<number, string>;
}

export function RaceTierPath({ race, currentLevel = 1, levelNames }: RaceTierPathProps) {
  const c = race.primary;
  const ROWS = 6;
  const COLS = 9;
  const W = 358;
  const ROW_H = 84;
  const PAD_X = 22;
  const NODE_SP = (W - PAD_X * 2) / (COLS - 1);
  const H = ROWS * ROW_H + 20;

  const nodes: NodePos[] = [];
  for (let r = 0; r < ROWS; r++) {
    const reverse = r % 2 === 1;
    for (let i = 0; i < COLS; i++) {
      const col = reverse ? COLS - 1 - i : i;
      const lv = r * COLS + i + 1;
      nodes.push({
        lv,
        age: r + 1,
        x: PAD_X + col * NODE_SP,
        y: 30 + r * ROW_H,
        ageColor: AGES_54[r].color,
        name: levelNames?.[lv] ?? `Lv ${lv}`,
      });
    }
  }

  const pathD = nodes
    .map((n, i) => {
      if (i === 0) return `M ${n.x} ${n.y}`;
      const prev = nodes[i - 1];
      if (prev.age !== n.age) {
        const turnX = n.x > prev.x ? PAD_X - 12 : W - PAD_X + 12;
        const turnY = (prev.y + n.y) / 2;
        return `Q ${turnX} ${turnY}, ${n.x} ${n.y}`;
      }
      return `L ${n.x} ${n.y}`;
    })
    .join(' ');

  return (
    <div style={{ width: '100%', position: 'relative', overflow: 'visible' }}>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W + 20} ${H}`}
        style={{ display: 'block' }}
        aria-label={`Tier yolu — şu an seviye ${currentLevel}`}
      >
        {AGES_54.map((age, i) => {
          const y = 30 + i * ROW_H;
          const onRight = i % 2 === 0;
          return (
            <g key={age.id}>
              <text
                x={onRight ? W - 4 : 18}
                y={y - 18}
                textAnchor={onRight ? 'end' : 'start'}
                fontFamily="Chakra Petch"
                fontSize="9"
                fontWeight="700"
                fill={age.color}
                letterSpacing="2"
              >
                ÇAĞ {age.id} · {age.label}
              </text>
              <text
                x={onRight ? W - 4 : 18}
                y={y - 8}
                textAnchor={onRight ? 'end' : 'start'}
                fontFamily="JetBrains Mono"
                fontSize="7"
                fill={`${age.color}aa`}
              >
                LV {age.range[0]}–{age.range[1]}
              </text>
            </g>
          );
        })}

        <PathConnector race={race} pathD={pathD} />
        <ProgressOverlay race={race} nodes={nodes} currentLevel={currentLevel} W={W} PAD_X={PAD_X} />

        {nodes.map((n) => {
          const done = n.lv < currentLevel;
          const current = n.lv === currentLevel;
          const locked = n.lv > currentLevel;
          return (
            <PathNode
              key={n.lv}
              race={race}
              node={n}
              done={done}
              current={current}
              locked={locked}
            />
          );
        })}

        <g transform={`translate(${nodes[53].x} ${nodes[53].y - 24})`}>
          <text
            textAnchor="middle"
            fontFamily="Chakra Petch"
            fontSize="9"
            fontWeight="700"
            fill={c}
            letterSpacing="2"
          >
            {race.title.toUpperCase()}
          </text>
        </g>
      </svg>
    </div>
  );
}

function PathConnector({ race, pathD }: { race: NDRace; pathD: string }) {
  const c = race.primary;
  if (race.key === 'otomat') {
    return <path d={pathD} stroke={`${c}55`} strokeWidth="1" fill="none" strokeDasharray="4 4" />;
  }
  if (race.key === 'canavar') {
    return <path d={pathD} stroke={`${c}66`} strokeWidth="1.2" fill="none" strokeDasharray="2 5" opacity="0.7" />;
  }
  if (race.key === 'seytan') {
    return <path d={pathD} stroke={`${c}66`} strokeWidth="1" fill="none" strokeDasharray="3 3" opacity="0.7" />;
  }
  if (race.key === 'zerg') {
    return <path d={pathD} stroke={`${c}88`} strokeWidth="2.2" fill="none" opacity="0.6" />;
  }
  return <path d={pathD} stroke={`${c}66`} strokeWidth="1.2" fill="none" strokeDasharray="6 4" />;
}

interface OverlayProps {
  race: NDRace;
  nodes: NodePos[];
  currentLevel: number;
  W: number;
  PAD_X: number;
}

function ProgressOverlay({ race, nodes, currentLevel, W, PAD_X }: OverlayProps) {
  const g = race.glow;
  const c = race.primary;
  const done = nodes.filter((n) => n.lv <= currentLevel);
  if (done.length === 0) return null;
  const d = done
    .map((n, i) => {
      if (i === 0) return `M ${n.x} ${n.y}`;
      const prev = done[i - 1];
      if (prev.age !== n.age) {
        const turnX = n.x > prev.x ? PAD_X - 12 : W - PAD_X + 12;
        const turnY = (prev.y + n.y) / 2;
        return `Q ${turnX} ${turnY}, ${n.x} ${n.y}`;
      }
      return `L ${n.x} ${n.y}`;
    })
    .join(' ');
  const stroke = race.key === 'zerg' ? 3 : race.key === 'otomat' ? 1.6 : 2;
  return (
    <g>
      <path
        d={d}
        stroke={c}
        strokeWidth={stroke}
        fill="none"
        opacity="0.9"
        style={{ filter: `drop-shadow(0 0 6px ${g}aa)` }}
      />
      {race.key === 'otomat' && (
        <path d={d} stroke={g} strokeWidth="0.8" fill="none" strokeDasharray="3 5" className="nd-flow" />
      )}
    </g>
  );
}

interface PathNodeProps {
  race: NDRace;
  node: NodePos;
  done: boolean;
  current: boolean;
  locked: boolean;
}

function PathNode({ race, node, done, current, locked }: PathNodeProps) {
  const c = race.primary;
  const g = race.glow;
  const color = done ? c : locked ? 'oklch(0.45 0.02 240)' : g;
  const fillBg = current ? `${g}66` : done ? `${c}44` : 'rgba(8,12,26,0.85)';
  const stroke = current ? g : color;
  const strokeWidth = current ? 1.8 : done ? 1.2 : 0.8;
  const isAgeEnd = node.lv % 9 === 0;
  const r = isAgeEnd ? 13 : 8;

  let shape: JSX.Element | null = null;

  if (race.key === 'insan') {
    shape = (
      <>
        <polygon
          points={`${node.x - r},${node.y} ${node.x - r / 2},${node.y - r * 0.86} ${node.x + r / 2},${node.y - r * 0.86} ${node.x + r},${node.y} ${node.x + r / 2},${node.y + r * 0.86} ${node.x - r / 2},${node.y + r * 0.86}`}
          fill={fillBg}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={current ? { filter: `drop-shadow(0 0 10px ${g})` } : {}}
        />
        {done && (
          <text x={node.x} y={node.y + 2.4} textAnchor="middle" fontFamily="Chakra Petch" fontSize="8" fontWeight="700" fill={current ? '#fff' : c}>
            {node.lv}
          </text>
        )}
        {locked && <circle cx={node.x} cy={node.y} r="1.5" fill={color} opacity="0.55" />}
      </>
    );
  } else if (race.key === 'zerg') {
    shape = (
      <>
        <ellipse
          cx={node.x}
          cy={node.y}
          rx={r}
          ry={r * 0.85}
          fill={fillBg}
          stroke={stroke}
          strokeWidth={strokeWidth}
          className={current ? 'nd-breath' : undefined}
          style={current ? { filter: `drop-shadow(0 0 10px ${g})`, transformOrigin: `${node.x}px ${node.y}px` } : {}}
        />
        {done && !current && <circle cx={node.x} cy={node.y} r="2" fill={g} />}
        {current && <circle cx={node.x} cy={node.y} r="3" fill="#fff" className="nd-pulse" />}
        {locked && (
          <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>
            ·
          </text>
        )}
      </>
    );
  } else if (race.key === 'otomat') {
    shape = (
      <>
        <rect
          x={node.x - r}
          y={node.y - r}
          width={r * 2}
          height={r * 2}
          fill={fillBg}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={current ? { filter: `drop-shadow(0 0 8px ${g})` } : {}}
        />
        {done && (
          <text x={node.x} y={node.y + 2.4} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fontWeight="700" fill={current ? '#fff' : c}>
            {node.lv}
          </text>
        )}
        {locked && (
          <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>
            ·
          </text>
        )}
      </>
    );
  } else if (race.key === 'canavar') {
    shape = (
      <>
        <g
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={current ? { filter: `drop-shadow(0 0 10px ${g})` } : {}}
        >
          <line x1={node.x} y1={node.y - r} x2={node.x - 1.5} y2={node.y + r * 0.4} />
          <line x1={node.x - r * 0.85} y1={node.y + r * 0.5} x2={node.x + 1.5} y2={node.y - r * 0.2} />
          <line x1={node.x + r * 0.85} y1={node.y + r * 0.5} x2={node.x - 1.5} y2={node.y - r * 0.2} />
        </g>
        {done && !current && (
          <circle cx={node.x} cy={node.y} r="1.6" fill={c} />
        )}
        {current && (
          <circle
            cx={node.x}
            cy={node.y}
            r="2.4"
            fill={g}
            className="nd-eye"
            style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox: 'fill-box' }}
          />
        )}
        {locked && (
          <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>
            ·
          </text>
        )}
      </>
    );
  } else if (race.key === 'seytan') {
    const pts = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      return [node.x + Math.cos(a) * (r * 0.6), node.y + Math.sin(a) * (r * 0.6)];
    });
    shape = (
      <>
        <circle
          cx={node.x}
          cy={node.y}
          r={r}
          fill={fillBg}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={current ? { filter: `drop-shadow(0 0 10px ${g})` } : {}}
        />
        {done && (
          <polygon
            points={pts.map((p) => p.join(',')).join(' ')}
            fill={current ? g : c}
            stroke={current ? '#fff' : g}
            strokeWidth="0.4"
            className={current ? 'nd-sigil' : undefined}
          />
        )}
        {locked && (
          <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>
            ·
          </text>
        )}
      </>
    );
  }

  return (
    <g>
      {shape}
      {current && (
        <g>
          <rect x={node.x - 16} y={node.y - 32} width="32" height="14" fill="rgba(6,8,15,0.92)" stroke={g} strokeWidth="0.6" />
          <text x={node.x} y={node.y - 22} textAnchor="middle" fontFamily="Chakra Petch" fontSize="9" fontWeight="700" fill={g}>
            LV {node.lv}
          </text>
        </g>
      )}
      {isAgeEnd && (
        <text
          x={node.x}
          y={node.y + r + 12}
          textAnchor="middle"
          fontFamily="Chakra Petch"
          fontSize="6.5"
          fill={done ? race.primary : `${race.primary}77`}
          letterSpacing="1"
        >
          {node.name.toUpperCase()}
        </text>
      )}
    </g>
  );
}

/* Compact tier-progress strip used as a sub-banner under the HUD. */
interface TierBannerProps {
  race: NDRace;
  level: number;
  age: number;
  ageLabel?: string;
  xpPercent?: number;
  trailing?: string;
}

export function TierBanner({ race, level, age, ageLabel, xpPercent = 0, trailing }: TierBannerProps) {
  const ageMeta = AGES_54.find((a) => a.id === age) ?? AGES_54[0];
  const label = ageLabel ?? ageMeta.label;
  return (
    <div
      style={{
        padding: '8px 12px',
        background: 'rgba(8,12,26,0.7)',
        borderBottom: `1px solid ${ND.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
          fontFamily: ND.mono,
          fontSize: 11,
          letterSpacing: '0.04em',
        }}
      >
        <span style={{ color: race.primary }}>
          ÇAĞ {age} · {label}
        </span>
        <span style={{ color: ND.textDim }}>
          {trailing ?? `LV ${level} / ${ageMeta.range[1]} → ÇAĞ ${Math.min(6, age + 1)}`}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${ND.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${Math.max(0, Math.min(100, xpPercent))}%`,
            background: `linear-gradient(90deg, ${race.primary}88, ${race.primary})`,
            filter: `drop-shadow(0 0 10px ${race.glow}cc)`,
          }}
        />
      </div>
    </div>
  );
}
