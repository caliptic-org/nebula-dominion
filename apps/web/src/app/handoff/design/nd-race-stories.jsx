// Nebula Dominion — Story set hero art (sets 2-5 for all 5 races)
// Set 1 (awakening) lives in nd-race-extra.jsx as RaceAwakeningArt.

// ============================================================
// RaceStoryArt — unified dispatch
// setIdx:  0 = Awakening (delegates to RaceAwakeningArt)
//          1 = Stellar Expansion
//          2 = Galactic Harvest / War
//          3 = Dimensional / Cosmic Awakening
//          4 = Endgame / Universe Master
// ============================================================
const STORY_SET_LABELS = [
  { idx:0, age:'ÇAĞ 1 → 2', short:'UYANIŞ',          theme:'Awakening' },
  { idx:1, age:'ÇAĞ 2 → 3', short:'YILDIZ AÇILIMI',  theme:'Stellar Expansion' },
  { idx:2, age:'ÇAĞ 3 → 4', short:'GALAKTİK HASAT',  theme:'Great Harvest' },
  { idx:3, age:'ÇAĞ 4 → 5', short:'BOYUT AÇILIMI',   theme:'Dimensional' },
  { idx:4, age:'ÇAĞ 5 → 6', short:'KOZMİK ZİRVE',    theme:'Cosmic Master' },
];

function storyTagInsan(i)   { return ['::SCENE-01 / COLONY','::SCENE-02 / DYNASTY','::SCENE-03 / FEDERATION','::SCENE-04 / SUBSPACE','::SCENE-05 / UNIVERSE'][i]; }
function storyTagZerg(i)    { return ['::SCENE-01 / SHELL','::SCENE-02 / STAR-SEED','::SCENE-03 / HARVEST','::SCENE-04 / KIN-WURM','::SCENE-05 / SWALLOWER'][i]; }
function storyTagOtomat(i)  { return ['::SCENE 01 / BOOT','::SCENE 02 / DEPLOY','::SCENE 03 / EXECUTE','::SCENE 04 / SUBROUTINE','::SCENE 05 / ALGORITHM'][i]; }
function storyTagCanavar(i) { return ['SAHNE I · İLK AV','SAHNE II · YILDIZ AVI','SAHNE III · ATALAR','SAHNE IV · BOYUT AVI','SAHNE V · TANRI'][i]; }
function storyTagSeytan(i)  { return ['· SAHNE I · ZİNCİR ·','· SAHNE II · MAHKEME ·','· SAHNE III · LORDLAR ·','· SAHNE IV · GRİMUVA ·','· SAHNE V · HÜKÜMDAR ·'][i]; }

function RaceStoryArt({ race, setIdx = 0, height = 220 }) {
  // Set 1 is awakening — delegates to existing component
  if (setIdx === 0) return <RaceAwakeningArt race={race} height={height}/>;

  const subRenderer = {
    insan:   [null, StellarInsan, HarvestInsan, DimensionalInsan, CosmicInsan],
    zerg:    [null, StellarZerg, HarvestZerg, DimensionalZerg, CosmicZerg],
    otomat:  [null, StellarOtomat, HarvestOtomat, DimensionalOtomat, CosmicOtomat],
    canavar: [null, StellarCanavar, HarvestCanavar, DimensionalCanavar, CosmicCanavar],
    seytan:  [null, StellarSeytan, HarvestSeytan, DimensionalSeytan, CosmicSeytan],
  }[race.key];

  const Renderer = subRenderer && subRenderer[setIdx];
  if (!Renderer) return null;

  const tagFns = { insan: storyTagInsan, zerg: storyTagZerg, otomat: storyTagOtomat, canavar: storyTagCanavar, seytan: storyTagSeytan };
  const tag = tagFns[race.key](setIdx);

  return (
    <div style={{ position:'relative', width:'100%', height,
      background: storyBgFor(race), overflow:'hidden', border:`1px solid ${race.primary}44` }}>
      <Renderer c={race.primary} g={race.glow} h={height}/>
      <div style={{ position:'absolute', top: 8, left: 10, fontFamily:'JetBrains Mono', fontSize: 8, color: `${race.primary}cc`, letterSpacing:'0.16em' }}>
        {tag}
      </div>
    </div>
  );
}

function storyBgFor(race) {
  const map = {
    insan:   'radial-gradient(ellipse at 50% 110%, oklch(0.30 0.10 30 / 0.4), #06080F)',
    zerg:    'radial-gradient(ellipse at center, oklch(0.18 0.16 340 / 0.7), #0a0212)',
    otomat:  'linear-gradient(180deg, oklch(0.08 0.04 220), #04060c)',
    canavar: 'radial-gradient(ellipse at 50% 70%, oklch(0.18 0.06 50 / 0.65), #0a0604)',
    seytan:  'radial-gradient(circle at center, oklch(0.16 0.18 15 / 0.7), #050103)',
  };
  return map[race.key];
}

// ============================================================
// SET 2 — STELLAR EXPANSION
// ============================================================

