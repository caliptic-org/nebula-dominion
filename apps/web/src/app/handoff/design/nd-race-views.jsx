// Nebula Dominion — Race-specific BIG views
// RaceBaseField, RaceBuildCatalog, RaceProductionFlow, RaceMergeRitual, RaceRosterGrid

// ============================================================
// RaceBaseField — replaces the iso grid. Top-down view in
// each race's native metaphor. Pure SVG.
// VB: 0 0 390 460 (matches Screen interior)
// ============================================================
function RaceBaseField({ race, focusedIdx = 1 }) {
  if (race.key === 'insan')   return <FieldInsan race={race} focusedIdx={focusedIdx}/>;
  if (race.key === 'zerg')    return <FieldZerg race={race} focusedIdx={focusedIdx}/>;
  if (race.key === 'otomat')  return <FieldOtomat race={race} focusedIdx={focusedIdx}/>;
  if (race.key === 'canavar') return <FieldCanavar race={race} focusedIdx={focusedIdx}/>;
  if (race.key === 'seytan')  return <FieldSeytan race={race} focusedIdx={focusedIdx}/>;
  return null;
}

// ---- İnsan: Modular Military City (iso) ----
function FieldInsan({ race, focusedIdx }) {
  const c = race.primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="ins-iso" width="40" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 11 L 20 0 L 40 11 L 20 22 Z" fill="none" stroke={`${c}22`} strokeWidth="0.5"/>
        </pattern>
        <radialGradient id="ins-ground" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="180" width="390" height="280" fill="url(#ins-iso)"/>
      <rect x="0" y="180" width="390" height="280" fill="url(#ins-ground)"/>

      {/* Roads / runways */}
      <path d="M 0 320 L 390 300" stroke={`${c}33`} strokeWidth="14" strokeDasharray="2 18"/>
      <path d="M 195 200 L 195 460" stroke={`${c}22`} strokeWidth="10" strokeDasharray="2 18"/>

      {/* Buildings — rectangular bays w/ details */}
      {[
        { x: 90, y: 240, w: 76, h: 44, label: 'KOMUTA', det: 'antenna' },
        { x: 210, y: 260, w: 92, h: 56, label: 'REAKTÖR', det: 'stack' },
        { x: 50, y: 330, w: 64, h: 36, label: 'KIŞLA', det: 'door' },
        { x: 230, y: 360, w: 84, h: 48, label: 'AKADEMİ', det: 'dome' },
        { x: 120, y: 400, w: 56, h: 32, label: 'AMBAR', det: '' },
      ].map((b,i) => {
        const focus = i === focusedIdx;
        return (
          <g key={i}>
            {/* shadow */}
            <ellipse cx={b.x+b.w/2} cy={b.y+b.h*1.18} rx={b.w*0.55} ry="6" fill="#000" opacity="0.45"/>
            {/* top */}
            <path d={`M${b.x} ${b.y} L${b.x+b.w/2} ${b.y-b.h*0.5} L${b.x+b.w} ${b.y} L${b.x+b.w/2} ${b.y+b.h*0.5} Z`}
              fill="oklch(0.26 0.04 250)" stroke={focus ? race.glow : `${c}aa`} strokeWidth={focus ? 1.5 : 1}/>
            <path d={`M${b.x} ${b.y} L${b.x} ${b.y+b.h*0.7} L${b.x+b.w/2} ${b.y+b.h*1.2} L${b.x+b.w/2} ${b.y+b.h*0.5} Z`}
              fill="#0C1224" stroke={`${c}66`} strokeWidth="1"/>
            <path d={`M${b.x+b.w} ${b.y} L${b.x+b.w} ${b.y+b.h*0.7} L${b.x+b.w/2} ${b.y+b.h*1.2} L${b.x+b.w/2} ${b.y+b.h*0.5} Z`}
              fill="#070B17" stroke={`${c}55`} strokeWidth="1"/>
            {/* details on top */}
            {b.det === 'antenna' && (
              <g><line x1={b.x+b.w*0.7} y1={b.y-b.h*0.5} x2={b.x+b.w*0.7} y2={b.y-b.h*1.1} stroke={c} strokeWidth="1.4"/><circle cx={b.x+b.w*0.7} cy={b.y-b.h*1.1} r="1.6" fill={c} className={`nd-led nd-d${i%4}`}/></g>
            )}
            {b.det === 'stack' && (
              <g><rect x={b.x+b.w*0.55} y={b.y-b.h*0.85} width="6" height={b.h*0.5} fill="#0C1224" stroke={c} strokeWidth="1"/><circle cx={b.x+b.w*0.58} cy={b.y-b.h*0.95} r="2" fill={`${c}aa`} opacity="0.6" className="nd-pulse"/></g>
            )}
            {b.det === 'dome' && (
              <ellipse cx={b.x+b.w*0.5} cy={b.y-b.h*0.1} rx={b.w*0.18} ry={b.h*0.25} fill="none" stroke={c} strokeWidth="1"/>
            )}
            <text x={b.x+b.w/2} y={b.y+3} textAnchor="middle"
              fontFamily="JetBrains Mono" fontSize="6.5" fill={c} letterSpacing="0.8">{b.label}</text>
            {focus && (
              <g>
                <path d={`M${b.x} ${b.y} L${b.x+b.w/2} ${b.y-b.h*0.5} L${b.x+b.w} ${b.y} L${b.x+b.w/2} ${b.y+b.h*0.5} Z`}
                  fill="none" stroke={race.glow} strokeWidth="2"/>
                <rect x={b.x-3} y={b.y-b.h*0.5-3} width="6" height="6" fill={race.glow}/>
                <rect x={b.x+b.w-3} y={b.y-b.h*0.5-3} width="6" height="6" fill={race.glow}/>
              </g>
            )}
          </g>
        );
      })}

      {/* idle units */}
      {[[160, 430],[180, 433],[170, 438],[220, 425]].map(([x,y],i) => (
        <g key={i}><ellipse cx={x} cy={y+2} rx="3" ry="1.2" fill="#000" opacity="0.5"/><circle cx={x} cy={y} r="2.2" fill={c}/></g>
      ))}
    </svg>
  );
}

// ---- Zerg: Organic Hive Veins (top-down) ----
function FieldZerg({ race, focusedIdx }) {
  const c = race.primary;
  const g = race.glow;
  const chambers = [
    { x: 195, y: 300, r: 44, label: 'KOVAN ÇEKİRDEK', queen: true },
    { x: 105, y: 240, r: 28, label: 'BİYOKÜTLE HAVUZ' },
    { x: 290, y: 230, r: 26, label: 'MUTASYON ÇUKURU' },
    { x: 90,  y: 380, r: 24, label: 'GENOM TÜMSEK' },
    { x: 305, y: 380, r: 30, label: 'YUTUCU TÜMSEK' },
    { x: 200, y: 420, r: 18, label: 'BROOD KOZA' },
  ];
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="zer-ground" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.18"/>
          <stop offset="60%" stopColor={c} stopOpacity="0.05"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="zer-chamber">
          <stop offset="0%" stopColor={g} stopOpacity="0.6"/>
          <stop offset="40%" stopColor={c} stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#1a0420" stopOpacity="0.9"/>
        </radialGradient>
        <radialGradient id="zer-queen">
          <stop offset="0%" stopColor="#ffd1f0" stopOpacity="0.9"/>
          <stop offset="35%" stopColor={g} stopOpacity="0.75"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.2"/>
        </radialGradient>
        <filter id="zer-blur"><feGaussianBlur stdDeviation="1"/></filter>
      </defs>
      <rect x="0" y="180" width="390" height="280" fill="url(#zer-ground)"/>

      {/* Vein network — bezier between chambers */}
      <g stroke={c} fill="none" opacity="0.7">
        {/* central from queen out to each */}
        {chambers.slice(1).map((ch, i) => {
          const cx = 195, cy = 300;
          const mx = (cx + ch.x) / 2 + (i % 2 ? 24 : -24);
          const my = (cy + ch.y) / 2 + (i % 2 ? -18 : 18);
          return <path key={i} d={`M ${cx} ${cy} Q ${mx} ${my}, ${ch.x} ${ch.y}`} strokeWidth={4 - i*0.3} opacity="0.55"/>;
        })}
        {/* secondary veins */}
        <path d="M 105 240 Q 60 280, 90 380" strokeWidth="1.4" opacity="0.4"/>
        <path d="M 290 230 Q 340 290, 305 380" strokeWidth="1.4" opacity="0.4"/>
      </g>
      {/* glow on veins */}
      <g stroke={g} fill="none" opacity="0.35" filter="url(#zer-blur)" className="nd-vein">
        {chambers.slice(1).map((ch, i) => {
          const cx = 195, cy = 300;
          const mx = (cx + ch.x) / 2 + (i % 2 ? 24 : -24);
          const my = (cy + ch.y) / 2 + (i % 2 ? -18 : 18);
          return <path key={i} d={`M ${cx} ${cy} Q ${mx} ${my}, ${ch.x} ${ch.y}`} strokeWidth="2"/>;
        })}
      </g>

      {/* Chambers */}
      {chambers.map((ch, i) => {
        const focus = i === focusedIdx;
        // organic blob — circle with slight bumps via path
        const bumps = 8;
        const pts = Array.from({ length: bumps * 2 }, (_, k) => {
          const a = (k / (bumps*2)) * Math.PI * 2;
          const r = ch.r * (1 + Math.sin(k*1.7) * 0.08);
          return [ch.x + Math.cos(a)*r, ch.y + Math.sin(a)*r];
        });
        const d = 'M ' + pts.map(p => p.join(' ')).join(' L ') + ' Z';
        return (
          <g key={i}>
            <path d={d} fill={ch.queen ? 'url(#zer-queen)' : 'url(#zer-chamber)'}
              stroke={focus ? g : `${c}aa`} strokeWidth={focus ? 2 : 1.2}
              style={{ filter: ch.queen ? `drop-shadow(0 0 12px ${g}aa)` : focus ? `drop-shadow(0 0 8px ${g}99)` : 'none' }}/>
            {/* embryo dots inside non-queen */}
            {!ch.queen && Array.from({ length: 3 }).map((_, k) => {
              const a = (k / 3) * Math.PI * 2 + 0.4;
              return <circle key={k} cx={ch.x + Math.cos(a)*ch.r*0.4} cy={ch.y + Math.sin(a)*ch.r*0.4} r="2" fill={g} opacity="0.8"/>;
            })}
            {/* queen marker */}
            {ch.queen && (
              <g className="nd-pulse" style={{ color: g }}>
                <circle cx={ch.x} cy={ch.y} r="10" fill={g} opacity="0.85"/>
                <circle cx={ch.x} cy={ch.y} r="5" fill="#fff" opacity="0.9"/>
              </g>
            )}
            {focus && (
              <g fill="none" stroke={g} strokeDasharray="3 3" strokeWidth="1">
                <circle cx={ch.x} cy={ch.y} r={ch.r + 6}/>
              </g>
            )}
          </g>
        );
      })}

      {/* spore floaters at edges */}
      {[[28, 220],[360, 270],[34, 410],[358, 430]].map(([x,y],i)=>(
        <g key={i} opacity="0.7" className={`nd-spore nd-d${i+1}`}>
          <circle cx={x} cy={y} r="1.5" fill={g}/>
          <circle cx={x+5} cy={y-4} r="0.8" fill={g}/>
        </g>
      ))}
    </svg>
  );
}

