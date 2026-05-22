// Nebula Dominion — 54-level tier path visualization
// 6 ages × 9 levels serpentine path with race-specific styling.

const AGES_54 = [
  { id: 1, label: 'GEZEGENSEL UYANIŞ',      range:[1,9],   color: 'oklch(0.78 0.16 220)' },
  { id: 2, label: 'YILDIZ SİSTEMİ HAKİM.',   range:[10,18], color: 'oklch(0.82 0.16 80)' },
  { id: 3, label: 'SEKTÖR GENİŞLEMESİ',      range:[19,27], color: 'oklch(0.72 0.18 50)' },
  { id: 4, label: 'GALAKTİK ÇATIŞMA',        range:[28,36], color: 'oklch(0.65 0.22 25)' },
  { id: 5, label: 'BOYUTLAR ARASI KEŞİF',    range:[37,45], color: 'oklch(0.66 0.24 340)' },
  { id: 6, label: 'KOZMİK ÜSTÜNLÜK',         range:[46,54], color: 'oklch(0.62 0.22 15)' },
];

const TIER_NAMES_54 = [
  // Age 1
  'Tohum','Filiz','Çekirdek','Yuva','Yerleşim','Köy','Kasaba','Şehir','Metropol',
  // Age 2
  'Yörünge','Uydu','İkiz Gezegen','Üçlü Sistem','İç Sistem','Dış Sistem','Asteroid Kuşağı','Sistem Komutanı','Yıldız Hakimi',
  // Age 3
  'Keşifçi','Öncü','Kolonist','Sektör Beyi','Çoklu Sistem','Bölge Lordu','Sektör Lordu','Yıldız Generali','Sektör Hakimi',
  // Age 4
  'Galaktik Şövalye','Yıldız Mareşali','Spiral Kolu Lordu','Galaktik Komutan','Çekirdek Hakimi','Halo Lordu','Galaksi Generali','Galaksi Mareşali','Galaktik İmparator',
  // Age 5
  'Boyut Kâşifi','Subspace Yolcusu','Paralel Lord','Çoklu-Evren Komutanı','Boyut Mareşali','Yarık Hakimi','Boyutlar Arası Lord','Çok-Boyutlu Hakim','Boyut Tanrısı',
  // Age 6
  'Evren Kâşifi','Kozmik Şövalye','Kozmik Lord','Universe Master','Kozmik İmparator','Çok-Evrenli Hakim','Sonsuz Hakim','Kozmik Konsey Üyesi','Tier 9 Hakimi',
];