function StellarInsan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="st-ins-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={g} stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* stars */}
      {Array.from({length:40}).map((_,i)=>{
        const x = (i*51)%360, y = (i*37)%220;
        return <circle key={i} cx={x} cy={y} r={0.4 + (i%3)*0.4} fill="#fff" opacity={0.3 + (i%5)*0.13}/>;
      })}
      {/* planet on left (origin) */}
      <circle cx="40" cy="180" r="34" fill="oklch(0.30 0.08 240)" opacity="0.85"/>
      <path d="M 12 175 Q 30 165, 40 174 M 12 188 Q 30 178, 40 187" stroke={c} strokeWidth="0.6" opacity="0.55" fill="none"/>
      {/* main flagship */}
      <g transform="translate(180 100)">
        <ellipse cx="0" cy="20" rx="44" ry="10" fill="url(#st-ins-glow)" className="nd-pulse"/>
        <path d="M -36 0 L 36 0 L 44 14 L 28 28 L -28 28 L -44 14 Z" fill="oklch(0.30 0.04 240)" stroke={c} strokeWidth="1.2"/>
        {[-24,-12,0,12,24].map((x,i) => <rect key={i} x={x-2} y="8" width="4" height="6" fill={g} className={`nd-led nd-d${i%4}`}/>)}
        <path d="M -10 0 L 0 -16 L 10 0 Z" fill="oklch(0.42 0.06 240)" stroke={c}/>
        <line x1="0" y1="-16" x2="0" y2="-30" stroke={c} strokeWidth="1"/>
        <circle cx="0" cy="-30" r="2" fill={g} className="nd-blink"/>
        {/* engine trail */}
        <path d="M -20 28 L -50 60" stroke={g} strokeWidth="1" opacity="0.6"/>
        <path d="M 20 28 L 50 60" stroke={g} strokeWidth="1" opacity="0.6"/>
      </g>
      {/* escort ships */}
      {[[80, 80],[300, 90],[260, 40],[100, 50]].map(([x,y],i)=>(
        <g key={i}>
          <path d={`M ${x-6} ${y} L ${x+6} ${y} L ${x+8} ${y+4} L ${x-8} ${y+4} Z`} fill="oklch(0.32 0.04 240)" stroke={c} strokeWidth="0.6"/>
          <line x1={x} y1={y+4} x2={x} y2={y+12} stroke={g} strokeWidth="0.6" opacity="0.7"/>
        </g>
      ))}
      {/* hyperspace lane to destination */}
      <path d="M 70 180 Q 180 130, 320 50" stroke={c} strokeWidth="0.5" strokeDasharray="3 4" fill="none"/>
      <circle cx="320" cy="50" r="5" fill={g}/>
    </svg>
  );
}

function StellarZerg({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="st-zr-ship">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9"/>
          <stop offset="40%" stopColor={g} stopOpacity="0.7"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.4"/>
        </radialGradient>
        <radialGradient id="st-zr-pl">
          <stop offset="0%" stopColor={g} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.95"/>
        </radialGradient>
      </defs>
      {/* stars */}
      {Array.from({length:30}).map((_,i)=>{
        const x = (i*39)%360, y = (i*61)%220;
        return <circle key={i} cx={x} cy={y} r={0.4} fill="#fff" opacity="0.5"/>;
      })}
      {/* infested planet */}
      <circle cx="46" cy="172" r="34" fill="url(#st-zr-pl)" stroke={c} strokeWidth="0.8" className="nd-pulse"/>
      <g stroke={g} strokeWidth="0.6" fill="none" opacity="0.7">
        <path d="M 16 168 Q 38 158, 56 168"/>
        <path d="M 18 178 Q 36 170, 64 182"/>
        <path d="M 20 188 Q 36 184, 60 192"/>
      </g>
      {/* living biological ship */}
      <g transform="translate(190 110)">
        <ellipse cx="0" cy="0" rx="58" ry="32" fill="url(#st-zr-ship)" stroke={c} strokeWidth="1.4"
          className="nd-breath" style={{ filter:`drop-shadow(0 0 12px ${g}88)` }}/>
        {/* sleeping larvae cells */}
        {[[-30,-6],[-10,8],[10,-6],[30,6],[-20,12],[20,-14]].map(([x,y],i)=>(
          <ellipse key={i} cx={x} cy={y} rx="6" ry="5" fill={c} stroke={g} strokeWidth="0.6"
            style={{ filter:`drop-shadow(0 0 3px ${g})` }}/>
        ))}
        {/* tendril propulsion */}
        <path d="M -56 4 Q -70 6, -78 18" stroke={c} strokeWidth="2" fill="none"/>
        <path d="M -56 -4 Q -70 -6, -78 -18" stroke={c} strokeWidth="2" fill="none"/>
        <path d="M -70 0 Q -90 0, -110 8" stroke={g} strokeWidth="0.8" fill="none" opacity="0.6"/>
      </g>
      {/* spore trail back */}
      {[[100, 100],[60, 92],[40, 86]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.2" fill={g} opacity="0.5" className={`nd-spore nd-d${i}`}/>
      ))}
      {/* target seed planet */}
      <circle cx="320" cy="60" r="8" fill={c} opacity="0.7"/>
      <circle cx="320" cy="60" r="14" fill="none" stroke={g} strokeWidth="0.6" strokeDasharray="2 3"/>
    </svg>
  );
}