// ---- Otomat: Circuit Schematic Grid (top-down) ----
function FieldOtomat({ race, focusedIdx }) {
  const c = race.primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="oto-grid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 0 H14 M0 0 V14" stroke={`${c}33`} strokeWidth="0.4"/>
        </pattern>
        <pattern id="oto-grid-maj" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M0 0 H56 M0 0 V56" stroke={`${c}55`} strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect x="0" y="180" width="390" height="280" fill="rgba(8,18,32,0.6)"/>
      <rect x="0" y="180" width="390" height="280" fill="url(#oto-grid)"/>
      <rect x="0" y="180" width="390" height="280" fill="url(#oto-grid-maj)"/>

      {/* Datum markings, scale */}
      <g fontFamily="JetBrains Mono" fontSize="6" fill={`${c}77`}>
        {[0,1,2,3,4,5,6].map(i => (<text key={i} x={6 + i*56} y={196}>{(i*128).toString(16).padStart(4,'0').toUpperCase()}</text>))}
        {[0,1,2,3,4].map(i => (<text key={i} x={4} y={222 + i*56}>0x{(i*100).toString(16).padStart(2,'0').toUpperCase()}</text>))}
      </g>

      {/* CPU core */}
      <g>
        <rect x="155" y="280" width="80" height="80" fill="rgba(20,36,64,0.85)" stroke={c} strokeWidth="1.4"/>
        <rect x="161" y="286" width="68" height="68" fill="none" stroke={`${c}55`} strokeWidth="0.5"/>
        <rect x="180" y="305" width="30" height="30" fill={c} opacity="0.25"/>
        <text x="195" y="324" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={c} letterSpacing="1.5">CORE</text>
        <text x="195" y="335" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={`${c}cc`}>v9.0.3-rc</text>
        {/* pins */}
        {Array.from({length:8}).map((_,i) => (
          <g key={i} stroke={c} strokeWidth="0.8">
            <line x1={155+10*i+6} y1="280" x2={155+10*i+6} y2="272"/>
            <line x1={155+10*i+6} y1="360" x2={155+10*i+6} y2="368"/>
            <line x1="155" y1={280+10*i+6} x2="147" y2={280+10*i+6}/>
            <line x1="235" y1={280+10*i+6} x2="243" y2={280+10*i+6}/>
          </g>
        ))}
      </g>

      {/* Modules */}
      {[
        { x: 48,  y: 230, w: 70, h: 36, label: 'DATA_BUS',  v: '2.1' },
        { x: 270, y: 220, w: 80, h: 38, label: 'ASM_LINE',  v: '1.4' },
        { x: 30,  y: 320, w: 66, h: 56, label: 'LOGIC_MAT', v: '3.0' },
        { x: 285, y: 320, w: 74, h: 50, label: 'AETHER_IO', v: '0.9' },
        { x: 150, y: 400, w: 90, h: 34, label: 'BUFFER',    v: '2.0' },
      ].map((m, i) => {
        const focus = i === focusedIdx;
        return (
          <g key={i}>
            <rect x={m.x} y={m.y} width={m.w} height={m.h} fill="rgba(8,18,32,0.85)"
              stroke={focus ? race.glow : c} strokeWidth={focus ? 1.6 : 1}/>
            <rect x={m.x+3} y={m.y+3} width={m.w-6} height={m.h-6} fill="none" stroke={`${c}33`} strokeWidth="0.4"/>
            <text x={m.x+6} y={m.y+12} fontFamily="JetBrains Mono" fontSize="6.5" fill={c} letterSpacing="1.2">{m.label}</text>
            <text x={m.x+m.w-6} y={m.y+12} textAnchor="end" fontFamily="JetBrains Mono" fontSize="5.5" fill={`${c}aa`}>v{m.v}</text>
            {/* inner activity LED */}
            <circle cx={m.x+m.w-8} cy={m.y+m.h-8} r="1.6" fill={race.glow} className={`nd-led nd-d${i%4}`}/>
            {focus && (<rect x={m.x-3} y={m.y-3} width={m.w+6} height={m.h+6} fill="none" stroke={race.glow} strokeWidth="1" strokeDasharray="2 2"/>)}
          </g>
        );
      })}

      {/* Traces — orthogonal */}
      <g stroke={c} fill="none" strokeWidth="1" opacity="0.9" strokeDasharray="3 5">
        <path d="M 118 248 L 147 248 L 147 290" className="nd-flow"/>
        <path d="M 270 240 L 243 240 L 243 290" className="nd-flow nd-d1"/>
        <path d="M 96 350 L 147 350" className="nd-flow nd-d2"/>
        <path d="M 285 345 L 243 345" className="nd-flow nd-d3"/>
        <path d="M 195 360 L 195 400" className="nd-flow nd-d4"/>
        {/* trace nodes */}
        {[[147,248],[243,240],[147,290],[243,290],[147,350],[243,345],[195,360],[195,400]].map((p,i)=>(
          <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill={c} strokeDasharray="0"/>
        ))}
      </g>
      {/* data packets sliding (static dot) */}
      <g fill={race.glow} className="nd-tick">
        <circle cx="180" cy="248" r="1.8"/>
        <circle cx="220" cy="345" r="1.8"/>
      </g>
    </svg>
  );
}