// ============================================================
// RaceTierPath — full 54-level serpentine path
// Renders inline SVG; pure visualization, no scrolling.
// width = parent width (responsive), height = computed by rows
// ============================================================
function RaceTierPath({ race, currentLevel = 9 }) {
  const c = race.primary, g = race.glow;
  const ROWS = 6;
  const COLS = 9;
  const W = 358;
  const ROW_H = 84;
  const PAD_X = 22;
  const NODE_SP = (W - PAD_X * 2) / (COLS - 1);
  const H = ROWS * ROW_H + 20;

  // Build node positions — serpentine: even rows L→R, odd rows R→L
  const nodes = [];
  for (let r = 0; r < ROWS; r++) {
    const reverse = r % 2 === 1;
    for (let i = 0; i < COLS; i++) {
      const col = reverse ? (COLS - 1 - i) : i;
      const lv = r * COLS + i + 1;
      nodes.push({
        lv,
        age: r + 1,
        x: PAD_X + col * NODE_SP,
        y: 30 + r * ROW_H,
        ageColor: AGES_54[r].color,
        name: TIER_NAMES_54[lv - 1],
      });
    }
  }

  // Build path d for serpentine connector
  const pathD = nodes.map((n, i) => {
    if (i === 0) return `M ${n.x} ${n.y}`;
    const prev = nodes[i - 1];
    // If different row, U-turn through the edge
    if (prev.age !== n.age) {
      const turnX = (n.x > prev.x) ? PAD_X - 12 : W - PAD_X + 12;
      const turnY = (prev.y + n.y) / 2;
      return `Q ${turnX} ${turnY}, ${n.x} ${n.y}`;
    }
    return `L ${n.x} ${n.y}`;
  }).join(' ');

  return (
    <div style={{ width:'100%', position:'relative', overflow:'visible' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W + 20} ${H}`} style={{ display:'block' }}>
        <defs>
          <linearGradient id={`tp-${race.key}-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.6"/>
            <stop offset="100%" stopColor={c} stopOpacity="0.95"/>
          </linearGradient>
        </defs>

        {/* Age labels along the side */}
        {AGES_54.map((age, i) => {
          const y = 30 + i * ROW_H;
          const onRight = i % 2 === 0;
          return (
            <g key={age.id}>
              <text x={onRight ? W - 4 : 18} y={y - 18}
                textAnchor={onRight ? 'end' : 'start'}
                fontFamily="Chakra Petch" fontSize="9" fontWeight="700"
                fill={age.color} letterSpacing="2">ÇAĞ {age.id} · {age.label}</text>
              <text x={onRight ? W - 4 : 18} y={y - 8}
                textAnchor={onRight ? 'end' : 'start'}
                fontFamily="JetBrains Mono" fontSize="7" fill={`${age.color}aa`}>
                LV {age.range[0]}–{age.range[1]}
              </text>
            </g>
          );
        })}

        {/* The serpentine connector — done + locked portions */}
        <RacePathConnector race={race} pathD={pathD}/>

        {/* Progress overlay along path */}
        <RaceProgressOverlay race={race} nodes={nodes} currentLevel={currentLevel}/>

        {/* Nodes */}
        {nodes.map((n) => {
          const done = n.lv < currentLevel;
          const current = n.lv === currentLevel;
          const locked = n.lv > currentLevel;
          return (
            <RacePathNode key={n.lv} race={race} node={n}
              done={done} current={current} locked={locked}/>
          );
        })}

        {/* Final flag / pinnacle indicator for Tier 9 (level 54) */}
        <g transform={`translate(${nodes[53].x} ${nodes[53].y - 24})`}>
          <text textAnchor="middle" fontFamily="Chakra Petch" fontSize="9" fontWeight="700"
            fill={c} letterSpacing="2">{race.title.toUpperCase()}</text>
        </g>
      </svg>
    </div>
  );
}

// ----- Path connector — full path drawn lightly, race-specific stroke
function RacePathConnector({ race, pathD }) {
  const c = race.primary;
  if (race.key === 'otomat') {
    // Orthogonal-feeling — straight segments only; render the path with dashes
    return <path d={pathD} stroke={`${c}55`} strokeWidth="1" fill="none" strokeDasharray="4 4"/>;
  }
  if (race.key === 'canavar') {
    return <path d={pathD} stroke={`${c}66`} strokeWidth="1.2" fill="none" strokeDasharray="2 5" opacity="0.7"/>;
  }
  if (race.key === 'seytan') {
    return <path d={pathD} stroke={`${c}66`} strokeWidth="1" fill="none" strokeDasharray="3 3" opacity="0.7"/>;
  }
  if (race.key === 'zerg') {
    return <path d={pathD} stroke={`${c}88`} strokeWidth="2.2" fill="none" opacity="0.6"/>;
  }
  // Insan
  return <path d={pathD} stroke={`${c}66`} strokeWidth="1.2" fill="none" strokeDasharray="6 4"/>;
}

// ----- Progress overlay — bright portion up to current level
function RaceProgressOverlay({ race, nodes, currentLevel }) {
  const g = race.glow, c = race.primary;
  // Build sub-path only up to current level
  const done = nodes.filter(n => n.lv <= currentLevel);
  if (done.length === 0) return null;
  const d = done.map((n, i) => {
    if (i === 0) return `M ${n.x} ${n.y}`;
    const prev = done[i - 1];
    if (prev.age !== n.age) {
      const turnX = (n.x > prev.x) ? 10 : 348;
      const turnY = (prev.y + n.y) / 2;
      return `Q ${turnX} ${turnY}, ${n.x} ${n.y}`;
    }
    return `L ${n.x} ${n.y}`;
  }).join(' ');
  const stroke = race.key === 'zerg' ? 3 : (race.key === 'otomat' ? 1.6 : 2);
  return (
    <g>
      <path d={d} stroke={c} strokeWidth={stroke} fill="none"
        opacity="0.9" style={{ filter:`drop-shadow(0 0 6px ${g}aa)` }}/>
      {race.key === 'otomat' && (
        <path d={d} stroke={g} strokeWidth="0.8" fill="none" strokeDasharray="3 5" className="nd-flow"/>
      )}
    </g>
  );
}

// ----- Path node — race-specific shape for each level
function RacePathNode({ race, node, done, current, locked }) {
  const c = race.primary, g = race.glow;
  const color = done ? c : (locked ? 'oklch(0.45 0.02 240)' : g);
  const fillBg = current ? `${g}66` : (done ? `${c}44` : 'rgba(8,12,26,0.85)');
  const stroke = current ? g : color;
  const strokeWidth = current ? 1.8 : (done ? 1.2 : 0.8);

  // Big age-end nodes (lv 9, 18, 27, 36, 45, 54) get a special marker
  const isAgeEnd = node.lv % 9 === 0;
  const r = isAgeEnd ? 13 : 8;

  // Race-specific shape
  let shape;
  if (race.key === 'insan') {
    // Hex with chevron pip
    shape = (
      <>
        <polygon
          points={`${node.x-r},${node.y} ${node.x-r/2},${node.y-r*0.86} ${node.x+r/2},${node.y-r*0.86} ${node.x+r},${node.y} ${node.x+r/2},${node.y+r*0.86} ${node.x-r/2},${node.y+r*0.86}`}
          fill={fillBg} stroke={stroke} strokeWidth={strokeWidth}
          style={current ? { filter:`drop-shadow(0 0 10px ${g})` } : {}}/>
        {done && <text x={node.x} y={node.y + 2.4} textAnchor="middle"
          fontFamily="Chakra Petch" fontSize="8" fontWeight="700" fill={current ? '#fff' : c}>{node.lv}</text>}
        {locked && <circle cx={node.x} cy={node.y} r="1.5" fill={color} opacity="0.55"/>}
      </>
    );
  } else if (race.key === 'zerg') {
    // Organic blob — circle, distorted
    shape = (
      <>
        <ellipse cx={node.x} cy={node.y} rx={r} ry={r * 0.85}
          fill={fillBg} stroke={stroke} strokeWidth={strokeWidth}
          className={current ? 'nd-breath' : undefined}
          style={current ? { filter:`drop-shadow(0 0 10px ${g})`, transformOrigin:`${node.x}px ${node.y}px` } : {}}/>
        {done && !current && <circle cx={node.x} cy={node.y} r="2" fill={g}/>}
        {current && <circle cx={node.x} cy={node.y} r="3" fill="#fff" className="nd-pulse"/>}
        {locked && <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>·</text>}
      </>
    );
  } else if (race.key === 'otomat') {
    // Square with version chip
    shape = (
      <>
        <rect x={node.x - r} y={node.y - r} width={r*2} height={r*2}
          fill={fillBg} stroke={stroke} strokeWidth={strokeWidth}
          style={current ? { filter:`drop-shadow(0 0 8px ${g})` } : {}}/>
        {done && <text x={node.x} y={node.y + 2.4} textAnchor="middle"
          fontFamily="JetBrains Mono" fontSize="7" fontWeight="700" fill={current ? '#fff' : c}>{node.lv}</text>}
        {locked && <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>·</text>}
      </>
    );
  } else if (race.key === 'canavar') {
    // Claw mark / asymmetric round
    shape = (
      <>
        <path d={`M ${node.x} ${node.y - r} Q ${node.x - r} ${node.y}, ${node.x} ${node.y + r} Q ${node.x + r} ${node.y}, ${node.x} ${node.y - r} Z`}
          fill={fillBg} stroke={stroke} strokeWidth={strokeWidth}
          style={current ? { filter:`drop-shadow(0 0 10px ${g})` } : {}}/>
        {done && !current && (
          <g stroke={c} strokeWidth="1" fill="none">
            <path d={`M ${node.x - 3} ${node.y - 3} L ${node.x - 1} ${node.y + 3} M ${node.x} ${node.y - 4} L ${node.x + 1} ${node.y + 3} M ${node.x + 3} ${node.y - 3} L ${node.x + 2} ${node.y + 3}`}/>
          </g>
        )}
        {current && <circle cx={node.x} cy={node.y} r="2.4" fill={g} className="nd-eye"
          style={{ transformOrigin: `${node.x}px ${node.y}px`, transformBox:'fill-box' }}/>}
        {locked && <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>·</text>}
      </>
    );
  } else if (race.key === 'seytan') {
    // Pentagram-ish — circle with star
    shape = (
      <>
        <circle cx={node.x} cy={node.y} r={r} fill={fillBg} stroke={stroke} strokeWidth={strokeWidth}
          style={current ? { filter:`drop-shadow(0 0 10px ${g})` } : {}}/>
        {done && (
          <polygon
            points={(() => {
              const pts = Array.from({length:5}, (_, k) => {
                const a = (k / 5) * Math.PI * 2 - Math.PI/2;
                return [node.x + Math.cos(a)*(r*0.6), node.y + Math.sin(a)*(r*0.6)];
              });
              return pts.map(p => p.join(',')).join(' ');
            })()}
            fill={current ? g : c} stroke={current ? '#fff' : g} strokeWidth="0.4"
            className={current ? 'nd-sigil' : undefined}
            style={current ? { color: g } : {}}/>
        )}
        {locked && <text x={node.x} y={node.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={color}>·</text>}
      </>
    );
  }

  return (
    <g>
      {shape}
      {/* Level number for current */}
      {current && (
        <g>
          <rect x={node.x - 16} y={node.y - 32} width="32" height="14" fill="rgba(6,8,15,0.92)" stroke={g} strokeWidth="0.6"/>
          <text x={node.x} y={node.y - 22} textAnchor="middle" fontFamily="Chakra Petch" fontSize="9" fontWeight="700" fill={g}>LV {node.lv}</text>
        </g>
      )}
      {/* Name on age-end nodes */}
      {isAgeEnd && (
        <text x={node.x} y={node.y + r + 12} textAnchor="middle"
          fontFamily="Chakra Petch" fontSize="6.5" fill={done ? c : `${c}77`} letterSpacing="1">
          {node.name.toUpperCase()}
        </text>
      )}
    </g>
  );
}

Object.assign(window, { RaceTierPath, AGES_54, TIER_NAMES_54 });