function StellarOtomat({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="st-oto-grid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 0 H14 M0 0 V14" stroke={`${c}30`} strokeWidth="0.3"/>
        </pattern>
      </defs>
      <rect width="360" height="220" fill="url(#st-oto-grid)"/>
      {/* tactical grid: nodes connected */}
      <g stroke={c} strokeWidth="0.8" fill="none">
        <line x1="50" y1="170" x2="130" y2="120" strokeDasharray="4 4" className="nd-flow" style={{ stroke: g }}/>
        <line x1="130" y1="120" x2="220" y2="80" strokeDasharray="4 4" className="nd-flow nd-d1" style={{ stroke: g }}/>
        <line x1="220" y1="80" x2="310" y2="50" strokeDasharray="4 4" className="nd-flow nd-d2" style={{ stroke: g }}/>
        <line x1="130" y1="120" x2="180" y2="170" strokeDasharray="4 4" className="nd-flow nd-d3" style={{ stroke: g }}/>
        <line x1="220" y1="80" x2="180" y2="170" strokeDasharray="4 4" className="nd-flow nd-d4" style={{ stroke: g }}/>
      </g>
      {/* factory satellite hex nodes */}
      {[[50,170,'NODE-04','v1.0'],[130,120,'NODE-12','v2.0'],[220,80,'NODE-21','v2.4'],[310,50,'NODE-30','v3.0'],[180,170,'NODE-18','v2.1']].map(([x,y,name,ver],i)=>(
        <g key={i}>
          <polygon points={`${x-12},${y-18} ${x+12},${y-18} ${x+18},${y} ${x+12},${y+18} ${x-12},${y+18} ${x-18},${y}`} fill="rgba(20,36,64,0.85)" stroke={c} strokeWidth="1"/>
          <rect x={x-7} y={y-6} width="14" height="12" fill={c} opacity="0.35"/>
          <text x={x} y={y+3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={c} fontWeight="700">{name}</text>
          <text x={x} y={y+22} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5.5" fill={`${c}aa`}>{ver}</text>
          <circle cx={x+12} cy={y-13} r="1.5" fill={g} className={`nd-led nd-d${i%4}`}/>
        </g>
      ))}
      <g fontFamily="JetBrains Mono" fontSize="6" fill={`${c}aa`}>
        <text x="6" y="14">::expansion_map · v0426</text>
        <text x="270" y="214">scale 1:2048ly</text>
      </g>
    </svg>
  );
}

function StellarCanavar({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="st-cnv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}55`} strokeWidth="0.4"/>
        </pattern>
      </defs>
      <rect width="360" height="220" fill="url(#st-cnv-hatch)" opacity="0.35"/>
      {/* stars background */}
      {Array.from({length:30}).map((_,i)=>{
        const x = (i*43)%360, y = (i*29)%220;
        return <circle key={i} cx={x} cy={y} r={0.4} fill="#fff" opacity="0.5"/>;
      })}
      {/* planets dotted along the path */}
      <circle cx="44" cy="170" r="22" fill="oklch(0.20 0.06 50)" stroke={c} strokeWidth="0.8"/>
      <circle cx="320" cy="50" r="14" fill="oklch(0.20 0.06 50)" stroke={c} strokeWidth="0.8"/>
      {/* giant cosmic beast soaring */}
      <g transform="translate(190 110) rotate(-15)">
        {/* body */}
        <path d="M -70 0 Q -60 -22, -30 -22 Q 30 -28, 70 -12 Q 60 8, 30 18 Q -10 22, -50 14 Q -68 8, -70 0 Z"
          fill="#0a0604" stroke={c} strokeWidth="1.4"
          style={{ filter: `drop-shadow(0 0 10px ${g}66)` }}/>
        {/* glowing eyes */}
        <circle cx="50" cy="-10" r="2.5" fill={g} className="nd-eye"/>
        <circle cx="56" cy="-6" r="1.4" fill="#fff"/>
        {/* claws/wings */}
        <path d="M -10 -22 Q -20 -38, -8 -50 M 8 -22 Q 4 -40, 22 -48" stroke={c} strokeWidth="1.4" fill="none"/>
        <path d="M -20 18 Q -10 32, 0 36 M 20 18 Q 30 32, 40 38" stroke={c} strokeWidth="1.4" fill="none"/>
        {/* spine */}
        {[-40,-20,0,20,40].map((x,i)=>(
          <path key={i} d={`M ${x} -22 L ${x+2} -28`} stroke={c} strokeWidth="1.4" fill="none"/>
        ))}
      </g>
      {/* hunt trail */}
      <path d="M 50 180 Q 180 130, 320 56" stroke={c} strokeWidth="1" strokeDasharray="3 5" fill="none" opacity="0.7"/>
      {/* blood drops on trail */}
      {[[100, 158],[200, 122],[280, 80]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.5" fill={c}/>
      ))}
    </svg>
  );
}

function StellarSeytan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="st-sy-bg">
          <stop offset="0%" stopColor={c} stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#st-sy-bg)"/>
      {/* stars */}
      {Array.from({length:35}).map((_,i)=>{
        const x = (i*47)%360, y = (i*31)%220;
        return <circle key={i} cx={x} cy={y} r={0.4} fill="#fff" opacity="0.5"/>;
      })}
      {/* dark throne floating in space — gothic cathedral silhouette */}
      <g transform="translate(180 130)">
        {/* halo */}
        <circle cx="0" cy="0" r="68" fill="none" stroke={c} strokeWidth="0.6" opacity="0.6" className="nd-sigil" style={{ color: c }}/>
        <circle cx="0" cy="0" r="50" fill="none" stroke={c} strokeWidth="0.4" opacity="0.5"/>
        {/* throne */}
        <path d="M -28 32 L -28 -12 L -24 -22 L -16 -28 L -8 -34 L 0 -38 L 8 -34 L 16 -28 L 24 -22 L 28 -12 L 28 32 Z"
          fill="rgba(20,2,6,0.95)" stroke={c} strokeWidth="1.4"
          style={{ filter: `drop-shadow(0 0 10px ${g}77)` }}/>
        {/* spikes */}
        {[-20,-8,8,20].map((x,i)=>(
          <path key={i} d={`M ${x} -28 L ${x+2} -42 L ${x+4} -28`} fill={c}/>
        ))}
        {/* central sigil on throne */}
        <circle cx="0" cy="0" r="10" fill={`${g}33`} stroke={g} strokeWidth="0.8" className="nd-sigil" style={{ color: g }}/>
        {(() => {
          const pts = Array.from({length:5}, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI/2;
            return [Math.cos(a)*7, Math.sin(a)*7];
          });
          const order = [0,2,4,1,3,0];
          return <path d={'M ' + order.map(o => pts[o].join(' ')).join(' L ')} stroke={g} strokeWidth="0.8" fill="none"/>;
        })()}
      </g>
      {/* satellite candles orbiting */}
      {[0,1,2,3].map(i => {
        const a = (i/4)*Math.PI*2;
        const x = 180 + Math.cos(a)*100;
        const y = 110 + Math.sin(a)*40;
        return (
          <g key={i}>
            <rect x={x-1.5} y={y-2} width="3" height="12" fill={`${c}aa`}/>
            <path d={`M ${x} ${y-4} Q ${x-2} ${y-7}, ${x} ${y-10} Q ${x+2} ${y-7}, ${x} ${y-4} Z`} fill={g} className={`nd-flame nd-d${i}`}/>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================
// SET 3 — GALACTIC HARVEST / GREAT WAR
// ============================================================

function HarvestInsan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="hv-ins-ex"><stop offset="0%" stopColor="#fff4d6" stopOpacity="1"/><stop offset="40%" stopColor="oklch(0.65 0.22 25)" stopOpacity="0.7"/><stop offset="100%" stopColor="oklch(0.65 0.22 25)" stopOpacity="0"/></radialGradient>
      </defs>
      {Array.from({length:25}).map((_,i)=>(<circle key={i} cx={(i*47)%360} cy={(i*31)%220} r="0.4" fill="#fff" opacity="0.4"/>))}
      {/* friendly fleet bottom */}
      {Array.from({length:8}).map((_,i)=>{
        const x = 40 + (i%4)*60, y = 160 + Math.floor(i/4)*22;
        return (
          <g key={`a${i}`}>
            <path d={`M ${x-8} ${y} L ${x+8} ${y} L ${x+10} ${y+4} L ${x-10} ${y+4} Z`} fill="oklch(0.32 0.04 240)" stroke={c} strokeWidth="0.6"/>
            <rect x={x-1} y={y-4} width="2" height="3" fill={g} className={`nd-led nd-d${i%4}`}/>
          </g>
        );
      })}
      {/* enemy fleet top */}
      {Array.from({length:7}).map((_,i)=>(
        <polygon key={i} points={`${50+i*40},20 ${56+i*40},30 ${44+i*40},30`}
          fill="oklch(0.65 0.20 340)" stroke="oklch(0.55 0.20 340)" strokeWidth="0.6"/>
      ))}
      {/* laser tracers */}
      {[[60,160,150,40],[180,162,200,30],[240,160,290,42]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={g} strokeWidth="1.2" opacity="0.85"/>
      ))}
      {/* explosions */}
      <circle cx="170" cy="50" r="20" fill="url(#hv-ins-ex)"/>
      <circle cx="280" cy="60" r="14" fill="url(#hv-ins-ex)" opacity="0.7"/>
      <text x="200" y="110" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="3">GALAKTİK ÇATIŞMA</text>
    </svg>
  );
}

function HarvestZerg({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="hv-zr-ground"><stop offset="0%" stopColor={c} stopOpacity="0.6"/><stop offset="100%" stopColor="#000" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="180" cy="200" rx="200" ry="40" fill="url(#hv-zr-ground)"/>
      {/* enemy mechanical line top */}
      {Array.from({length:7}).map((_,i)=>(
        <rect key={i} x={40 + i*45} y="40" width="14" height="14" fill="oklch(0.65 0.16 60)" stroke="oklch(0.55 0.16 60)" strokeWidth="0.6"/>
      ))}
      {/* biological tide rising */}
      {Array.from({length:60}).map((_,i)=>{
        const x = 10 + (i*7)%340;
        const y = 130 + (i%4)*15 + ((i*13)%10);
        return (
          <g key={`l${i}`}>
            <ellipse cx={x} cy={y} rx="4" ry="3" fill={c} stroke={g} strokeWidth="0.4"/>
            <circle cx={x} cy={y} r="1" fill={g}/>
          </g>
        );
      })}
      {/* tendrils reaching up */}
      <g stroke={c} fill="none" strokeWidth="0.8" opacity="0.7" className="nd-vein">
        {[80, 160, 240].map((x,i)=>(<path key={i} d={`M ${x} 130 Q ${x+5} 90, ${x+10} 60`}/>))}
      </g>
      {/* bio-acid splashes near enemy */}
      {[[85, 60],[160, 55],[270, 60]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="6" fill={g} opacity="0.6"/>
      ))}
      <text x="180" y="100" textAnchor="middle" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="3">İLK BÜYÜK HASAT</text>
    </svg>
  );
}