// ---- Canavar: Hand-drawn Territory (parchment) ----
function FieldCanavar({ race, focusedIdx }) {
  const c = race.primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="cnv-parch" cx="50%" cy="55%" r="80%">
          <stop offset="0%" stopColor={c} stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <pattern id="cnv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}aa`} strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect x="0" y="180" width="390" height="280" fill="url(#cnv-parch)"/>

      {/* Mountain ranges — hand-drawn triangles */}
      <g stroke={c} strokeWidth="1.2" fill="none" opacity="0.85">
        <path d="M 20 230 L 38 200 L 55 230 M 50 230 L 72 195 L 92 230 M 88 230 L 108 215 L 124 230"/>
        <path d="M 270 220 L 290 192 L 308 220 M 305 220 L 326 200 L 348 220 M 345 220 L 362 210 L 376 220"/>
      </g>
      {/* Forests — cluster dots */}
      <g fill={c} opacity="0.45">
        {Array.from({length:14}).map((_,i)=>{
          const x = 145 + (i%5)*8 + Math.sin(i*1.3)*2;
          const y = 220 + Math.floor(i/5)*7;
          return <circle key={i} cx={x} cy={y} r="2.2"/>;
        })}
      </g>

      {/* River — hand-drawn squiggle */}
      <path d="M 0 380 Q 80 340, 160 370 Q 240 400, 320 360 Q 360 350, 390 365"
        stroke={`${c}88`} strokeWidth="2.5" fill="none" opacity="0.5"/>
      <path d="M 0 380 Q 80 340, 160 370 Q 240 400, 320 360 Q 360 350, 390 365"
        stroke={c} strokeWidth="0.6" fill="none" opacity="0.8" strokeDasharray="2 6"/>

      {/* Lairs / dens / throne */}
      {[
        { x: 80,  y: 280, r: 14, label: 'KEMİK İN',   kind: 'lair' },
        { x: 195, y: 295, r: 22, label: 'ALFA TAHTI', kind: 'throne' },
        { x: 310, y: 285, r: 14, label: 'AV KAMPI',   kind: 'lair' },
        { x: 110, y: 410, r: 12, label: 'VAHŞİ ÇUKUR',kind: 'pit' },
        { x: 295, y: 415, r: 12, label: 'ATALAR SUNAĞI', kind: 'altar' },
      ].map((d, i) => {
        const focus = i === focusedIdx;
        return (
          <g key={i}>
            {/* hatched halo */}
            <circle cx={d.x} cy={d.y} r={d.r + 6} fill="url(#cnv-hatch)" opacity="0.55"/>
            {/* main */}
            {d.kind === 'throne' && (
              <g>
                <path d={`M ${d.x-d.r} ${d.y+d.r-2} L ${d.x-d.r/2} ${d.y-d.r} L ${d.x+d.r/2} ${d.y-d.r} L ${d.x+d.r} ${d.y+d.r-2} Z`}
                  fill="rgba(40,20,10,0.85)" stroke={focus ? race.glow : c} strokeWidth={focus?2:1.4}/>
                {/* skull symbol */}
                <circle cx={d.x} cy={d.y-2} r="4" fill={c}/>
                <rect x={d.x-3} y={d.y+1} width="6" height="3" fill={c}/>
              </g>
            )}
            {d.kind === 'lair' && (
              <g>
                <path d={`M ${d.x} ${d.y+d.r} Q ${d.x-d.r} ${d.y}, ${d.x} ${d.y-d.r} Q ${d.x+d.r} ${d.y}, ${d.x} ${d.y+d.r} Z`}
                  fill="rgba(30,12,4,0.8)" stroke={focus ? race.glow : c} strokeWidth={focus?1.6:1.2}/>
                <circle cx={d.x} cy={d.y} r="2.5" fill="#000"/>
              </g>
            )}
            {d.kind === 'pit' && (
              <ellipse cx={d.x} cy={d.y} rx={d.r} ry={d.r*0.7} fill="rgba(30,12,4,0.8)" stroke={focus ? race.glow : c} strokeWidth={focus?1.6:1.2}/>
            )}
            {d.kind === 'altar' && (
              <g>
                <rect x={d.x-d.r*0.7} y={d.y-2} width={d.r*1.4} height={d.r*0.6} fill="rgba(30,12,4,0.8)" stroke={focus ? race.glow : c} strokeWidth={focus?1.6:1.2}/>
                <rect x={d.x-2} y={d.y-d.r} width="4" height={d.r*0.8} fill={c}/>
              </g>
            )}
            <text x={d.x} y={d.y + d.r + 12} textAnchor="middle"
              fontFamily="Chakra Petch" fontSize="7" fill={c} letterSpacing="1">{d.label}</text>
            {focus && (
              <g><circle cx={d.x} cy={d.y} r={d.r + 10} fill="none" stroke={race.glow} strokeWidth="1" strokeDasharray="2 3"/></g>
            )}
          </g>
        );
      })}

      {/* Hunting trail — dashed dotted between throne and prey */}
      <path d="M 195 295 Q 250 320, 305 340" stroke={`${c}cc`} strokeWidth="0.8" fill="none" strokeDasharray="2 4"/>
      <path d="M 195 295 Q 140 330, 110 410" stroke={`${c}cc`} strokeWidth="0.8" fill="none" strokeDasharray="2 4"/>

      {/* prey roaming */}
      {[[60, 430],[340, 430],[160, 440],[230, 235]].map(([x,y],i)=>(
        <g key={i} className={`nd-eye nd-d${i+1}`}>
          <ellipse cx={x} cy={y+2} rx="3" ry="1" fill="#000" opacity="0.4"/>
          <path d={`M ${x-3} ${y} Q ${x} ${y-3}, ${x+3} ${y} Q ${x+2} ${y+2}, ${x-3} ${y} Z`} fill={c}/>
        </g>
      ))}
    </svg>
  );
}