function HarvestOtomat({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="hv-oto-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 0 H20 M0 0 V20" stroke={`${c}30`} strokeWidth="0.3"/>
        </pattern>
      </defs>
      <rect width="360" height="220" fill="url(#hv-oto-grid)"/>
      {/* synchronized hex fleet */}
      {Array.from({length:24}).map((_,i)=>{
        const col = i%6, row = Math.floor(i/6);
        const x = 50 + col*52, y = 130 + row*22;
        return (
          <g key={`a${i}`}>
            <polygon points={`${x-7},${y-12} ${x+7},${y-12} ${x+12},${y} ${x+7},${y+12} ${x-7},${y+12} ${x-12},${y}`} fill={`${c}55`} stroke={c} strokeWidth="0.6"/>
            <rect x={x-3} y={y-3} width="6" height="6" fill={c}/>
          </g>
        );
      })}
      {/* enemy line — chaotic blobs */}
      {Array.from({length:8}).map((_,i)=>(
        <ellipse key={i} cx={40 + i*42} cy={50} rx="10" ry="6" fill="oklch(0.60 0.18 340)" opacity="0.7"/>
      ))}
      {/* synchronized beam volley */}
      {[80, 130, 180, 230, 280].map((x,i) => (
        <line key={i} x1={x} y1={125} x2={x} y2={60} stroke={g} strokeWidth="1.2" opacity="0.85" className={`nd-flow nd-d${i%5}`}/>
      ))}
      {/* explosions */}
      {[80,182,283].map((x,i)=>(<circle key={i} cx={x} cy={50} r="10" fill="oklch(0.80 0.18 60)" opacity="0.7"/>))}
      <text x="180" y="100" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fontWeight="700" fill={c} letterSpacing="2">::execute(harvest, ALL_HOSTILE)</text>
      <text x="180" y="114" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill={`${c}cc`} letterSpacing="2">::result OK · DELETED 8 unit(s)</text>
    </svg>
  );
}

function HarvestCanavar({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="hv-cnv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}55`} strokeWidth="0.4"/>
        </pattern>
      </defs>
      <rect width="360" height="220" fill="url(#hv-cnv-hatch)" opacity="0.4"/>
      {/* massive cosmic beast god */}
      <g transform="translate(180 130)">
        <path d="M -86 30 Q -88 -10, -50 -36 Q -10 -54, 30 -54 Q 80 -48, 100 -20 Q 110 10, 96 38 Q 70 56, 32 60 Q -20 64, -60 50 Q -84 42, -86 30 Z"
          fill="#0a0604" stroke={c} strokeWidth="1.4" style={{ filter: `drop-shadow(0 0 16px ${g}77)` }}/>
        {/* glowing eyes */}
        <ellipse cx="-22" cy="-16" rx="5" ry="4" fill={g} className="nd-eye"/>
        <ellipse cx="22" cy="-16" rx="5" ry="4" fill={g} className="nd-eye nd-d1"/>
        <ellipse cx="-22" cy="-16" rx="2" ry="1.5" fill="#fff"/>
        <ellipse cx="22" cy="-16" rx="2" ry="1.5" fill="#fff"/>
        {/* fangs */}
        <path d="M -10 10 L -8 22 L -6 10 M 6 10 L 8 22 L 10 10" fill="#fff" stroke={c} strokeWidth="0.4"/>
        {/* horns */}
        <path d="M -40 -36 Q -54 -48, -48 -64 M 40 -36 Q 54 -48, 48 -64" stroke={c} strokeWidth="3" fill="none"/>
      </g>
      {/* small beings cowering below */}
      {[60, 110, 250, 300].map((x,i) => (
        <ellipse key={i} cx={x} cy="200" rx="4" ry="2" fill="oklch(0.55 0.16 80)" opacity="0.7"/>
      ))}
      {/* blood scatter */}
      {[[80, 180],[260, 180],[160, 188],[300, 188]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.5" fill={c}/>
      ))}
    </svg>
  );
}

function HarvestSeytan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="hv-sy-bg"><stop offset="0%" stopColor={c} stopOpacity="0.25"/><stop offset="100%" stopColor="#000" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#hv-sy-bg)"/>
      {/* dark fleet — sigils sailing */}
      {[[50,140],[110,80],[170,150],[230,90],[290,140],[150,40],[260,170]].map(([x,y],i)=>(
        <g key={i} transform={`translate(${x} ${y})`} style={{ color: c }} className={i%2 ? 'nd-sigil' : 'nd-pulse'}>
          <circle cx="0" cy="0" r="11" fill="none" stroke={c} strokeWidth="0.8"/>
          <polygon points="0,-6 5.4,3.6 -5.4,3.6" fill={`${c}66`} stroke={c} strokeWidth="0.6"/>
          <circle cx="0" cy="0" r="2" fill={g}/>
        </g>
      ))}
      {/* soul tendrils being drawn back to one center */}
      <g stroke={g} strokeWidth="0.8" fill="none" opacity="0.65" strokeDasharray="3 4">
        {[[50,140],[110,80],[170,150],[230,90],[290,140],[150,40],[260,170]].map(([x,y],i)=>(
          <path key={i} d={`M ${x} ${y} Q ${(x+180)/2} ${(y+200)/2}, 180 200`}/>
        ))}
      </g>
      {/* central soul collector at bottom */}
      <g transform="translate(180 200)">
        <circle cx="0" cy="0" r="22" fill={`${c}66`} stroke={g} strokeWidth="1.4" className="nd-sigil" style={{ color: g }}/>
        <path d="M -12 0 L 0 -10 L 12 0 L 0 10 Z" fill={g}/>
      </g>
      <text x="180" y="118" textAnchor="middle" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="3">RUH HASATI</text>
    </svg>
  );
}

// ============================================================
// SET 4 — DIMENSIONAL / SUBSPACE
// ============================================================

function DimensionalInsan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dm-ins-rift">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
          <stop offset="30%" stopColor={g} stopOpacity="0.85"/>
          <stop offset="80%" stopColor={c} stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {Array.from({length:18}).map((_,i)=>(<circle key={i} cx={(i*43)%360} cy={(i*61)%220} r="0.5" fill="#fff" opacity="0.5"/>))}
      {/* subspace rift — vertical slash */}
      <ellipse cx="180" cy="110" rx="22" ry="86" fill="url(#dm-ins-rift)" className="nd-pulse" style={{ filter:`drop-shadow(0 0 14px ${g}aa)` }}/>
      <path d="M 180 24 L 184 60 L 180 100 L 184 140 L 180 196" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.95"/>
      {/* Genetic Warrior approaching */}
      <g transform="translate(110 130)">
        <path d="M -6 26 L -6 0 L -10 -10 L -6 -18 L 6 -18 L 10 -10 L 6 0 L 6 26 Z"
          fill="oklch(0.30 0.04 240)" stroke={c} strokeWidth="1.4"
          style={{ filter:`drop-shadow(0 0 6px ${g}aa)` }}/>
        <ellipse cx="0" cy="-18" rx="7" ry="9" fill="oklch(0.32 0.06 240)" stroke={c} strokeWidth="1"/>
        <circle cx="0" cy="-18" r="2" fill={g} className="nd-led"/>
        {/* aura */}
        <ellipse cx="0" cy="0" rx="30" ry="40" fill={g} opacity="0.18" className="nd-pulse"/>
      </g>
      <g fontFamily="JetBrains Mono" fontSize="7" fill={`${c}aa`}>
        <text x="10" y="20">::subspace rift OK</text>
        <text x="10" y="32">::genetic_armor ACTIVE</text>
      </g>
    </svg>
  );
}

function DimensionalZerg({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dm-zr-q">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9"/>
          <stop offset="40%" stopColor={g} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.5"/>
        </radialGradient>
      </defs>
      {/* queen on left */}
      <g transform="translate(110 110)">
        <path d="M -22 50 L -22 -8 L -32 -22 L -18 -34 L -26 -50 L 0 -56 L 26 -50 L 18 -34 L 32 -22 L 22 -8 L 22 50 Z"
          fill="url(#dm-zr-q)" stroke={c} strokeWidth="1.5" className="nd-breath"
          style={{ filter:`drop-shadow(0 0 12px ${g}99)` }}/>
        <circle cx="-6" cy="-12" r="2" fill={g}/>
        <circle cx="6" cy="-12" r="2" fill={g}/>
        <path d="M -16 -50 Q -28 -60, -24 -68 M 16 -50 Q 28 -60, 24 -68" stroke={c} strokeWidth="2" fill="none"/>
      </g>
      {/* ancestor wurm on right */}
      <g transform="translate(280 110)">
        <path d="M -50 0 Q -40 -32, -10 -36 Q 30 -38, 50 -16 Q 56 6, 40 24 Q 0 38, -30 26 Q -52 16, -50 0 Z"
          fill="#0a0210" stroke={c} strokeWidth="1.5" className="nd-pulse"
          style={{ filter:`drop-shadow(0 0 14px ${g}99)` }}/>
        <ellipse cx="32" cy="-12" rx="3" ry="2.5" fill={g} className="nd-eye"/>
        <ellipse cx="40" cy="-8" rx="2" ry="1.5" fill="#fff"/>
        {/* fangs */}
        <path d="M 40 8 L 46 18 L 50 8" fill="#fff" stroke={c} strokeWidth="0.4"/>
      </g>
      {/* glowing tendril link */}
      <g stroke={g} strokeWidth="1.4" fill="none" opacity="0.7" className="nd-vein">
        <path d="M 132 100 Q 200 80, 230 110"/>
        <path d="M 132 120 Q 200 140, 230 130"/>
      </g>
      {/* dimensional ripple between */}
      <ellipse cx="180" cy="110" rx="46" ry="20" fill="none" stroke={g} strokeWidth="0.6" opacity="0.55"/>
      <ellipse cx="180" cy="110" rx="30" ry="12" fill="none" stroke={g} strokeWidth="0.5" opacity="0.4"/>
    </svg>
  );
}