// ---- Şeytan: Sigil Circle Court (radial) ----
function FieldSeytan({ race, focusedIdx }) {
  const c = race.primary;
  const cx = 195, cy = 320;
  const R = 130;
  const chambers = [
    { label: 'KARANLIK TAHT', kind: 'throne' },
    { label: 'RUH TOPLAYICI',  kind: 'collector' },
    { label: 'LANET TAPINAĞI', kind: 'temple' },
    { label: 'PAKT SEMBOLÜ',   kind: 'pact' },
    { label: 'YASAK GRİMUVA',  kind: 'tome' },
  ];
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="syt-floor" cx="50%" cy={`${(cy/460)*100}%`} r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.20"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="180" width="390" height="280" fill="url(#syt-floor)"/>

      {/* outer ring + inner */}
      <g fill="none" stroke={c} strokeWidth="1" opacity="0.75">
        <circle cx={cx} cy={cy} r={R}/>
        <circle cx={cx} cy={cy} r={R - 8}/>
        <circle cx={cx} cy={cy} r="40"/>
        <circle cx={cx} cy={cy} r="28"/>
      </g>
      {/* pentagram */}
      <g fill="none" stroke={c} strokeWidth="1.2" opacity="0.85">
        {(() => {
          const pts = Array.from({length:5}, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI/2;
            return [cx + Math.cos(a)*40, cy + Math.sin(a)*40];
          });
          const order = [0,2,4,1,3,0];
          const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
          return <path d={d}/>;
        })()}
      </g>
      {/* rune marks between rings */}
      <g fill={c} fontFamily="JetBrains Mono" fontSize="6" opacity="0.7">
        {Array.from({length:12}).map((_,i)=>{
          const a = (i / 12) * Math.PI * 2 - Math.PI/2;
          const r = R - 4;
          const x = cx + Math.cos(a)*r;
          const y = cy + Math.sin(a)*r;
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(${(a*180/Math.PI)+90} ${x} ${y})`}>✦</text>;
        })}
      </g>

      {/* Chambers at pentagram points */}
      {chambers.map((ch, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI/2;
        const x = cx + Math.cos(a) * (R - 22);
        const y = cy + Math.sin(a) * (R - 22);
        const focus = i === focusedIdx;
        return (
          <g key={i}>
            {/* candle wax pool */}
            <circle cx={x} cy={y} r="18"
              fill="rgba(30,4,8,0.85)" stroke={focus ? race.glow : c} strokeWidth={focus ? 2 : 1.2}
              style={{ filter: focus ? `drop-shadow(0 0 10px ${race.glow}aa)` : 'none' }}/>
            {/* candle */}
            <rect x={x-1.5} y={y-12} width="3" height="14" fill={`${c}aa`}/>
            <path d={`M ${x} ${y-14} Q ${x-3} ${y-18}, ${x} ${y-22} Q ${x+3} ${y-18}, ${x} ${y-14} Z`}
              fill={race.glow} opacity="0.9" className={`nd-flame nd-d${i}`}/>
            <circle cx={x} cy={y-19} r="1.4" fill="#fff" opacity="0.9"/>
            {/* label */}
            <text x={x} y={y + 30} textAnchor="middle"
              fontFamily="Chakra Petch" fontSize="7" fill={c} letterSpacing="1.1">{ch.label}</text>
            {focus && (
              <circle cx={x} cy={y} r="26" fill="none" stroke={race.glow} strokeWidth="1" strokeDasharray="2 3"/>
            )}
          </g>
        );
      })}

      {/* central altar */}
      <g style={{ color: c }} className="nd-sigil">
        <rect x={cx-12} y={cy-14} width="24" height="28" fill="rgba(40,4,12,0.9)" stroke={c} strokeWidth="1.4"/>
        <path d={`M ${cx-8} ${cy-2} L ${cx} ${cy-10} L ${cx+8} ${cy-2}`} fill="none" stroke={race.glow} strokeWidth="1.2"/>
        <circle cx={cx} cy={cy+4} r="2" fill={race.glow}/>
      </g>
    </svg>
  );
}

// ============================================================
// RaceBuildCatalog — entries differ by race metaphor
// items: race.buildings
// ============================================================
function RaceBuildCatalog({ race, columns = 2 }) {
  if (race.key === 'zerg')    return <CatalogZerg race={race}/>;
  if (race.key === 'otomat')  return <CatalogOtomat race={race}/>;
  if (race.key === 'canavar') return <CatalogCanavar race={race}/>;
  if (race.key === 'seytan')  return <CatalogSeytan race={race}/>;
  return <CatalogInsan race={race}/>;
}

function CatalogInsan({ race }) {
  // Classic blueprint cards
  const items = race.buildings.map((b, i) => ({
    n: b.n, t: b.t, locked: b.locked,
    cost: ['—','1,200·280','2,400·480','3,800·1,200','5,600·2,400','4,200·1,800'][i],
  }));
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      {items.map((b, i) => (
        <div key={i} style={{ padding:8,
          background: ND.surface, border: `1px solid ${b.locked ? ND.border : `${race.primary}44`}`,
          opacity: b.locked ? 0.55 : 1,
          clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)',
        }}>
          <div style={{ height: 64, position:'relative',
            background: `linear-gradient(180deg, ${race.primary}11, transparent)`,
            border: `1px dashed ${race.primary}44`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily: ND.mono, fontSize: 9, color: race.primary, letterSpacing: '0.10em',
          }}>
            {/* iso silhouette */}
            <svg width="48" height="40" viewBox="0 0 48 40">
              <path d="M 4 28 L 24 14 L 44 28 L 24 36 Z" fill="rgba(40,52,76,0.85)" stroke={race.primary} strokeWidth="0.8"/>
              <path d="M 4 28 L 4 32 L 24 40 L 24 36 Z" fill="#0C1224" stroke={`${race.primary}aa`} strokeWidth="0.5"/>
              <path d="M 44 28 L 44 32 L 24 40 L 24 36 Z" fill="#070B17" stroke={`${race.primary}88`} strokeWidth="0.5"/>
            </svg>
          </div>
          <div style={{ marginTop:6, display:'flex', justifyContent:'space-between' }}>
            <H3 style={{ color: ND.text, fontSize:10 }}>{b.n}</H3>
            {b.locked && <Chip>KİLİT</Chip>}
          </div>
          <Caption style={{ fontSize:10, marginTop:2 }}>{b.t}</Caption>
          <div style={{ marginTop:6, fontFamily: ND.mono, fontSize:10, color: race.primary }}>{b.cost}</div>
        </div>
      ))}
    </div>
  );
}

function CatalogZerg({ race }) {
  // GENOM AĞACI — a DNA tree of organs
  // Each "building" is a node on a branching tree, linked with veins
  const c = race.primary, g = race.glow;
  const nodes = race.buildings.map((b, i) => ({
    n: b.n, t: b.t, locked: b.locked,
    x: [80, 200, 320, 60, 200, 340][i] || 200,
    y: [40, 30, 50, 130, 130, 130][i] || 100,
  }));
  return (
    <div style={{ background: 'rgba(20,4,28,0.55)', border:`1px solid ${c}44`,
      borderRadius:'12px 4px 12px 4px', padding: 10, position:'relative' }}>
      <svg width="100%" height="200" viewBox="0 0 400 200" style={{ display:'block' }}>
        <defs>
          <radialGradient id="zg-cell">
            <stop offset="0%" stopColor={g} stopOpacity="0.9"/>
            <stop offset="55%" stopColor={c} stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#1a0420" stopOpacity="0.85"/>
          </radialGradient>
        </defs>
        {/* veins root → branches */}
        <g stroke={c} fill="none" strokeWidth="2" opacity="0.55">
          <path d="M 200 180 Q 200 140, 200 100"/>
          <path d="M 200 100 Q 140 80, 80 50"/>
          <path d="M 200 100 Q 260 80, 320 60"/>
          <path d="M 200 100 Q 200 120, 200 140"/>
          <path d="M 200 140 Q 130 140, 70 140"/>
          <path d="M 200 140 Q 270 140, 340 140"/>
        </g>
        <g stroke={g} fill="none" strokeWidth="1" opacity="0.6">
          <path d="M 200 180 L 200 100"/>
        </g>

        {nodes.map((nd, i) => (
          <g key={i} opacity={nd.locked ? 0.4 : 1}>
            {/* organ blob */}
            <ellipse cx={nd.x} cy={nd.y} rx="22" ry="18" fill="url(#zg-cell)"
              stroke={c} strokeWidth="1.2"
              style={{ filter: !nd.locked ? `drop-shadow(0 0 6px ${g}66)` : 'none' }}/>
            {/* embryo dot */}
            <circle cx={nd.x} cy={nd.y} r="3" fill={g}/>
            {/* label */}
            <text x={nd.x} y={nd.y + 32} textAnchor="middle"
              fontFamily="Chakra Petch" fontSize="7" fill={c} letterSpacing="0.9">{nd.n.toUpperCase()}</text>
            {nd.locked && <text x={nd.x} y={nd.y + 4} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={c}>×</text>}
          </g>
        ))}
        {/* root mark */}
        <text x="200" y="195" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6"
          fill={`${c}99`} letterSpacing="1.5">KOVAN GENOMU</text>
      </svg>
    </div>
  );
}

function CatalogOtomat({ race }) {
  // BLUEPRINT — modular schema with sockets, technical readout
  const c = race.primary;
  return (
    <div style={{ background: 'rgba(8,18,32,0.65)', border: `1px solid ${c}55`,
      padding: 0, position:'relative' }}>
      {/* corner crosshairs */}
      <svg width="100%" height="220" viewBox="0 0 400 220" style={{ display:'block' }}>
        {/* technical grid */}
        <defs>
          <pattern id="oto-cat-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0 H10 M0 0 V10" stroke={`${c}30`} strokeWidth="0.3"/>
          </pattern>
        </defs>
        <rect width="400" height="220" fill="url(#oto-cat-grid)"/>
        {/* central main module */}
        <rect x="160" y="80" width="80" height="60" fill="rgba(20,36,64,0.85)" stroke={c} strokeWidth="1.4"/>
        <text x="200" y="100" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={c} letterSpacing="1.5">SONSUZLUK ÇEKİRDEK</text>
        <text x="200" y="112" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={`${c}99`}>v9.0.3</text>
        <rect x="180" y="118" width="40" height="14" fill={c} opacity="0.25"/>
        {/* sockets */}
        {race.buildings.slice(1).map((b, i) => {
          const cols = [
            { x: 30,  y: 30  },
            { x: 280, y: 30  },
            { x: 30,  y: 160 },
            { x: 280, y: 160 },
            { x: 160, y: 175 },
          ][i];
          if (!cols) return null;
          const locked = b.locked;
          return (
            <g key={i} opacity={locked ? 0.45 : 1}>
              <rect x={cols.x} y={cols.y} width="90" height="34" fill="rgba(8,18,32,0.85)" stroke={c} strokeWidth="1"/>
              <rect x={cols.x+3} y={cols.y+3} width="84" height="28" fill="none" stroke={`${c}44`} strokeWidth="0.4"/>
              <text x={cols.x+8} y={cols.y+14} fontFamily="JetBrains Mono" fontSize="6.5" fill={c} letterSpacing="1.2">{b.n.toUpperCase()}</text>
              <text x={cols.x+8} y={cols.y+24} fontFamily="JetBrains Mono" fontSize="5.5" fill={`${c}99`}>{b.t}</text>
              <text x={cols.x+86} y={cols.y+14} textAnchor="end" fontFamily="JetBrains Mono" fontSize="5.5" fill={race.glow}>{locked ? 'LOCK' : `v${i+1}.0`}</text>
              {/* trace from module to core */}
              <path d={`M ${cols.x + (cols.x < 200 ? 90 : 0)} ${cols.y + 17} L ${cols.x < 200 ? 160 : 240} ${cols.y + 17 < 90 ? 90 : 130}`}
                stroke={`${c}66`} strokeWidth="0.8" fill="none"/>
            </g>
          );
        })}
        {/* registers / crosshair markers */}
        <g stroke={`${c}88`} strokeWidth="0.6" fill="none">
          <path d="M 4 4 H 14 M 4 4 V 14"/>
          <path d="M 396 4 H 386 M 396 4 V 14"/>
          <path d="M 4 216 H 14 M 4 216 V 206"/>
          <path d="M 396 216 H 386 M 396 216 V 206"/>
        </g>
        <text x="200" y="14" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={`${c}aa`} letterSpacing="2">MODÜL ŞEMASI · NODE-04 · 1:128</text>
      </svg>
    </div>
  );
}

function CatalogCanavar({ race }) {
  // BEDEN AĞACI — body-part upgrade tree (pençe / kanat / diş / pelt / kemik)
  const c = race.primary;
  // Body parts: pençe (claws), diş (fangs), kanat (wings), pelt (deri), kemik (bones), kalp (heart)
  const parts = [
    { id:'pence', label:'PENÇE',  x: 60,  y: 130, locked: false, lv: 'III' },
    { id:'dis',   label:'DİŞ',    x: 195, y: 50,  locked: false, lv: 'II' },
    { id:'kanat', label:'KANAT',  x: 330, y: 130, locked: false, lv: 'I' },
    { id:'pelt',  label:'PELT',   x: 60,  y: 230, locked: false, lv: 'I' },
    { id:'kemik', label:'KEMİK',  x: 330, y: 230, locked: true,  lv: '—' },
    { id:'kalp',  label:'KALP',   x: 195, y: 195, locked: true,  lv: '—' },
  ];
  // simple beast silhouette in center
  return (
    <div style={{ background: 'rgba(28,12,4,0.5)', border: `1px solid ${c}66`,
      borderRadius: '4px 14px 4px 14px', padding: 8 }}>
      <svg width="100%" height="290" viewBox="0 0 390 290" style={{ display:'block' }}>
        {/* beast silhouette (mythic quadruped) */}
        <g stroke={c} strokeWidth="1.2" fill="none" opacity="0.7">
          <path d="M 140 195 Q 130 175, 145 165 Q 165 155, 195 158 Q 220 162, 235 175 Q 250 188, 248 200 Q 245 210, 235 215 L 230 230 L 225 245 M 235 215 L 245 230 L 250 245 M 145 195 L 140 230 L 138 245 M 150 200 L 155 230 L 160 245"/>
          <path d="M 235 175 Q 250 170, 258 178 Q 265 185, 260 195"/>
          <circle cx="251" cy="180" r="1.5" fill={c}/>
        </g>
        {/* connecting lines from parts to beast */}
        <g stroke={`${c}66`} strokeWidth="0.7" strokeDasharray="2 3" fill="none">
          {parts.map((p, i) => {
            const tx = [148, 250, 240, 145, 245, 195][i];
            const ty = [200, 175, 195, 215, 215, 200][i];
            return <path key={p.id} d={`M ${p.x} ${p.y} L ${tx} ${ty}`}/>;
          })}
        </g>
        {/* body parts nodes */}
        {parts.map((p, i) => {
          const locked = p.locked;
          return (
            <g key={p.id} opacity={locked ? 0.45 : 1}>
              {/* claw/fang/wing icon */}
              <circle cx={p.x} cy={p.y} r="22" fill="rgba(28,12,4,0.85)" stroke={c} strokeWidth="1.2"/>
              <g transform={`translate(${p.x-12} ${p.y-12})`}>
                {p.id === 'pence' && <path d="M3 21 Q 5 6, 9 21 M 10 21 Q 12 4, 16 21 M 17 21 Q 19 6, 22 21" stroke={c} strokeWidth="1.4" fill="none"/>}
                {p.id === 'dis'   && <g><path d="M 5 4 L 9 19 L 8 4 Z" fill={c}/><path d="M 19 4 L 15 19 L 16 4 Z" fill={c}/></g>}
                {p.id === 'kanat' && <path d="M 3 18 Q 8 4, 22 4 Q 18 10, 22 12 Q 14 12, 10 18 Q 8 14, 3 18 Z" fill={`${c}55`} stroke={c} strokeWidth="1"/>}
                {p.id === 'pelt'  && <path d="M 3 6 Q 7 14, 3 22 M 9 6 Q 11 14, 9 22 M 15 6 Q 13 14, 15 22 M 21 6 Q 17 14, 21 22" stroke={c} strokeWidth="1.3" fill="none"/>}
                {p.id === 'kemik' && <g><rect x="3" y="11" width="18" height="3" fill={c}/><circle cx="4" cy="12" r="2.5" fill={c}/><circle cx="20" cy="12" r="2.5" fill={c}/></g>}
                {p.id === 'kalp'  && <path d="M 12 22 L 4 12 Q 0 6, 6 4 Q 10 4, 12 8 Q 14 4, 18 4 Q 24 6, 20 12 Z" fill={`${c}77`} stroke={c} strokeWidth="1"/>}
              </g>
              {/* level dots */}
              {!locked && (
                <g>
                  {[0,1,2].map(d => (
                    <circle key={d} cx={p.x - 8 + d*8} cy={p.y + 26} r="2.2"
                      fill={d < {'I':1,'II':2,'III':3}[p.lv] ? c : 'none'} stroke={c} strokeWidth="0.8"/>
                  ))}
                </g>
              )}
              {locked && <text x={p.x} y={p.y + 4} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="14" fill={c}>?</text>}
              {/* label */}
              <text x={p.x} y={p.y - 30} textAnchor="middle" fontFamily="Chakra Petch"
                fontSize="9" fontWeight="700" fill={c} letterSpacing="2">{p.label}</text>
              {!locked && <text x={p.x} y={p.y - 21} textAnchor="middle" fontFamily="JetBrains Mono"
                fontSize="6" fill={`${c}99`}>LV {p.lv}</text>}
            </g>
          );
        })}
        <text x="195" y="280" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6"
          fill={`${c}99`} letterSpacing="2">BEDEN AĞACI · ALPHA KHORVASH</text>
      </svg>
    </div>
  );
}

function CatalogSeytan({ race }) {
  // GRIMOIRE — book page with pact sigils
  const c = race.primary;
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(20,2,6,0.85), rgba(8,1,3,0.85))',
      border: `1px solid ${c}66`,
      padding: 14, position:'relative',
      boxShadow: `inset 0 0 28px ${c}33`,
    }}>
      {/* page corners */}
      <div style={{ position:'absolute', inset: 6, border: `1px solid ${c}33`, pointerEvents:'none' }}/>
      <div style={{ textAlign:'center', marginBottom: 8 }}>
        <div style={{ fontFamily: ND.display, fontSize: 11, color: c, letterSpacing: '0.4em' }}>· KARANLIK MAHKEME GRIMUVASI ·</div>
        <div style={{ fontFamily: ND.mono, fontSize: 8, color: `${c}99`, letterSpacing: '0.2em', marginTop: 2 }}>FOLIO IX / MMXXIV</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10 }}>
        {race.buildings.map((b, i) => {
          const locked = b.locked;
          return (
            <div key={i} style={{ textAlign:'center', opacity: locked ? 0.4 : 1,
              padding: 4 }}>
              <svg width="60" height="60" viewBox="0 0 60 60" style={{ display:'block', margin:'0 auto' }}>
                <circle cx="30" cy="30" r="26" fill="none" stroke={c} strokeWidth="0.8"/>
                <circle cx="30" cy="30" r="20" fill="none" stroke={c} strokeWidth="0.5"/>
                {i === 0 && <polygon points="30,8 52,46 8,46" fill={`${c}33`} stroke={c} strokeWidth="1.2"/>}
                {i === 1 && <polygon points="30,8 38,28 30,52 22,28" fill={`${c}33`} stroke={c} strokeWidth="1.2"/>}
                {i === 2 && <g><polygon points="30,8 50,30 30,52 10,30" fill={`${c}33`} stroke={c} strokeWidth="1.2"/><circle cx="30" cy="30" r="5" fill={c}/></g>}
                {i === 3 && <g><circle cx="30" cy="20" r="6" fill="none" stroke={c} strokeWidth="1"/><path d="M 30 26 V 50 M 18 36 H 42" stroke={c} strokeWidth="1"/></g>}
                {i === 4 && <g><polygon points="30,8 36,22 52,24 40,34 44,50 30,42 16,50 20,34 8,24 24,22" fill={`${c}33`} stroke={c} strokeWidth="1"/></g>}
                {i === 5 && <g><path d="M 14 14 L 46 46 M 46 14 L 14 46" stroke={c} strokeWidth="1.2"/><circle cx="30" cy="30" r="7" fill={`${c}55`}/></g>}
                {locked && <text x="30" y="32" textAnchor="middle" fontFamily="Chakra Petch" fontSize="22" fontWeight="700" fill={c}>×</text>}
              </svg>
              <div style={{ marginTop: 4, fontFamily: ND.display, fontSize: 9, letterSpacing:'0.10em', color: ND.text, textTransform:'uppercase' }}>{b.n}</div>
              <div style={{ marginTop: 1, fontFamily: ND.mono, fontSize: 7, letterSpacing:'0.10em', color: `${c}99` }}>{locked ? '[ MÜHÜRLÜ ]' : b.t}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, textAlign:'center', fontFamily: ND.mono, fontSize: 7, letterSpacing:'0.3em', color: `${c}77` }}>
        ✦ ◇ ✦
      </div>
    </div>
  );
}

// ============================================================
// RaceProductionFlow — production metaphor per race
// ============================================================
function RaceProductionFlow({ race, queue }) {
  if (race.key === 'zerg')    return <ProdZerg race={race} queue={queue}/>;
  if (race.key === 'otomat')  return <ProdOtomat race={race} queue={queue}/>;
  if (race.key === 'canavar') return <ProdCanavar race={race} queue={queue}/>;
  if (race.key === 'seytan')  return <ProdSeytan race={race} queue={queue}/>;
  return <ProdInsan race={race} queue={queue}/>;
}

function ProdInsan({ race, queue }) {
  const c = race.primary;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {queue.map((q, i) => (
        <Panel key={i} style={{ padding: 10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: `${c}22`, border:`1px solid ${c}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontFamily: ND.display, fontSize: 12, color: c }}>{i+1}</div>
              <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text, letterSpacing:'0.06em' }}>{q.n}</div>
            </div>
            <RaceTime race={race} pct={q.pct} eta={q.eta} state={i===0?'progress':'queue'}/>
          </div>
          <Bar value={q.pct} max={100} color={c} height={3}/>
        </Panel>
      ))}
    </div>
  );
}