function DimensionalOtomat({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="dm-oto-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 0 H12 M0 0 V12" stroke={`${c}30`} strokeWidth="0.3"/>
        </pattern>
        <radialGradient id="dm-oto-core">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
          <stop offset="40%" stopColor={g} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.4"/>
        </radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#dm-oto-grid)"/>
      {/* parallel Demiurges left + right */}
      {[[100, 110], [260, 110]].map(([x,y],i)=>(
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-22" y="-32" width="44" height="64" fill="oklch(0.24 0.04 240)" stroke={c} strokeWidth="1.4"/>
          <rect x="-16" y="-26" width="32" height="52" fill="none" stroke={`${c}55`} strokeWidth="0.4"/>
          <circle cx="0" cy="-14" r="4" fill={g} className="nd-led"/>
          <rect x="-12" y="-2" width="24" height="14" fill="#0a0e1a" stroke={`${c}88`} strokeWidth="0.4"/>
          <text x="0" y="6" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5" fill={g}>{`v9.0.${i}`}</text>
          <text x="0" y="11" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="4.5" fill={`${c}aa`}>{i===0?'::THIS':'::MIRROR'}</text>
        </g>
      ))}
      {/* central infinity core (Sonsuzluk Çekirdek) */}
      <g transform="translate(180 110)" className="nd-pulse">
        <circle cx="0" cy="0" r="28" fill="url(#dm-oto-core)" stroke={g} strokeWidth="1"
          style={{ filter:`drop-shadow(0 0 14px ${g}aa)` }}/>
        <path d="M -16 0 Q -12 -8, 0 -8 Q 12 -8, 16 0 Q 12 8, 0 8 Q -12 8, -16 0 Z" fill="none" stroke="#fff" strokeWidth="1"/>
        <path d="M 0 -8 Q 12 -8, 16 0 Q 12 8, 0 8 Q -12 8, -16 0 Q -12 -8, 0 -8 Z" fill="none" stroke="#fff" strokeWidth="1"/>
        <circle cx="-10" cy="0" r="2" fill={g}/>
        <circle cx="10" cy="0" r="2" fill={g}/>
        <text x="0" y="22" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={c}>∞-CORE</text>
      </g>
      {/* data flow lines */}
      <g stroke={g} strokeWidth="0.8" fill="none" strokeDasharray="2 3">
        <line x1="122" y1="110" x2="152" y2="110" className="nd-flow"/>
        <line x1="208" y1="110" x2="238" y2="110" className="nd-flow nd-d2"/>
      </g>
    </svg>
  );
}

function DimensionalCanavar({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dm-cnv-bg"><stop offset="0%" stopColor={c} stopOpacity="0.20"/><stop offset="100%" stopColor="#000" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#dm-cnv-bg)"/>
      {/* physical beast (lower) */}
      <g transform="translate(180 170)" opacity="0.7">
        <path d="M -42 0 Q -36 -18, -12 -22 Q 16 -24, 38 -16 Q 50 -2, 44 12 Q 32 22, 12 24 L 10 30 M 26 14 L 30 30 M -42 0 L -44 24 L -42 30 M -36 6 L -34 24 L -32 30"
          fill="oklch(0.10 0.04 50)" stroke={c} strokeWidth="1.2"/>
        <circle cx="-10" cy="-10" r="2" fill={c}/>
        <circle cx="10" cy="-10" r="2" fill={c}/>
      </g>
      {/* spirit form rising (upper, glowing) */}
      <g transform="translate(180 80)" className="nd-pulse">
        <path d="M -42 0 Q -36 -18, -12 -22 Q 16 -24, 38 -16 Q 50 -2, 44 12 Q 32 22, 12 24 M 26 14 L 30 30 M -42 0 L -44 24"
          fill={`${g}33`} stroke={g} strokeWidth="1.2"
          style={{ filter:`drop-shadow(0 0 14px ${g})` }}/>
        <ellipse cx="-10" cy="-10" rx="3" ry="2" fill={g} className="nd-eye"/>
        <ellipse cx="10" cy="-10" rx="3" ry="2" fill={g} className="nd-eye nd-d1"/>
      </g>
      {/* connecting wisps */}
      <g stroke={g} strokeWidth="0.6" fill="none" opacity="0.7" strokeDasharray="2 4">
        <path d="M 178 150 L 175 110"/>
        <path d="M 200 150 L 205 110"/>
      </g>
      {/* parallel beast silhouette on side */}
      <g transform="translate(60 70)" opacity="0.55">
        <path d="M -16 0 Q -14 -10, -4 -14 Q 8 -16, 18 -10 Q 22 -2, 20 8 Q 12 14, 0 14 L -16 0 Z" fill="none" stroke={c} strokeWidth="1"/>
        <circle cx="-2" cy="-4" r="1" fill={g}/>
      </g>
      <g transform="translate(310 80)" opacity="0.55">
        <path d="M -16 0 Q -14 -10, -4 -14 Q 8 -16, 18 -10 Q 22 -2, 20 8 Q 12 14, 0 14 L -16 0 Z" fill="none" stroke={c} strokeWidth="1"/>
        <circle cx="2" cy="-4" r="1" fill={g}/>
      </g>
      <text x="180" y="208" textAnchor="middle" fontFamily="Chakra Petch" fontSize="8" fill={`${c}aa`} letterSpacing="3">RUH AV · BOYUTLAR ARASI</text>
    </svg>
  );
}

function DimensionalSeytan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dm-sy-bg"><stop offset="0%" stopColor={c} stopOpacity="0.25"/><stop offset="100%" stopColor="#000" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#dm-sy-bg)"/>
      {/* grimoire opening — book with rift coming out */}
      <g transform="translate(180 130)">
        {/* book pages spread */}
        <path d="M -70 30 L -2 -6 L 70 30 L 2 30 L -2 -6 Z" fill="oklch(0.14 0.06 15)" stroke={c} strokeWidth="1"/>
        <path d="M 2 -6 L 70 30 L 2 30 Z" fill="oklch(0.12 0.06 15)" stroke={c} strokeWidth="1"/>
        {/* central rift glow */}
        <ellipse cx="-2" cy="-2" rx="14" ry="20" fill={g} className="nd-sigil" style={{ filter:`drop-shadow(0 0 16px ${g})`, color: g }} opacity="0.85"/>
        <ellipse cx="-2" cy="-2" rx="7" ry="11" fill="#fff" opacity="0.95"/>
        {/* runes flying out */}
        {['✦','⊕','◇','✧'].map((s,i)=>{
          const a = (i/4)*Math.PI*2 - Math.PI/2;
          const x = Math.cos(a)*54;
          const y = -10 + Math.sin(a)*30 - 20;
          return <text key={i} x={x} y={y} textAnchor="middle" fontFamily="Chakra Petch" fontSize="13" fill={g}
            style={{ filter:`drop-shadow(0 0 5px ${g})` }} className={`nd-pulse nd-d${i}`}>{s}</text>;
        })}
        {/* page text marks */}
        <g stroke={c} strokeWidth="0.4" opacity="0.5">
          {[12,18,24].map(yy=>(
            <g key={yy}>
              <line x1="-48" y1={yy} x2="-16" y2={yy}/>
              <line x1="16" y1={yy} x2="48" y2={yy}/>
            </g>
          ))}
        </g>
      </g>
      <text x="180" y="50" textAnchor="middle" fontFamily="Chakra Petch" fontSize="10" fontWeight="700" fill={c} letterSpacing="4">· YASAK GRİMUVA AÇILDI ·</text>
    </svg>
  );
}

// ============================================================
// SET 5 — COSMIC ENDGAME / UNIVERSE MASTER
// ============================================================

function CosmicInsan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="cm-ins-aura">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
          <stop offset="35%" stopColor={g} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* galaxies background */}
      {Array.from({length:60}).map((_,i)=>(<circle key={i} cx={(i*23)%360} cy={(i*17)%220} r="0.4" fill="#fff" opacity={0.3 + (i%4)*0.18}/>))}
      <ellipse cx="50" cy="40" rx="20" ry="6" fill={`${c}66`} transform="rotate(-25 50 40)"/>
      <ellipse cx="320" cy="60" rx="18" ry="5" fill={`${c}66`} transform="rotate(15 320 60)"/>
      {/* universe master — central figure with vast aura */}
      <g transform="translate(180 130)" className="nd-pulse" style={{ color: g }}>
        <circle cx="0" cy="0" r="90" fill="url(#cm-ins-aura)" opacity="0.55"/>
        <circle cx="0" cy="0" r="60" fill="url(#cm-ins-aura)" opacity="0.45"/>
        {/* body */}
        <path d="M -10 38 L -10 -6 L -14 -16 L -8 -24 L 8 -24 L 14 -16 L 10 -6 L 10 38 Z"
          fill="oklch(0.30 0.06 240)" stroke={c} strokeWidth="1.6"/>
        <ellipse cx="0" cy="-24" rx="9" ry="11" fill="oklch(0.32 0.06 240)" stroke={c} strokeWidth="1.2"/>
        {/* glowing eye band */}
        <rect x="-8" y="-25" width="16" height="3" fill={g} className="nd-blink"/>
        {/* aura halo runes */}
        {Array.from({length:8}).map((_,i)=>{
          const a = (i/8)*Math.PI*2;
          const x = Math.cos(a)*52, y = Math.sin(a)*52;
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily="JetBrains Mono" fontSize="9" fill={g}>★</text>;
        })}
      </g>
      <text x="180" y="206" textAnchor="middle" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="4">YUTUCU YILDIZ VARİSİ</text>
    </svg>
  );
}

function CosmicZerg({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="cm-zr-aura">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
          <stop offset="35%" stopColor={g} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* swarm fills the background */}
      {Array.from({length:80}).map((_,i)=>{
        const x = (i*13)%360, y = (i*29)%220;
        return <ellipse key={i} cx={x} cy={y} rx="2.5" ry="2" fill={c} opacity={0.4 + (i%5)*0.10}/>;
      })}
      {/* center: devouring queen, monstrously large */}
      <g transform="translate(180 130)" className="nd-breath">
        <circle cx="0" cy="0" r="86" fill="url(#cm-zr-aura)" opacity="0.7"/>
        <circle cx="0" cy="0" r="60" fill="url(#cm-zr-aura)" opacity="0.6"/>
        <path d="M -34 60 L -34 -16 L -44 -32 L -28 -46 L -38 -64 L 0 -72 L 38 -64 L 28 -46 L 44 -32 L 34 -16 L 34 60 Z"
          fill="url(#cm-zr-aura)" stroke="#fff" strokeWidth="1.6"
          style={{ filter:`drop-shadow(0 0 18px ${g})` }}/>
        {/* glowing eyes */}
        <circle cx="-9" cy="-16" r="3" fill={g} className="nd-eye"/>
        <circle cx="9" cy="-16" r="3" fill={g} className="nd-eye nd-d1"/>
        <circle cx="-9" cy="-16" r="1.4" fill="#fff"/>
        <circle cx="9" cy="-16" r="1.4" fill="#fff"/>
        {/* mandibles */}
        <path d="M -18 -54 Q -28 -68, -20 -84 M 18 -54 Q 28 -68, 20 -84" stroke={c} strokeWidth="2.8" fill="none"/>
        {/* tendril swarm wings */}
        <path d="M -34 -6 Q -68 -16, -86 8 Q -68 14, -52 16 Q -42 10, -34 0" fill={c} stroke={g} strokeWidth="0.8"/>
        <path d="M 34 -6 Q 68 -16, 86 8 Q 68 14, 52 16 Q 42 10, 34 0" fill={c} stroke={g} strokeWidth="0.8"/>
      </g>
      <text x="180" y="208" textAnchor="middle" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="4">YUTUCU KRALİÇE</text>
    </svg>
  );
}