function ProdZerg({ race, queue }) {
  // LARVA HAVUZU — a horizontal pool of slots, each holding an embryo in a morph stage
  const c = race.primary, g = race.glow;
  return (
    <div style={{
      background: 'rgba(20,4,28,0.7)', border: `1px solid ${c}55`,
      borderRadius: '14px 4px 14px 4px',
      padding: 12, position:'relative', overflow:'hidden',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
        <Eyebrow style={{ color: c }}>LARVA HAVUZU · 3 GEBE</Eyebrow>
        <Code style={{ color: c }}>SICAKLIK 37.4°</Code>
      </div>
      {/* pool */}
      <svg width="100%" height="120" viewBox="0 0 380 120">
        <defs>
          <radialGradient id="zr-pool" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={c} stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#1a0420" stopOpacity="0.95"/>
          </radialGradient>
          <radialGradient id="zr-egg">
            <stop offset="0%" stopColor={g} stopOpacity="0.95"/>
            <stop offset="60%" stopColor={c} stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#0c0210" stopOpacity="0.9"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="380" height="120" fill="url(#zr-pool)" rx="40" ry="40"/>
        {/* pool ripples */}
        <ellipse cx="190" cy="60" rx="160" ry="42" fill="none" stroke={c} strokeWidth="0.5" opacity="0.4"/>
        <ellipse cx="190" cy="60" rx="120" ry="32" fill="none" stroke={c} strokeWidth="0.4" opacity="0.3"/>
        {queue.map((q, i) => {
          const x = 60 + i * 110;
          const y = 60;
          // morph stage 1..4 based on pct
          const stage = Math.min(4, Math.max(1, Math.ceil(q.pct / 25)));
          return (
            <g key={i}>
              {/* embryo */}
              <ellipse cx={x} cy={y} rx={22 + stage * 2} ry={20 + stage * 2}
                fill="url(#zr-egg)" stroke={c} strokeWidth="1"
                style={{ filter: `drop-shadow(0 0 8px ${g}88)` }}/>
              {/* developing limbs */}
              {stage >= 2 && <g stroke={g} strokeWidth="1.4" fill="none" opacity="0.85"><path d={`M ${x-14} ${y+4} Q ${x-22} ${y+12}, ${x-26} ${y+18}`}/><path d={`M ${x+14} ${y+4} Q ${x+22} ${y+12}, ${x+26} ${y+18}`}/></g>}
              {stage >= 3 && <g stroke={g} strokeWidth="1.2" fill="none"><path d={`M ${x-8} ${y-16} L ${x-12} ${y-22}`}/><path d={`M ${x+8} ${y-16} L ${x+12} ${y-22}`}/></g>}
              {stage >= 4 && <g fill={g}><circle cx={x-5} cy={y-2} r="1.4"/><circle cx={x+5} cy={y-2} r="1.4"/></g>}
              {/* meta */}
              <text x={x} y={y + 38} textAnchor="middle" fontFamily="Chakra Petch" fontSize="8" fill={c} letterSpacing="1.5">{q.n.toUpperCase()}</text>
              <text x={x} y={y - 30} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={g}>EMBRİYO %{q.pct}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProdOtomat({ race, queue }) {
  // AKIŞ BANDI — assembly conveyor with parts traveling
  const c = race.primary, g = race.glow;
  return (
    <div style={{
      background: 'rgba(8,18,32,0.7)', border: `1px solid ${c}55`,
      padding: 10,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
        <Eyebrow style={{ color: c, fontFamily: ND.mono }}>AKIŞ BANDI · ::run</Eyebrow>
        <Code style={{ color: c, fontFamily: ND.mono }}>3 ACTIVE · CLK 60Hz</Code>
      </div>
      {queue.map((q, i) => {
        const cur = Math.round(360 * q.pct / 100);
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding: '8px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${c}22` }}>
            {/* job slot */}
            <div style={{ width: 38, fontFamily: ND.mono, fontSize: 11, color: c, letterSpacing: '0.04em' }}>
              ::{String(i).padStart(2,'0')}
            </div>
            {/* belt */}
            <div style={{ flex: 1, position: 'relative', height: 28 }}>
              {/* belt rails */}
              <div style={{ position:'absolute', top: 4, left: 0, right: 0, height: 1, background: `${c}44` }}/>
              <div style={{ position:'absolute', bottom: 4, left: 0, right: 0, height: 1, background: `${c}44` }}/>
              {/* tick marks */}
              <div style={{ position:'absolute', top: 6, left: 0, right: 0, bottom: 6,
                background: `repeating-linear-gradient(90deg, transparent 0, transparent 11px, ${c}33 11px, ${c}33 12px)` }}/>
              {/* progress packet */}
              <div style={{ position: 'absolute', top: 6, bottom: 6,
                left: 0, width: `${q.pct}%`,
                background: `linear-gradient(90deg, ${c}33, ${c}88)`,
                borderRight: `2px solid ${g}`,
                boxShadow: `0 0 8px ${g}99`,
              }}/>
              {/* assembling part icon */}
              <svg width="22" height="22" viewBox="0 0 22 22"
                style={{ position:'absolute', top: 3, left: `calc(${q.pct}% - 11px)` }}>
                <rect x="3" y="3" width="16" height="16" fill={c} stroke={g} strokeWidth="1"/>
                <rect x="7" y="7" width="8" height="8" fill="#0a0e1a"/>
              </svg>
            </div>
            {/* label / tick */}
            <div style={{ width: 110, fontFamily: ND.mono, fontSize: 9, color: ND.text, letterSpacing: '0.04em' }}>
              <div>{q.n.toUpperCase()}</div>
              <div style={{ color: c, fontSize: 9 }}>TICK {cur}/360</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProdCanavar({ race, queue }) {
  // AV ROTASI — a route map with prey markers; no queue countdown,
  // it's "av safhası" (hunt phase)
  const c = race.primary;
  return (
    <div style={{
      background: 'rgba(28,12,4,0.6)', border: `1px solid ${c}66`,
      borderRadius: '4px 14px 4px 14px',
      padding: 10, position:'relative',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
        <Eyebrow style={{ color: c }}>AV ROTASI · 3 PİSTE</Eyebrow>
        <Code style={{ color: c }}>RÜZGAR DOĞU · DOLUNAY</Code>
      </div>
      <svg width="100%" height="160" viewBox="0 0 380 160" style={{ display:'block' }}>
        {/* terrain */}
        <defs>
          <pattern id="cn-prod-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}55`} strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect x="0" y="0" width="380" height="160" fill="url(#cn-prod-hatch)" opacity="0.5"/>
        {/* alpha den (start) */}
        <g>
          <circle cx="40" cy="80" r="18" fill="rgba(40,20,10,0.85)" stroke={c} strokeWidth="1.4"/>
          <path d="M 30 80 L 40 70 L 50 80 Z" fill={c}/>
          <text x="40" y="110" textAnchor="middle" fontFamily="Chakra Petch" fontSize="7" fill={c} letterSpacing="1">ALFA İN</text>
        </g>
        {/* hunt routes */}
        {queue.map((q, i) => {
          const y = 30 + i * 40;
          const pct = q.pct;
          // path from alpha to prey
          const tx = 340;
          const ty = y;
          return (
            <g key={i}>
              {/* trail */}
              <path d={`M 58 80 Q 200 ${(80 + ty)/2 + (i%2?-30:30)}, ${tx-22} ${ty}`}
                stroke={`${c}aa`} strokeWidth="1" fill="none" strokeDasharray="3 4"/>
              {/* hunter marker on path */}
              <g transform={`translate(${58 + (tx-22-58) * pct/100} ${80 + ((ty-80) * pct/100)})`}>
                <path d="M -5 0 Q -3 -6, 0 -8 Q 3 -6, 5 0 Q 3 5, 0 6 Q -3 5, -5 0 Z" fill={c} stroke={race.glow} strokeWidth="0.6"/>
                <circle cx="0" cy="-2" r="0.8" fill="#fff"/>
              </g>
              {/* prey */}
              <g>
                <circle cx={tx} cy={ty} r="10" fill="rgba(40,20,10,0.85)" stroke={c} strokeWidth="1"/>
                {/* fang glyph */}
                <path d={`M ${tx-3} ${ty-3} L ${tx-2} ${ty+3} L ${tx-1} ${ty-2}`} stroke={c} strokeWidth="0.8" fill="none"/>
                <path d={`M ${tx+1} ${ty-3} L ${tx+2} ${ty+3} L ${tx+3} ${ty-2}`} stroke={c} strokeWidth="0.8" fill="none"/>
              </g>
              <text x={tx} y={ty + 22} textAnchor="middle" fontFamily="Chakra Petch" fontSize="7" fill={c} letterSpacing="1">{q.n.toUpperCase()}</text>
              {/* phase indicator */}
              <text x={195} y={y - 4} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={race.glow}>
                {['◐ AV 1/4','◑ AV 2/4','◒ AV 3/4','◓ AV 4/4'][Math.min(3, Math.max(0, Math.ceil(pct/25)-1))]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProdSeytan({ race, queue }) {
  // ÇAĞIRMA RİTÜELİ — 3 ritual circles with sigils + candles
  const c = race.primary, g = race.glow;
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(20,2,6,0.8), rgba(8,1,3,0.85))',
      border: `1px solid ${c}66`,
      padding: 10, position:'relative',
      boxShadow: `inset 0 0 24px ${c}33`,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
        <Eyebrow style={{ color: c }}>· RİTÜEL ODALARI ·</Eyebrow>
        <Code style={{ color: c, fontFamily: ND.display, letterSpacing:'0.3em' }}>III SİGİL</Code>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {queue.map((q, i) => {
          const total = 7;
          const sealed = Math.round(total * q.pct / 100);
          return (
            <div key={i} style={{ textAlign:'center', padding: 6,
              background:'rgba(0,0,0,0.35)', border:`1px solid ${c}44` }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ display:'block', margin:'0 auto' }}>
                {/* outer + inner */}
                <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="0.6"/>
                <circle cx="50" cy="50" r="34" fill="none" stroke={c} strokeWidth="0.4"/>
                {/* pentagram */}
                {(() => {
                  const pts = Array.from({length:5}, (_, k) => {
                    const a = (k / 5) * Math.PI * 2 - Math.PI/2;
                    return [50 + Math.cos(a)*30, 50 + Math.sin(a)*30];
                  });
                  const order = [0,2,4,1,3,0];
                  const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
                  return <path d={d} stroke={c} strokeWidth="1" fill="none"/>;
                })()}
                {/* sealed marks around */}
                {Array.from({length:total}).map((_,k)=>{
                  const a = (k / total) * Math.PI * 2 - Math.PI/2;
                  const x = 50 + Math.cos(a)*42;
                  const y = 50 + Math.sin(a)*42;
                  const on = k < sealed;
                  return <circle key={k} cx={x} cy={y} r="2.2"
                    fill={on ? g : 'none'} stroke={c} strokeWidth="0.6"
                    style={{ filter: on ? `drop-shadow(0 0 3px ${g})` : 'none' }}/>;
                })}
                {/* center flame */}
                <path d="M 50 36 Q 44 46, 46 54 Q 48 58, 50 60 Q 52 58, 54 54 Q 56 46, 50 36 Z" fill={`${g}66`} stroke={g} strokeWidth="0.8"/>
              </svg>
              <div style={{ marginTop: 4, fontFamily: ND.display, fontSize: 9, letterSpacing:'0.12em', color: ND.text, textTransform:'uppercase' }}>{q.n}</div>
              <div style={{ marginTop: 2, fontFamily: ND.mono, fontSize: 8, color: g, letterSpacing:'0.10em' }}>
                {sealed}/{total} MÜHÜR
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// RaceMergeRitual — merge metaphor per race
// ============================================================
function RaceMergeRitual({ race }) {
  if (race.key === 'zerg')    return <MergeZerg race={race}/>;
  if (race.key === 'otomat')  return <MergeOtomat race={race}/>;
  if (race.key === 'canavar') return <MergeCanavar race={race}/>;
  if (race.key === 'seytan')  return <MergeSeytan race={race}/>;
  return <MergeInsan race={race}/>;
}

function MergeInsan({ race }) {
  // Promotion ceremony — 3 ranked units → 1 captain
  const c = race.primary;
  return (
    <Panel race={race} glow style={{ padding: 14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-around' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            width: 56, height: 64, position:'relative',
            border: `1px solid ${c}88`,
            background: i < 3 ? `${c}22` : 'transparent',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          }}>
            {i < 3 ? (<>
              <RaceTierBadge race={race} tier={3} size={20}/>
              <Code style={{ color: c, fontSize: 8 }}>RANK A</Code>
            </>) : (
              <div style={{ fontFamily: ND.mono, fontSize: 22, color: `${c}55` }}>＋</div>
            )}
          </div>
        ))}
        <div style={{ fontFamily: ND.display, color: c, fontSize: 22 }}>→</div>
        <div style={{
          width: 72, height: 80,
          border: `1px solid ${c}`,
          background: `radial-gradient(circle, ${c}44, transparent 70%)`,
          boxShadow: `0 0 18px ${race.glow}88`,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 4,
          clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        }}>
          <RaceTierBadge race={race} tier={4} size={22}/>
          <Code style={{ color: c, fontSize: 8 }}>KAPTAN</Code>
        </div>
      </div>
    </Panel>
  );
}

function MergeZerg({ race }) {
  // EVRİM ÇUKURU — 3 larvae dissolve into a morph vat → emerge as higher form
  const c = race.primary, g = race.glow;
  return (
    <div style={{ position:'relative',
      background: 'radial-gradient(ellipse at center, rgba(60,8,80,0.6), rgba(12,2,18,0.85))',
      border: `1px solid ${c}66`,
      borderRadius: '24px 6px 24px 6px',
      padding: 12,
      boxShadow: `inset 0 0 24px ${c}33, 0 0 24px ${g}33`,
    }}>
      <svg width="100%" height="120" viewBox="0 0 380 120">
        <defs>
          <radialGradient id="mz-vat">
            <stop offset="0%" stopColor={g} stopOpacity="0.85"/>
            <stop offset="60%" stopColor={c} stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#1a0420" stopOpacity="0.95"/>
          </radialGradient>
        </defs>
        {/* small larvae being fed */}
        {[0,1,2].map(i => {
          const x = 50 + i * 50;
          return (
            <g key={i}>
              <ellipse cx={x} cy="60" rx="14" ry="12" fill={`${c}aa`} stroke={c} strokeWidth="1"/>
              <circle cx={x} cy="60" r="3" fill={g}/>
              {/* gooey tendril toward vat */}
              <path d={`M ${x+12} 60 Q ${190} ${60 + (i%2?-15:15)}, 230 60`} stroke={g} strokeWidth="1.5" fill="none" opacity="0.6" strokeDasharray="3 3"/>
            </g>
          );
        })}
        {/* vat */}
        <ellipse cx="280" cy="60" rx="68" ry="46" fill="url(#mz-vat)" stroke={c} strokeWidth="1.4"
          style={{ filter: `drop-shadow(0 0 14px ${g}99)` }}/>
        {/* bubbles inside */}
        {[[266,52,3],[290,68,2.5],[298,46,2],[270,72,2.2]].map(([x,y,r],i)=>(
          <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={g} strokeWidth="0.8" opacity="0.7"/>
        ))}
        {/* emerging form */}
        <g transform="translate(280 56)">
          <path d="M -18 18 Q -22 0, -10 -10 Q 0 -16, 10 -10 Q 22 0, 18 18 Z" fill={g} stroke="#fff" strokeWidth="0.6" opacity="0.95"/>
          <circle cx="-5" cy="0" r="1.6" fill="#fff"/>
          <circle cx="5" cy="0" r="1.6" fill="#fff"/>
        </g>
        <text x="280" y="115" textAnchor="middle" fontFamily="Chakra Petch" fontSize="9" fill={g} letterSpacing="2">YENİ EVRİM</text>
      </svg>
      <div style={{ marginTop: 4, textAlign:'center', fontFamily: ND.mono, fontSize: 9, color: c, letterSpacing:'0.18em' }}>
        EVRİM AŞ. III → AŞ. IV · MUTASYON STABİL
      </div>
    </div>
  );
}

function MergeOtomat({ race }) {
  // KOMPONENT BİRLEŞTİRME — 3 modules snap into an assembled product
  const c = race.primary, g = race.glow;
  return (
    <div style={{ background: 'rgba(8,18,32,0.7)', border: `1px solid ${c}55`, padding: 12 }}>
      <svg width="100%" height="120" viewBox="0 0 380 120">
        <defs>
          <pattern id="mo-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0 H10 M0 0 V10" stroke={`${c}33`} strokeWidth="0.3"/>
          </pattern>
        </defs>
        <rect width="380" height="120" fill="url(#mo-grid)"/>
        {/* 3 source modules */}
        {[0,1,2].map(i => {
          const x = 30 + i * 60;
          return (
            <g key={i}>
              <rect x={x} y="40" width="40" height="40" fill="rgba(20,36,64,0.85)" stroke={c} strokeWidth="1"/>
              <rect x={x+5} y="45" width="30" height="30" fill="none" stroke={`${c}55`} strokeWidth="0.4"/>
              <text x={x+20} y="63" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={c}>MOD</text>
              <text x={x+20} y="72" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5" fill={`${c}aa`}>v{i+1}.0</text>
              {/* connecting trace to junction */}
              <path d={`M ${x+40} 60 L ${220 - i*4} ${60}`} stroke={`${c}88`} strokeWidth="0.8" fill="none"/>
            </g>
          );
        })}
        {/* arrow */}
        <text x="232" y="64" fontFamily="JetBrains Mono" fontSize="14" fill={c}>::</text>
        {/* assembled product */}
        <g>
          <rect x="270" y="32" width="80" height="60" fill="rgba(20,36,64,0.9)" stroke={c} strokeWidth="1.4"
            style={{ filter: `drop-shadow(0 0 8px ${g}aa)` }}/>
          <rect x="278" y="40" width="64" height="44" fill="none" stroke={`${c}66`} strokeWidth="0.5"/>
          <rect x="290" y="50" width="40" height="24" fill={c} opacity="0.3"/>
          <text x="310" y="64" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={c} letterSpacing="1.5">BUILD-A</text>
          <text x="310" y="74" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={g}>v4.0-rc</text>
          {/* led */}
          <circle cx="344" cy="36" r="2" fill={g}/>
        </g>
      </svg>
      <div style={{ marginTop: 4, textAlign:'center', fontFamily: ND.mono, fontSize: 9, color: c, letterSpacing:'0.16em' }}>
        ::merge(mod[3]) → unit[v4.0] · OK
      </div>
    </div>
  );
}

function MergeCanavar({ race }) {
  // YAMYAMLIK — 3 smaller beasts feed the alpha → alpha grows
  const c = race.primary, g = race.glow;
  return (
    <div style={{ background: 'rgba(28,12,4,0.6)', border: `1px solid ${c}66`,
      borderRadius: '6px 18px 6px 18px', padding: 12 }}>
      <svg width="100%" height="130" viewBox="0 0 380 130">
        {/* parchment terrain */}
        <defs>
          <pattern id="mc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}55`} strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect width="380" height="130" fill="url(#mc-hatch)" opacity="0.35"/>
        {/* small beasts approaching */}
        {[[40, 50],[40, 75],[40, 100]].map(([x,y],i)=>(
          <g key={i}>
            <path d={`M ${x-6} ${y} Q ${x} ${y-5}, ${x+6} ${y} Q ${x+3} ${y+4}, ${x-6} ${y} Z`} fill={c}/>
            <path d={`M ${x+6} ${y} Q ${x+10} ${y-2}, ${x+12} ${y+1}`} stroke={c} strokeWidth="1" fill="none"/>
            {/* trail */}
            <path d={`M ${x+12} ${y} Q ${100 + i*8} ${y + (1-i)*5}, ${180} 70`} stroke={c} strokeWidth="0.6" fill="none" strokeDasharray="2 3" opacity="0.6"/>
          </g>
        ))}
        {/* blood splatter trail */}
        {[[150, 60],[170, 80],[190, 65]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="2" fill={c} opacity="0.55"/>
        ))}
        {/* alpha — larger silhouette */}
        <g transform="translate(280 70)">
          <path d="M -40 0 Q -36 -22, -18 -28 Q 0 -32, 22 -28 Q 40 -22, 44 0 Q 40 14, 30 18 L 26 30 L 22 38 M 30 18 L 36 32 L 40 40 M -40 0 L -42 26 L -42 38 M -34 8 L -32 26 L -30 38"
            fill="rgba(40,20,10,0.9)" stroke={c} strokeWidth="1.4"
            style={{ filter: `drop-shadow(0 0 8px ${g}99)` }}/>
          {/* glowing eyes */}
          <circle cx="-10" cy="-12" r="2.2" fill={g}/>
          <circle cx="10" cy="-12" r="2.2" fill={g}/>
          {/* jaw fang */}
          <path d="M -2 -2 L 0 6 L 2 -2" fill={c}/>
        </g>
        <text x="280" y="125" textAnchor="middle" fontFamily="Chakra Petch" fontSize="9" fill={c} letterSpacing="2">ALFA YÜKSELDİ</text>
      </svg>
      <div style={{ marginTop: 4, textAlign:'center', fontFamily: ND.mono, fontSize: 9, color: c, letterSpacing:'0.16em' }}>
        ✦ 3 KAN → 1 PRIMORDIAL · BEDEN +1 PENÇE
      </div>
    </div>
  );
}

function MergeSeytan({ race }) {
  // RUH FÜZYONU — 3 souls bound into a single sigil mark
  const c = race.primary, g = race.glow;
  return (
    <div style={{
      background: 'radial-gradient(circle, rgba(60,4,14,0.7), rgba(8,1,3,0.85))',
      border: `1px solid ${c}66`,
      padding: 12, position:'relative',
      boxShadow: `inset 0 0 28px ${c}44, 0 0 18px ${g}44`,
    }}>
      <svg width="100%" height="160" viewBox="0 0 380 160">
        {/* 3 source soul orbs */}
        {[0,1,2].map(i => {
          const x = 60;
          const y = 40 + i * 40;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="14" fill={`${c}33`} stroke={c} strokeWidth="1"/>
              <circle cx={x} cy={y} r="6" fill={g} opacity="0.85"/>
              {/* soul tail / wisp */}
              <path d={`M ${x+14} ${y} Q 130 ${(y+80)/2}, 180 80`} stroke={g} strokeWidth="1" fill="none" strokeDasharray="3 4" opacity="0.75"/>
            </g>
          );
        })}
        {/* central sigil being inscribed */}
        <g transform="translate(280 80)">
          <circle cx="0" cy="0" r="46" fill="none" stroke={c} strokeWidth="1"/>
          <circle cx="0" cy="0" r="36" fill="none" stroke={c} strokeWidth="0.6"/>
          {(() => {
            const pts = Array.from({length:5}, (_, k) => {
              const a = (k / 5) * Math.PI * 2 - Math.PI/2;
              return [Math.cos(a)*30, Math.sin(a)*30];
            });
            const order = [0,2,4,1,3,0];
            const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
            return <path d={d} stroke={g} strokeWidth="1.6" fill="none" style={{ filter: `drop-shadow(0 0 5px ${g})` }}/>;
          })()}
          {/* central seal flame */}
          <path d="M 0 -14 Q -7 -2, -3 8 Q 0 14, 0 14 Q 3 14, 7 8 Q 11 -2, 0 -14 Z" fill={`${g}88`} stroke={g} strokeWidth="0.8"/>
          {/* runes */}
          {Array.from({length:8}).map((_,k)=>{
            const a = (k/8)*Math.PI*2;
            const x = Math.cos(a)*40;
            const y = Math.sin(a)*40;
            return <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontFamily="JetBrains Mono" fontSize="7" fill={c}>✦</text>;
          })}
        </g>
      </svg>
      <div style={{ marginTop: 4, textAlign:'center', fontFamily: ND.mono, fontSize: 9, color: c, letterSpacing:'0.20em' }}>
        ⊕ III RUH MÜHÜRLENDİ · YENİ PAKT DOĞDU
      </div>
    </div>
  );
}

// ============================================================
// RaceRosterGrid — unit envantery — tier rozeti farklı
// ============================================================
function RaceRosterGrid({ race }) {
  const u = race.units;
  // Each cell: a unit at a tier with count
  const cells = [
    { u: u[0], tier: 1, cnt: '×42' },
    { u: u[1], tier: 2, cnt: '×18' },
    { u: u[2], tier: 2, cnt: '×6'  },
    { u: u[3], tier: 3, cnt: '×4'  },
    { u: u[4] || u[3], tier: 4, cnt: '×2' },
    { u: u[5] || u[4], tier: 5, cnt: '×1' },
    { u: u[0], tier: 1, cnt: '×24' },
    { u: u[1], tier: 2, cnt: '×8'  },
    { u: u[3], tier: 3, cnt: '×3'  },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {cells.map((cl, i) => (
        <RaceUnitCard key={i} race={race} u={cl.u} tier={cl.tier} cnt={cl.cnt}/>
      ))}
      {[1,2,3].map(k => (
        <div key={`e${k}`} style={{
          aspectRatio: '1', border: `1px dashed ${ND.border}`,
          background: 'rgba(10,14,28,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily: ND.mono, fontSize: 10, color: ND.textMute, opacity: 0.55,
        }}>—</div>
      ))}
    </div>
  );
}

function RaceUnitCard({ race, u, tier, cnt }) {
  const c = race.primary;
  // Each race has unique card shape + tier rendering
  let cardStyle = {};
  if (race.key === 'insan')   cardStyle = { clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)' };
  if (race.key === 'zerg')    cardStyle = { borderRadius: '12px 3px 12px 3px' };
  if (race.key === 'otomat')  cardStyle = {};
  if (race.key === 'canavar') cardStyle = { borderRadius: '2px 12px 2px 12px' };
  if (race.key === 'seytan')  cardStyle = { clipPath: 'polygon(50% 0, 100% 20%, 100% 100%, 0 100%, 0 20%)' };

  return (
    <div style={{
      aspectRatio: '1', padding: 6,
      background: ND.surface, border: `1px solid ${c}44`,
      position:'relative', display:'flex', flexDirection:'column',
      ...cardStyle,
    }}>
      {/* tier badge in top-left */}
      <div style={{ position:'absolute', top: 4, left: 4 }}>
        <RaceTierBadge race={race} tier={tier} size={18}/>
      </div>
      {/* count top-right */}
      <div style={{ position:'absolute', top: 4, right: 5, fontFamily: ND.mono, fontSize: 10, color: c }}>{cnt}</div>
      {/* placeholder silhouette */}
      <div style={{ flex: 1, marginTop: 22, marginBottom: 4,
        background: `repeating-linear-gradient(135deg, ${c}0e 0 6px, transparent 6px 12px)`,
        border: `1px dashed ${c}44`, display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <UnitSilhouette race={race} tier={tier}/>
      </div>
      {/* label */}
      <Code style={{ color: ND.text, fontSize: 9, textAlign:'center' }}>{u.n}</Code>
    </div>
  );
}

function UnitSilhouette({ race, tier }) {
  const c = race.primary;
  const s = 28;
  // very small abstract glyph per race
  if (race.key === 'insan') {
    return <svg width={s} height={s} viewBox="0 0 28 28"><path d="M 14 4 L 18 9 L 18 17 L 22 23 L 6 23 L 10 17 L 10 9 Z" fill="none" stroke={c} strokeWidth="1.4"/></svg>;
  }
  if (race.key === 'zerg') {
    return <svg width={s} height={s} viewBox="0 0 28 28"><path d="M 14 4 Q 22 10, 20 18 Q 16 24, 14 24 Q 12 24, 8 18 Q 6 10, 14 4 Z" fill={`${c}55`} stroke={c} strokeWidth="1.2"/><circle cx="11" cy="12" r="1.4" fill={c}/><circle cx="17" cy="12" r="1.4" fill={c}/></svg>;
  }
  if (race.key === 'otomat') {
    return <svg width={s} height={s} viewBox="0 0 28 28"><rect x="6" y="6" width="16" height="16" fill="none" stroke={c} strokeWidth="1.2"/><rect x="10" y="10" width="8" height="8" fill={`${c}66`}/></svg>;
  }
  if (race.key === 'canavar') {
    return <svg width={s} height={s} viewBox="0 0 28 28"><path d="M 4 22 Q 8 8, 14 6 Q 20 8, 24 22" stroke={c} strokeWidth="1.4" fill="none"/><path d="M 10 12 L 12 18 M 16 18 L 18 12" stroke={c} strokeWidth="1.2"/></svg>;
  }
  if (race.key === 'seytan') {
    return <svg width={s} height={s} viewBox="0 0 28 28"><polygon points="14,4 24,22 4,22" fill="none" stroke={c} strokeWidth="1.4"/><circle cx="14" cy="16" r="3" fill={c}/></svg>;
  }
}

Object.assign(window, {
  RaceBaseField, RaceBuildCatalog, RaceProductionFlow, RaceMergeRitual, RaceRosterGrid, RaceUnitCard, UnitSilhouette,
});