function CosmicOtomat({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="cm-oto-bg" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 0 H20 M0 0 V20" stroke={`${c}30`} strokeWidth="0.3"/>
        </pattern>
        <radialGradient id="cm-oto-eq">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
          <stop offset="30%" stopColor={g} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.2"/>
        </radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#cm-oto-bg)"/>
      {/* universe as schematic graph spanning whole canvas */}
      <g stroke={c} strokeWidth="0.5" opacity="0.6" fill="none">
        {Array.from({length:24}).map((_,i)=>{
          const x = (i*17)%360, y = (i*11)%220;
          return <circle key={i} cx={x} cy={y} r="1.4" fill={c} className={`nd-led nd-d${i%5}`}/>;
        })}
        {/* lattice connecting all */}
        <path d="M 20 30 L 100 60 L 60 130 L 140 150 L 220 100 L 300 130 L 340 50 L 280 30 L 200 60 L 100 60"/>
      </g>
      {/* infinite core glyph */}
      <g transform="translate(180 110)" className="nd-pulse" style={{ color: g }}>
        <ellipse cx="0" cy="0" rx="68" ry="34" fill="url(#cm-oto-eq)" stroke={g} strokeWidth="1"
          style={{ filter:`drop-shadow(0 0 16px ${g})` }}/>
        {/* infinity */}
        <path d="M -32 0 Q -22 -16, 0 -16 Q 22 -16, 32 0 Q 22 16, 0 16 Q -22 16, -32 0 Z" fill="none" stroke="#fff" strokeWidth="1.8"/>
        <path d="M 0 -16 Q 22 -16, 32 0 Q 22 16, 0 16 Q -22 16, -32 0 Q -22 -16, 0 -16 Z" fill="none" stroke="#fff" strokeWidth="1.8"/>
        <circle cx="-20" cy="0" r="2" fill={g}/>
        <circle cx="20" cy="0" r="2" fill={g}/>
      </g>
      <text x="180" y="208" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" fill={c} letterSpacing="3">::SONSUZ MANTIK DEMIURGE · v∞</text>
    </svg>
  );
}

function CosmicCanavar({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="cm-cnv-aura">
          <stop offset="0%" stopColor={g} stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="130" rx="200" ry="100" fill="url(#cm-cnv-aura)"/>
      {/* galaxy in mouth — primordial beast god whose form spans galaxies */}
      <g transform="translate(180 120)">
        {/* head silhouette spanning */}
        <path d="M -160 28 Q -150 -30, -90 -50 Q -20 -64, 50 -56 Q 130 -42, 160 -10 Q 160 28, 130 40 Q 60 56, -10 50 Q -100 38, -140 32 Z"
          fill="#040201" stroke={c} strokeWidth="1.6"
          style={{ filter:`drop-shadow(0 0 16px ${g}99)` }}/>
        {/* glowing eyes */}
        <circle cx="-40" cy="-20" r="6" fill={g} className="nd-eye" style={{ filter:`drop-shadow(0 0 10px ${g})` }}/>
        <circle cx="40" cy="-20" r="6" fill={g} className="nd-eye nd-d1" style={{ filter:`drop-shadow(0 0 10px ${g})` }}/>
        <circle cx="-40" cy="-20" r="2.4" fill="#fff"/>
        <circle cx="40" cy="-20" r="2.4" fill="#fff"/>
        {/* fangs row */}
        {[-18,-8,2,12,22].map((x,i)=>(
          <path key={i} d={`M ${x} 10 L ${x+2} 24 L ${x+4} 10`} fill="#fff" stroke={c} strokeWidth="0.4"/>
        ))}
        {/* horns */}
        <path d="M -90 -50 Q -110 -68, -100 -86 M 90 -50 Q 110 -68, 100 -86" stroke={c} strokeWidth="3.4" fill="none"/>
        {/* galaxy in mouth */}
        <ellipse cx="0" cy="14" rx="20" ry="4" fill={`${g}99`} className="nd-pulse"/>
      </g>
      <text x="180" y="208" textAnchor="middle" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="4">PRIMORDIAL CANAVAR TANRI</text>
    </svg>
  );
}

function CosmicSeytan({ c, g }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="cm-sy-aura">
          <stop offset="0%" stopColor={c} stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="360" height="220" fill="url(#cm-sy-aura)"/>
      {/* universal sigil pentagram on background */}
      <g transform="translate(180 110)" style={{ color: c }} className="nd-sigil">
        <circle r="100" fill="none" stroke={c} strokeWidth="0.6" opacity="0.5"/>
        <circle r="78" fill="none" stroke={c} strokeWidth="0.4" opacity="0.5"/>
        {(() => {
          const pts = Array.from({length:5}, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI/2;
            return [Math.cos(a)*78, Math.sin(a)*78];
          });
          const order = [0,2,4,1,3,0];
          const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
          return <path d={d} stroke={g} strokeWidth="1.4" fill="none" style={{ filter:`drop-shadow(0 0 8px ${g})` }}/>;
        })()}
      </g>
      {/* Eternal Dark Lord — crowned figure on a giant throne */}
      <g transform="translate(180 130)">
        {/* throne — cathedral */}
        <path d="M -42 60 L -42 -22 L -34 -36 L -22 -50 L -10 -60 L 0 -68 L 10 -60 L 22 -50 L 34 -36 L 42 -22 L 42 60 Z"
          fill="rgba(20,2,6,0.95)" stroke={c} strokeWidth="1.5"
          style={{ filter:`drop-shadow(0 0 14px ${g}77)` }}/>
        {/* spikes */}
        {[-30,-14,0,14,30].map((x,i) => (
          <path key={i} d={`M ${x} -50 L ${x+1} -68 L ${x+2} -50`} fill={c}/>
        ))}
        {/* central figure crown */}
        <circle cx="0" cy="-30" r="11" fill="#0a0103" stroke={c} strokeWidth="1.4"/>
        <circle cx="-3" cy="-30" r="1.6" fill={g} className="nd-eye"/>
        <circle cx="3" cy="-30" r="1.6" fill={g} className="nd-eye nd-d1"/>
        {/* horn crown */}
        <path d="M -10 -38 Q -16 -50, -14 -58 M 10 -38 Q 16 -50, 14 -58 M 0 -41 V -54" stroke={c} strokeWidth="2.4" fill="none"/>
        {/* central sigil on chest */}
        <circle cx="0" cy="-6" r="6" fill={g} className="nd-sigil" style={{ color: g, filter:`drop-shadow(0 0 6px ${g})` }}/>
      </g>
      <text x="180" y="208" textAnchor="middle" fontFamily="Chakra Petch" fontSize="11" fontWeight="700" fill={c} letterSpacing="4">SONSUZ KARANLIK HÜKÜMDAR</text>
    </svg>
  );
}

Object.assign(window, { RaceStoryArt, STORY_SET_LABELS });
