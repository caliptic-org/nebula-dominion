// Nebula Dominion — Race-specific cinema + strategy views
// RaceAwakeningArt, RaceGalaxyVision, RaceBattlefield, RaceTierUpMoment, RaceCommanderCard

// ============================================================
// RaceAwakeningArt — the "birth" cinematic per race
// Used in: ScrRaceConfirm (05), ScrStoryScene (17)
// ============================================================
function RaceAwakeningArt({ race, width = '100%', height = 220 }) {
  if (race.key === 'insan')   return <AwakeningInsan c={race.primary} g={race.glow} h={height}/>;
  if (race.key === 'zerg')    return <AwakeningZerg c={race.primary} g={race.glow} h={height}/>;
  if (race.key === 'otomat')  return <AwakeningOtomat c={race.primary} g={race.glow} h={height}/>;
  if (race.key === 'canavar') return <AwakeningCanavar c={race.primary} g={race.glow} h={height}/>;
  if (race.key === 'seytan')  return <AwakeningSeytan c={race.primary} g={race.glow} h={height}/>;
}

function AwakeningInsan({ c, g, h }) {
  return (
    <div style={{ position:'relative', width:'100%', height: h,
      background:'radial-gradient(ellipse at 50% 110%, oklch(0.30 0.10 30 / 0.4), #06080F)',
      overflow:'hidden', border: `1px solid ${c}44` }}>
      <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
        {/* burning earth in distance */}
        <defs>
          <radialGradient id="ins-fire" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffb060" stopOpacity="0.85"/>
            <stop offset="50%" stopColor="oklch(0.60 0.20 30)" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="ins-haze" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.20"/>
            <stop offset="100%" stopColor="#000" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* sky haze */}
        <rect width="360" height="120" fill="url(#ins-haze)"/>
        {/* stars */}
        {Array.from({length:25}).map((_,i)=>{
          const x = (i*37)%360, y = (i*23)%120;
          return <circle key={i} cx={x} cy={y} r="0.6" fill="#fff" opacity={0.4 + (i%4)*0.15}/>;
        })}
        {/* burning earth — small in upper-right */}
        <circle cx="290" cy="42" r="20" fill="url(#ins-fire)"/>
        <circle cx="290" cy="42" r="10" fill="oklch(0.45 0.20 30)" opacity="0.85"/>
        <path d="M 281 38 Q 286 42, 290 38 M 292 44 Q 295 48, 298 44" stroke="#ffe6c2" strokeWidth="0.5" opacity="0.8"/>
        {/* horizon ground */}
        <rect y="170" width="360" height="50" fill="oklch(0.18 0.04 30)"/>
        <path d="M 0 170 L 360 170" stroke={c} strokeWidth="0.8" opacity="0.5"/>
        {/* colony ship descending — center */}
        <g transform="translate(180 95)">
          {/* engine glow */}
          <ellipse cx="0" cy="60" rx="44" ry="14" fill={g} opacity="0.55"/>
          <ellipse cx="0" cy="60" rx="26" ry="8" fill="#fff" opacity="0.7"/>
          {/* ship body */}
          <path d="M -32 0 L 32 0 L 38 26 L 22 46 L -22 46 L -38 26 Z" fill="oklch(0.30 0.04 240)" stroke={c} strokeWidth="1.2"/>
          <path d="M -28 26 L 28 26" stroke={c} strokeWidth="0.6"/>
          {/* windows */}
          {[-22, -11, 0, 11, 22].map((x,i) => (<rect key={i} x={x-2} y="10" width="4" height="6" fill={g}/>))}
          {/* nose */}
          <path d="M -10 0 L 0 -16 L 10 0 Z" fill="oklch(0.42 0.06 240)" stroke={c} strokeWidth="0.8"/>
          {/* antenna */}
          <line x1="0" y1="-16" x2="0" y2="-30" stroke={c} strokeWidth="1"/>
          <circle cx="0" cy="-30" r="1.4" fill={g}/>
        </g>
        {/* searchlight beams down to ground */}
        <path d="M 170 145 L 140 200 L 220 200 L 190 145 Z" fill={g} opacity="0.18"/>
        {/* commander silhouette on ground */}
        <g transform="translate(180 195)" stroke={c} fill="oklch(0.18 0.04 30)" strokeWidth="0.8">
          <path d="M -4 -16 L -4 0 L -7 6 M 4 -16 L 4 0 L 7 6 M -4 -16 L 4 -16 L 4 -22 L 0 -26 L -4 -22 Z M -3 -20 L 3 -20"/>
        </g>
      </svg>
      {/* corner stamp */}
      <div style={{ position:'absolute', top: 8, left: 10, fontFamily:'JetBrains Mono', fontSize: 8, color: `${c}cc`, letterSpacing:'0.16em' }}>
        ::SCENE-01 / COLONY DESCENT
      </div>
    </div>
  );
}

function AwakeningZerg({ c, g, h }) {
  return (
    <div style={{ position:'relative', width:'100%', height: h,
      background:'radial-gradient(ellipse at center, oklch(0.18 0.16 340 / 0.7), #0a0212)',
      overflow:'hidden', border: `1px solid ${c}66` }}>
      <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="zr-egg-aw">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
            <stop offset="20%" stopColor={g} stopOpacity="0.9"/>
            <stop offset="60%" stopColor={c} stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#0c0210" stopOpacity="0"/>
          </radialGradient>
          <filter id="zr-glow"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        {/* cave veins on walls */}
        <g stroke={c} strokeWidth="1" fill="none" opacity="0.45">
          <path d="M -10 30 Q 60 60, 80 110 Q 70 160, 0 200"/>
          <path d="M 370 20 Q 280 50, 290 110 Q 300 170, 360 210"/>
          <path d="M 30 -10 Q 80 40, 60 100"/>
          <path d="M 330 -10 Q 280 50, 300 100"/>
        </g>
        <g stroke={g} strokeWidth="0.6" fill="none" opacity="0.6" filter="url(#zr-glow)">
          <path d="M 80 110 Q 130 130, 180 130 Q 230 130, 280 110"/>
        </g>
        {/* central egg with crack */}
        <g transform="translate(180 110)">
          {/* glow */}
          <ellipse cx="0" cy="0" rx="86" ry="92" fill={g} opacity="0.25"/>
          {/* egg body */}
          <ellipse cx="0" cy="6" rx="46" ry="62" fill="url(#zr-egg-aw)" stroke={c} strokeWidth="1.5"/>
          {/* crack lines */}
          <path d="M -16 -28 L -8 -10 L -12 6 L -4 22 L -10 40"
            stroke="#fff" strokeWidth="1.6" fill="none" opacity="0.95"
            style={{ filter:`drop-shadow(0 0 6px ${g})` }}/>
          <path d="M -8 -10 L 6 -6 M -4 22 L 10 18" stroke="#fff" strokeWidth="1.2" opacity="0.85"/>
          {/* claw poking out */}
          <path d="M -3 -8 L 0 -14 L 3 -8 L 6 -16 L 9 -10" stroke={g} strokeWidth="1.3" fill="none"/>
          {/* eye glowing inside */}
          <circle cx="0" cy="0" r="6" fill={g} opacity="0.95" style={{ filter:`drop-shadow(0 0 8px ${g})` }}/>
          <circle cx="0" cy="0" r="2.5" fill="#fff"/>
        </g>
        {/* small spores floating */}
        {[[60,40],[300,55],[40,170],[320,180],[120,30],[270,30]].map(([x,y],i)=>(
          <g key={i} opacity="0.7">
            <circle cx={x} cy={y} r="1.6" fill={g} style={{ filter:`drop-shadow(0 0 3px ${g})` }}/>
          </g>
        ))}
        {/* baby larvae circling */}
        <ellipse cx="120" cy="160" rx="6" ry="3" fill={c} stroke={g} strokeWidth="0.5"/>
        <ellipse cx="240" cy="170" rx="7" ry="3.5" fill={c} stroke={g} strokeWidth="0.5"/>
      </svg>
      <div style={{ position:'absolute', top: 8, left: 10, fontFamily:'JetBrains Mono', fontSize: 8, color: `${c}cc`, letterSpacing:'0.16em' }}>
        ::SCENE-01 / SHELL CRACKS
      </div>
    </div>
  );
}

function AwakeningOtomat({ c, g, h }) {
  return (
    <div style={{ position:'relative', width:'100%', height: h,
      background:'linear-gradient(180deg, oklch(0.08 0.04 220), #04060c)',
      overflow:'hidden', border: `1px solid ${c}66` }}>
      <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="oto-aw-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 0 H14 M0 0 V14" stroke={`${c}30`} strokeWidth="0.3"/>
          </pattern>
          <linearGradient id="oto-aw-floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0"/>
            <stop offset="100%" stopColor={c} stopOpacity="0.18"/>
          </linearGradient>
        </defs>
        {/* dust */}
        <rect width="360" height="220" fill="url(#oto-aw-grid)"/>
        {/* facility walls receding (perspective lines) */}
        <g stroke={c} strokeWidth="0.6" opacity="0.6" fill="none">
          <line x1="0"   y1="0"  x2="120" y2="100"/>
          <line x1="360" y1="0"  x2="240" y2="100"/>
          <line x1="0"   y1="220" x2="120" y2="120"/>
          <line x1="360" y1="220" x2="240" y2="120"/>
          <rect x="120" y="100" width="120" height="40" fill="#000" opacity="0.6"/>
        </g>
        {/* floor */}
        <rect y="110" width="360" height="110" fill="url(#oto-aw-floor)"/>
        {/* sleeping units along sides */}
        {[40,80,280,320].map((x,i) => (
          <g key={i} opacity="0.7">
            <rect x={x-12} y="135" width="24" height="40" fill="oklch(0.22 0.04 240)" stroke={`${c}66`} strokeWidth="0.6"/>
            <circle cx={x} cy="150" r="2" fill="#400" opacity="0.6"/>
          </g>
        ))}
        {/* central Demiurge booting */}
        <g transform="translate(180 130)">
          {/* core chassis */}
          <rect x="-30" y="-46" width="60" height="80" fill="oklch(0.24 0.04 240)" stroke={c} strokeWidth="1.2"/>
          <rect x="-24" y="-40" width="48" height="68" fill="none" stroke={`${c}55`} strokeWidth="0.5"/>
          {/* glowing eye */}
          <circle cx="0" cy="-20" r="6" fill={g} style={{ filter: `drop-shadow(0 0 8px ${g})` }}/>
          <circle cx="0" cy="-20" r="2" fill="#fff"/>
          {/* chest screen with boot text */}
          <rect x="-18" y="-6" width="36" height="20" fill="#0a0e1a" stroke={`${c}88`} strokeWidth="0.6"/>
          <text x="0" y="0" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5" fill={g}>BOOT::PRIME</text>
          <text x="0" y="6" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="5" fill={`${c}cc`}>v9.0.0-rc</text>
          <text x="0" y="12" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="4.5" fill={`${c}99`}>::OK</text>
          {/* arms */}
          <path d="M -30 -20 L -48 -8 L -50 6" stroke={c} strokeWidth="1.2" fill="none"/>
          <path d="M 30 -20 L 48 -8 L 50 6" stroke={c} strokeWidth="1.2" fill="none"/>
          {/* legs */}
          <line x1="-12" y1="34" x2="-14" y2="60" stroke={c} strokeWidth="1.4"/>
          <line x1="12"  y1="34" x2="14"  y2="60" stroke={c} strokeWidth="1.4"/>
          {/* halo glow */}
          <ellipse cx="0" cy="0" rx="60" ry="80" fill={c} opacity="0.10" style={{ filter:`blur(8px)` }}/>
        </g>
        {/* boot status lines on side */}
        <g fontFamily="JetBrains Mono" fontSize="6" fill={`${c}aa`}>
          <text x="8" y="22">[ok] ::power up</text>
          <text x="8" y="32">[ok] ::core::init</text>
          <text x="8" y="42">[ok] ::sensors</text>
          <text x="8" y="52">[ok] ::archive::load</text>
          <text x="8" y="62" fill={g}>[..] ::self::define</text>
        </g>
      </svg>
      <div style={{ position:'absolute', top: 8, right: 10, fontFamily:'JetBrains Mono', fontSize: 8, color: `${c}cc`, letterSpacing:'0.16em' }}>
        ::SCENE-01 / FIRST BOOT
      </div>
    </div>
  );
}

function AwakeningCanavar({ c, g, h }) {
  return (
    <div style={{ position:'relative', width:'100%', height: h,
      background:'radial-gradient(ellipse at 50% 70%, oklch(0.18 0.06 50 / 0.65), #0a0604)',
      overflow:'hidden', border: `1px solid ${c}66` }}>
      <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
        {/* forest silhouette (jagged) */}
        <g fill="oklch(0.10 0.04 50)" stroke={`${c}55`} strokeWidth="0.6">
          <path d="M 0 220 L 0 140 L 20 110 L 38 132 L 56 96 L 78 124 L 96 102 L 118 130 L 132 110 L 152 138 L 168 116 L 190 142 L 208 122 L 226 144 L 244 118 L 262 138 L 282 120 L 300 142 L 320 116 L 340 132 L 360 110 L 360 220 Z"/>
        </g>
        {/* moon */}
        <circle cx="290" cy="40" r="22" fill="oklch(0.85 0.04 60)" opacity="0.85"/>
        <circle cx="285" cy="36" r="3" fill="oklch(0.75 0.04 60)" opacity="0.85"/>
        {/* mist */}
        <g opacity="0.4">
          {[60, 120, 180, 240, 300].map((x,i) => (
            <ellipse key={i} cx={x} cy={180 + (i%2)*8} rx="44" ry="6" fill={`${c}66`}/>
          ))}
        </g>
        {/* bone scatter */}
        {[[80, 200],[260, 195],[160, 210],[300, 205]].map(([x,y],i)=>(
          <g key={i} stroke={`${c}99`} strokeWidth="1" fill="#d8c08a" opacity="0.7">
            <ellipse cx={x-3} cy={y} rx="2" ry="1"/>
            <ellipse cx={x+3} cy={y} rx="2" ry="1"/>
            <rect x={x-3} y={y-0.8} width="6" height="1.4"/>
          </g>
        ))}
        {/* beast in shadow */}
        <g transform="translate(180 135)">
          {/* body silhouette */}
          <path d="M -50 50 Q -54 -10, -30 -28 Q 0 -38, 30 -28 Q 54 -10, 50 50 Q 44 60, 32 62 L 28 78 L 24 92 M 32 62 L 38 80 L 42 92 M -50 50 L -52 76 L -52 92 M -44 58 L -42 76 L -40 92"
            fill="#040201" stroke={c} strokeWidth="1.4"
            style={{ filter: `drop-shadow(0 0 8px ${g}77)` }}/>
          {/* glowing eyes — main thing */}
          <ellipse cx="-12" cy="-12" rx="4" ry="3" fill={g} style={{ filter: `drop-shadow(0 0 8px ${g})` }}/>
          <ellipse cx="12"  cy="-12" rx="4" ry="3" fill={g} style={{ filter: `drop-shadow(0 0 8px ${g})` }}/>
          <ellipse cx="-12" cy="-12" rx="1.6" ry="1.2" fill="#fff"/>
          <ellipse cx="12"  cy="-12" rx="1.6" ry="1.2" fill="#fff"/>
          {/* fangs */}
          <path d="M -8 6 L -6 14 L -4 6 M 4 6 L 6 14 L 8 6" fill="#fff" stroke={c} strokeWidth="0.4"/>
          {/* horns */}
          <path d="M -20 -28 Q -28 -38, -26 -48 M 20 -28 Q 28 -38, 26 -48" stroke={c} strokeWidth="2" fill="none"/>
          {/* claws on ground */}
          <path d="M -50 96 L -50 102 M -46 96 L -46 102 M -42 96 L -42 102" stroke={c} strokeWidth="0.8"/>
          <path d="M 50 96 L 50 102 M 46 96 L 46 102 M 42 96 L 42 102" stroke={c} strokeWidth="0.8"/>
        </g>
        {/* breath puff */}
        <ellipse cx="170" cy="148" rx="10" ry="3" fill="#fff" opacity="0.15"/>
        <ellipse cx="190" cy="148" rx="10" ry="3" fill="#fff" opacity="0.15"/>
      </svg>
      <div style={{ position:'absolute', top: 8, left: 10, fontFamily:'JetBrains Mono', fontSize: 8, color: `${c}cc`, letterSpacing:'0.16em' }}>
        ::SCENE-01 / FIRST HUNT
      </div>
    </div>
  );
}

function AwakeningSeytan({ c, g, h }) {
  return (
    <div style={{ position:'relative', width:'100%', height: h,
      background:'radial-gradient(circle at center, oklch(0.16 0.18 15 / 0.7), #050103)',
      overflow:'hidden', border: `1px solid ${c}66` }}>
      <svg width="100%" height="100%" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="sy-aw-glow">
            <stop offset="0%" stopColor={g} stopOpacity="0.6"/>
            <stop offset="100%" stopColor={c} stopOpacity="0"/>
          </radialGradient>
        </defs>
        {/* ground sigil */}
        <g transform="translate(180 130)">
          <circle r="86" fill="url(#sy-aw-glow)"/>
          <circle r="78" fill="none" stroke={c} strokeWidth="1"/>
          <circle r="62" fill="none" stroke={c} strokeWidth="0.6"/>
          {/* pentagram */}
          {(() => {
            const pts = Array.from({length:5}, (_, i) => {
              const a = (i / 5) * Math.PI * 2 - Math.PI/2;
              return [Math.cos(a)*60, Math.sin(a)*60];
            });
            const order = [0,2,4,1,3,0];
            const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
            return <path d={d} stroke={g} strokeWidth="1.5" fill="none" style={{ filter:`drop-shadow(0 0 6px ${g})` }}/>;
          })()}
          {/* runes around */}
          {Array.from({length:8}).map((_,i)=>{
            const a = (i/8)*Math.PI*2;
            const x = Math.cos(a)*70;
            const y = Math.sin(a)*70;
            return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontFamily="JetBrains Mono" fontSize="10" fill={g}
              style={{ filter:`drop-shadow(0 0 3px ${g})` }}>✦</text>;
          })}
        </g>
        {/* candles at points */}
        {[0,1,2,3,4].map(i=>{
          const a = (i/5)*Math.PI*2 - Math.PI/2;
          const x = 180 + Math.cos(a)*100;
          const y = 130 + Math.sin(a)*100;
          return (
            <g key={i}>
              <rect x={x-1.5} y={y-2} width="3" height="18" fill={`${c}aa`}/>
              <path d={`M ${x} ${y-4} Q ${x-3} ${y-8}, ${x} ${y-12} Q ${x+3} ${y-8}, ${x} ${y-4} Z`} fill={g}/>
              <circle cx={x} cy={y-9} r="1.2" fill="#fff"/>
            </g>
          );
        })}
        {/* central figure: chained being breaking free */}
        <g transform="translate(180 110)">
          {/* body */}
          <path d="M -10 30 L -8 -10 L -14 -22 L -8 -30 L 8 -30 L 14 -22 L 8 -10 L 10 30 Z"
            fill="#0a0103" stroke={c} strokeWidth="1.4"
            style={{ filter: `drop-shadow(0 0 10px ${g}aa)` }}/>
          {/* head */}
          <ellipse cx="0" cy="-30" rx="9" ry="11" fill="#0a0103" stroke={c} strokeWidth="1.2"/>
          {/* glowing eyes */}
          <circle cx="-3" cy="-30" r="1.6" fill={g} style={{ filter:`drop-shadow(0 0 4px ${g})` }}/>
          <circle cx="3"  cy="-30" r="1.6" fill={g} style={{ filter:`drop-shadow(0 0 4px ${g})` }}/>
          {/* horns */}
          <path d="M -6 -40 Q -12 -50, -10 -56 M 6 -40 Q 12 -50, 10 -56" stroke={c} strokeWidth="2" fill="none"/>
          {/* wings — barely visible black */}
          <path d="M -10 -10 Q -38 -22, -54 -4 Q -42 4, -28 8 Q -16 4, -10 0" fill="#0a0103" stroke={c} strokeWidth="0.8" opacity="0.85"/>
          <path d="M 10 -10 Q 38 -22, 54 -4 Q 42 4, 28 8 Q 16 4, 10 0" fill="#0a0103" stroke={c} strokeWidth="0.8" opacity="0.85"/>
          {/* shattered chain links beside */}
          <g stroke={`${c}aa`} strokeWidth="1.2" fill="none">
            <circle cx="-26" cy="20" r="3"/>
            <circle cx="-30" cy="26" r="3"/>
            <circle cx="28" cy="22" r="3"/>
            <circle cx="34" cy="28" r="3"/>
          </g>
          {/* sigil mark on chest */}
          <circle cx="0" cy="0" r="4" fill={g} opacity="0.85" style={{ filter:`drop-shadow(0 0 5px ${g})` }}/>
        </g>
      </svg>
      <div style={{ position:'absolute', top: 8, left: 10, fontFamily:'Chakra Petch', fontSize: 9, color: `${c}cc`, letterSpacing:'0.20em' }}>
        · SCENE I · UNCHAINED ·
      </div>
    </div>
  );
}

// ============================================================
// RaceGalaxyVision — how the player sees the galaxy
// Used in: ScrGalaxyMap (11)
// ============================================================
function RaceGalaxyVision({ race, stars, selectedIdx = 2 }) {
  if (race.key === 'zerg')    return <GalaxyZerg race={race} stars={stars} selectedIdx={selectedIdx}/>;
  if (race.key === 'otomat')  return <GalaxyOtomat race={race} stars={stars} selectedIdx={selectedIdx}/>;
  if (race.key === 'canavar') return <GalaxyCanavar race={race} stars={stars} selectedIdx={selectedIdx}/>;
  if (race.key === 'seytan')  return <GalaxySeytan race={race} stars={stars} selectedIdx={selectedIdx}/>;
  return <GalaxyInsan race={race} stars={stars} selectedIdx={selectedIdx}/>;
}

function GalaxyInsan({ race, stars, selectedIdx }) {
  const c = race.primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 540" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="ga-ins-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={`${c}14`} strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="390" height="540" fill="url(#ga-ins-grid)"/>
      {/* tactical readouts */}
      <g fontFamily="JetBrains Mono" fontSize="6" fill={`${c}77`}>
        {[0,1,2,3,4,5,6,7].map(i => (<text key={i} x={4} y={20 + i*48}>{(i*0x80).toString(16).padStart(4,'0').toUpperCase()}</text>))}
      </g>
      {/* hyperspace lanes */}
      {stars.map((s,i) => i > 0 ? (
        <line key={i} x1={stars[Math.max(0,i-1)].x} y1={stars[Math.max(0,i-1)].y}
          x2={s.x} y2={s.y} stroke={`${c}33`} strokeWidth="0.8" strokeDasharray="2 3"/>
      ) : null)}
      {/* targeted reticle */}
      <g transform={`translate(${stars[selectedIdx].x} ${stars[selectedIdx].y})`} stroke={race.glow} strokeWidth="1.5" fill="none" style={{ color: race.glow }} className="nd-glow">
        <path d="M -14 0 L -6 0 M 14 0 L 6 0 M 0 -14 L 0 -6 M 0 14 L 0 6"/>
        <rect x="-18" y="-18" width="36" height="36"/>
      </g>
      {stars.map((s,i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r="3" fill={s.color}/>
          <text x={s.x} y={s.y - 10} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill={s.color}>{s.n}</text>
          <text x={s.x} y={s.y + 14} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={`${s.color}aa`}>{s.tier}</text>
        </g>
      ))}
    </svg>
  );
}

function GalaxyZerg({ race, stars, selectedIdx }) {
  const c = race.primary, g = race.glow;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 540" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="ga-zer-bg" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor={c} stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <filter id="ga-zer-blur"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <rect width="390" height="540" fill="url(#ga-zer-bg)"/>
      {/* mycelium / vein network */}
      <g stroke={c} fill="none" opacity="0.7">
        {stars.map((s,i) => {
          if (i === 0) return null;
          const a = stars[Math.max(0,i-1)];
          const mx = (a.x + s.x) / 2 + (i%2 ? 22 : -22);
          const my = (a.y + s.y) / 2 + (i%2 ? -18 : 18);
          return <path key={i} d={`M ${a.x} ${a.y} Q ${mx} ${my}, ${s.x} ${s.y}`} strokeWidth={s.own === race.key ? 2.6 : 1.2}/>;
        })}
      </g>
      <g stroke={g} fill="none" opacity="0.5" filter="url(#ga-zer-blur)">
        {stars.filter(s => s.own === race.key).slice(1).map((s,i) => {
          const a = stars[0];
          return <path key={i} d={`M ${a.x} ${a.y} L ${s.x} ${s.y}`} strokeWidth="2"/>;
        })}
      </g>
      {/* spore floaters */}
      {Array.from({length:18}).map((_,i)=>{
        const x = (i*37)%390, y = (i*73)%540;
        return <circle key={i} cx={x} cy={y} r="1.4" fill={g} opacity="0.6" className={`nd-spore nd-d${i%5}`}/>;
      })}
      {/* stars as organic chambers */}
      {stars.map((s,i) => {
        const focus = i === selectedIdx;
        const r = s.own === race.key ? 14 : 10;
        return (
          <g key={i}>
            <ellipse cx={s.x} cy={s.y} rx={r} ry={r-2} fill={s.color} opacity="0.85"
              stroke={focus ? g : `${s.color}`} strokeWidth={focus ? 2 : 1}
              style={{ filter: focus ? `drop-shadow(0 0 10px ${g})` : `drop-shadow(0 0 4px ${s.color}55)`, color: s.color }}
              className={focus ? 'nd-breath' : (s.own === race.key ? 'nd-pulse' : undefined)}/>
            <circle cx={s.x} cy={s.y} r="2.5" fill="#fff"/>
            <text x={s.x} y={s.y - r - 4} textAnchor="middle" fontFamily="Chakra Petch" fontSize="8" fill={s.color} letterSpacing="1">{s.n}</text>
            <text x={s.x} y={s.y + r + 10} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={`${s.color}aa`}>infest %{40 + (i*7)%55}</text>
          </g>
        );
      })}
    </svg>
  );
}

function GalaxyOtomat({ race, stars, selectedIdx }) {
  const c = race.primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 540" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="ga-oto-tiny" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 0 H10 M0 0 V10" stroke={`${c}26`} strokeWidth="0.3"/>
        </pattern>
        <pattern id="ga-oto-maj" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 0 H60 M0 0 V60" stroke={`${c}55`} strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect width="390" height="540" fill="rgba(8,18,32,0.7)"/>
      <rect width="390" height="540" fill="url(#ga-oto-tiny)"/>
      <rect width="390" height="540" fill="url(#ga-oto-maj)"/>
      {/* axis labels */}
      <g fontFamily="JetBrains Mono" fontSize="6" fill={`${c}77`}>
        {[0,1,2,3,4,5].map(i => (<text key={i} x={6 + i*60} y={14}>X{i.toString(16).toUpperCase()}</text>))}
        {[0,1,2,3,4,5,6,7].map(i => (<text key={i} x={2} y={28 + i*60}>Y{i.toString(16).toUpperCase()}</text>))}
      </g>
      {/* dependency arrows */}
      {stars.map((s,i) => i > 0 ? (
        <g key={i}>
          <line x1={stars[Math.max(0,i-1)].x} y1={stars[Math.max(0,i-1)].y}
            x2={s.x} y2={s.y} stroke={`${c}66`} strokeWidth="0.8"/>
          <circle cx={(stars[Math.max(0,i-1)].x + s.x)/2} cy={(stars[Math.max(0,i-1)].y + s.y)/2} r="1.4" fill={c}/>
        </g>
      ) : null)}
      {/* nodes as hexes */}
      {stars.map((s,i) => {
        const focus = i === selectedIdx;
        return (
          <g key={i}>
            <polygon
              points={`${s.x-8},${s.y-12} ${s.x+8},${s.y-12} ${s.x+14},${s.y} ${s.x+8},${s.y+12} ${s.x-8},${s.y+12} ${s.x-14},${s.y}`}
              fill={`${s.color}33`} stroke={focus ? race.glow : s.color} strokeWidth={focus ? 1.6 : 1}/>
            <text x={s.x} y={s.y + 3} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6.5" fill={s.color} fontWeight="700">{s.n.split('-')[1] || s.n.slice(0,3)}</text>
            <text x={s.x} y={s.y - 18} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={`${s.color}aa`}>v{i+1}.0</text>
            <text x={s.x} y={s.y + 22} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={`${s.color}88`}>{s.tier}</text>
          </g>
        );
      })}
      {/* selection brackets */}
      <g transform={`translate(${stars[selectedIdx].x} ${stars[selectedIdx].y})`} stroke={race.glow} strokeWidth="1.4" fill="none" style={{ color: race.glow }} className="nd-glow">
        <path d="M -22 -22 L -16 -22 M -22 -22 L -22 -16"/>
        <path d="M 22 -22 L 16 -22 M 22 -22 L 22 -16"/>
        <path d="M -22 22 L -16 22 M -22 22 L -22 16"/>
        <path d="M 22 22 L 16 22 M 22 22 L 22 16"/>
      </g>
    </svg>
  );
}

function GalaxyCanavar({ race, stars, selectedIdx }) {
  const c = race.primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 540" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="ga-cnv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}55`} strokeWidth="0.5"/>
        </pattern>
        <radialGradient id="ga-cnv-bg" cx="50%" cy="50%" r="90%">
          <stop offset="0%" stopColor={c} stopOpacity="0.10"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="390" height="540" fill="url(#ga-cnv-bg)"/>
      {/* topographic lines hand-drawn */}
      <g fill="none" stroke={`${c}66`} strokeWidth="0.6" opacity="0.5">
        <path d="M 30 100 Q 130 80, 200 110 Q 280 140, 360 100"/>
        <path d="M 0 200 Q 100 180, 180 210 Q 280 240, 390 200"/>
        <path d="M 20 320 Q 130 300, 220 330 Q 300 360, 390 330"/>
        <path d="M 0 440 Q 120 420, 220 450 Q 320 480, 390 450"/>
      </g>
      {/* mountains scattered */}
      {[[60,170],[280,150],[100,400],[300,420]].map(([x,y],i)=>(
        <g key={i} stroke={c} fill="none" strokeWidth="1" opacity="0.65">
          <path d={`M ${x-14} ${y} L ${x-2} ${y-12} L ${x+8} ${y} M ${x+4} ${y} L ${x+14} ${y-10} L ${x+24} ${y}`}/>
        </g>
      ))}
      {/* hunt trails between stars */}
      {stars.map((s,i) => i > 0 ? (
        <path key={i} d={`M ${stars[Math.max(0,i-1)].x} ${stars[Math.max(0,i-1)].y} Q ${(stars[Math.max(0,i-1)].x + s.x)/2 + (i%2?-20:20)} ${(stars[Math.max(0,i-1)].y + s.y)/2}, ${s.x} ${s.y}`}
          stroke={`${c}aa`} strokeWidth="0.8" fill="none" strokeDasharray="2 4"/>
      ) : null)}
      {/* nodes as territory rings with bone */}
      {stars.map((s,i) => {
        const focus = i === selectedIdx;
        const r = s.own === race.key ? 18 : 14;
        return (
          <g key={i}>
            {/* hatched halo for own territory */}
            {s.own === race.key && <circle cx={s.x} cy={s.y} r={r + 4} fill="url(#ga-cnv-hatch)" opacity="0.5"/>}
            <path
              d={`M ${s.x} ${s.y - r} Q ${s.x - r} ${s.y}, ${s.x} ${s.y + r} Q ${s.x + r} ${s.y}, ${s.x} ${s.y - r} Z`}
              fill={`${s.color}aa`} stroke={focus ? race.glow : s.color} strokeWidth={focus ? 1.8 : 1.2}
              style={{ filter: focus ? `drop-shadow(0 0 8px ${race.glow})` : 'none' }}/>
            {/* skull glyph at center */}
            <circle cx={s.x} cy={s.y-1} r="3.5" fill={s.color}/>
            <rect x={s.x-2.5} y={s.y+2} width="5" height="2" fill={s.color}/>
            <text x={s.x} y={s.y - r - 4} textAnchor="middle" fontFamily="Chakra Petch" fontSize="8" fill={s.color} letterSpacing="1.4">{s.n}</text>
            <text x={s.x} y={s.y + r + 12} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={`${s.color}aa`}>{s.tier === '?' ? 'BİLİNMEZ' : s.tier}</text>
          </g>
        );
      })}
      {/* dragon-here warning */}
      <text x="20" y="500" fontFamily="Chakra Petch" fontSize="9" fill={`${c}99`} letterSpacing="2">HIC SVNT LEONES · BİLİNMEYEN AV</text>
    </svg>
  );
}

function GalaxySeytan({ race, stars, selectedIdx }) {
  const c = race.primary, g = race.glow;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 540" preserveAspectRatio="xMidYMid slice"
      style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="ga-sy-bg" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor={c} stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="390" height="540" fill="url(#ga-sy-bg)"/>
      {/* big celestial circles */}
      <g fill="none" stroke={c} strokeWidth="0.5" opacity="0.4">
        <circle cx="195" cy="270" r="240"/>
        <circle cx="195" cy="270" r="170"/>
        <circle cx="195" cy="270" r="100"/>
      </g>
      {/* zodiac runes scattered */}
      <g fontFamily="JetBrains Mono" fontSize="9" fill={`${c}77`}>
        {Array.from({length:12}).map((_,i) => {
          const a = (i/12)*Math.PI*2;
          const x = 195 + Math.cos(a)*240;
          const y = 270 + Math.sin(a)*240;
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" letterSpacing="1.5">✦</text>;
        })}
      </g>
      {/* pact lines between stars (drawn in chalk) */}
      <g stroke={c} fill="none" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.65">
        {stars.map((s,i) => i > 0 ? (
          <line key={i} x1={stars[Math.max(0,i-1)].x} y1={stars[Math.max(0,i-1)].y}
            x2={s.x} y2={s.y}/>
        ) : null)}
      </g>
      {/* a pentagram across own stars */}
      {(() => {
        const own = stars.filter(s => s.own === race.key).slice(0, 5);
        if (own.length < 3) return null;
        return (
          <path d={'M ' + own.map(s => `${s.x} ${s.y}`).join(' L ') + ' Z'}
            stroke={g} strokeWidth="1" fill="none" opacity="0.45"/>
        );
      })()}
      {/* stars as sigil seals */}
      {stars.map((s,i) => {
        const focus = i === selectedIdx;
        return (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r="10" fill="none" stroke={focus ? g : s.color} strokeWidth={focus ? 1.5 : 0.8}
              style={{ filter: focus ? `drop-shadow(0 0 6px ${g})` : 'none' }}/>
            <circle cx={s.x} cy={s.y} r="6" fill={`${s.color}55`} stroke={s.color} strokeWidth="0.6"/>
            <polygon
              points={(() => {
                const pts = Array.from({length:5}, (_, k) => {
                  const a = (k / 5) * Math.PI * 2 - Math.PI/2;
                  return [s.x + Math.cos(a)*5, s.y + Math.sin(a)*5];
                });
                return pts.map(p => p.join(',')).join(' ');
              })()}
              fill={s.color} stroke={s.color} strokeWidth="0.4"/>
            <text x={s.x} y={s.y - 14} textAnchor="middle" fontFamily="Chakra Petch" fontSize="8" fill={s.color} letterSpacing="1.5">{s.n}</text>
            <text x={s.x} y={s.y + 18} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={`${s.color}aa`}>{['I','II','III','IV','V','VI'][i] || s.tier}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================
// RaceBattlefield — battle scene per race
// Used in: ScrBattle (14)
// ============================================================
function RaceBattlefield({ race, enemyKey = 'zerg' }) {
  if (race.key === 'zerg')    return <BattleZerg race={race} enemyKey={enemyKey}/>;
  if (race.key === 'otomat')  return <BattleOtomat race={race} enemyKey={enemyKey}/>;
  if (race.key === 'canavar') return <BattleCanavar race={race} enemyKey={enemyKey}/>;
  if (race.key === 'seytan')  return <BattleSeytan race={race} enemyKey={enemyKey}/>;
  return <BattleInsan race={race} enemyKey={enemyKey}/>;
}

function BattleInsan({ race, enemyKey }) {
  const c = race.primary;
  const ec = RACES[enemyKey].primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 500" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="btl-ins-grid" width="20" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6 L 10 0 L 20 6 L 10 12 Z" fill="none" stroke={`${c}14`} strokeWidth="0.4"/>
        </pattern>
        <radialGradient id="btl-ins-ex"><stop offset="0%" stopColor="#fff4d6" stopOpacity="1"/><stop offset="40%" stopColor="oklch(0.65 0.22 25)" stopOpacity="0.7"/><stop offset="100%" stopColor="oklch(0.65 0.22 25)" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="390" height="500" fill="url(#btl-ins-grid)"/>
      {/* trench lines */}
      <path d="M 0 380 L 390 360" stroke={`${c}33`} strokeWidth="6"/>
      <path d="M 0 120 L 390 140" stroke={`${ec}33`} strokeWidth="6"/>
      {/* allied marines (rectangle pips) */}
      {Array.from({length:14}).map((_,i) => {
        const x = 30 + (i%7)*22, y = 380 + Math.floor(i/7)*22;
        return <g key={`a${i}`}><rect x={x-3} y={y-3} width="6" height="6" fill={c}/><rect x={x-5} y={y+5} width="10" height="1.5" fill={c}/></g>;
      })}
      {/* mecha walkers in back row */}
      {[100, 200, 300].map((x,i) => (
        <g key={i}><polygon points={`${x},${440} ${x-8},${455} ${x},${470} ${x+8},${455}`} fill={c} stroke="#fff" strokeWidth="0.6"/></g>
      ))}
      {/* enemy zerglings (triangles) */}
      {Array.from({length:16}).map((_,i) => {
        const x = 30 + (i%8)*24, y = 100 + Math.floor(i/8)*22;
        return <polygon key={`e${i}`} points={`${x},${y-5} ${x+5},${y+3} ${x-5},${y+3}`} fill={ec} stroke={`${ec}aa`} strokeWidth="0.4"/>;
      })}
      {/* laser tracers */}
      {[[50,400,200,160],[110,395,240,140],[290,160,80,400]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i<2?race.glow:ec} strokeWidth="1.2" opacity="0.85"/>
      ))}
      <circle cx="220" cy="220" r="34" fill="url(#btl-ins-ex)"/>
      <text x="260" y="190" fontFamily="JetBrains Mono" fontSize="14" fontWeight="700" fill="oklch(0.80 0.16 80)">-42</text>
      <text x="160" y="320" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" fill={race.glow}>+18</text>
    </svg>
  );
}

function BattleZerg({ race, enemyKey }) {
  const c = race.primary, g = race.glow;
  const ec = RACES[enemyKey].primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 500" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="btl-zr-ground" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor={c} stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="390" height="500" fill="url(#btl-zr-ground)"/>
      {/* infested ground tendrils */}
      <g stroke={c} fill="none" strokeWidth="0.6" opacity="0.5">
        {Array.from({length:8}).map((_,i)=>(
          <path key={i} d={`M ${20 + i*46} 500 Q ${30 + i*46} 420, ${50 + i*46} 380 Q ${20 + i*46} 340, ${40 + i*46} 280`}/>
        ))}
      </g>
      {/* enemy (top) — military marines */}
      {Array.from({length:14}).map((_,i) => {
        const x = 40 + (i%7)*26, y = 90 + Math.floor(i/7)*22;
        return <rect key={`e${i}`} x={x-3} y={y-3} width="6" height="6" fill={ec}/>;
      })}
      {/* allied larvae swarm (bottom) — many small organic dots */}
      {Array.from({length:42}).map((_,i) => {
        const x = 20 + ((i*17)%360);
        const y = 360 + Math.floor(i/12)*20 + ((i*13)%14);
        return (
          <g key={`a${i}`}>
            <ellipse cx={x} cy={y} rx="4" ry="3" fill={c} stroke={g} strokeWidth="0.4"/>
            <circle cx={x} cy={y} r="1.2" fill={g}/>
          </g>
        );
      })}
      {/* flying mutalisks */}
      {[[80,220],[180,180],[280,210]].map(([x,y],i)=>(
        <g key={i}>
          <path d={`M ${x} ${y} Q ${x-12} ${y-4}, ${x-18} ${y+2} M ${x} ${y} Q ${x+12} ${y-4}, ${x+18} ${y+2}`} stroke={c} strokeWidth="1.2" fill="none"/>
          <ellipse cx={x} cy={y} rx="4" ry="3" fill={g}/>
        </g>
      ))}
      {/* bio-acid splashes */}
      {[[180, 150],[260, 180],[120, 140]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="10" fill={g} opacity="0.55"/>
          <circle cx={x} cy={y} r="5" fill={c}/>
        </g>
      ))}
      <text x="260" y="160" fontFamily="JetBrains Mono" fontSize="13" fontWeight="700" fill={g}>-58</text>
      <text x="120" y="380" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" fill={g}>+24</text>
    </svg>
  );
}

function BattleOtomat({ race, enemyKey }) {
  const c = race.primary;
  const ec = RACES[enemyKey].primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 500" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="btl-oto-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M0 0 H20 M0 0 V20" stroke={`${c}30`} strokeWidth="0.4"/>
        </pattern>
      </defs>
      <rect width="390" height="500" fill="url(#btl-oto-grid)"/>
      {/* battlefield axes */}
      <g fontFamily="JetBrains Mono" fontSize="6" fill={`${c}99`}>
        {[0,1,2,3,4,5,6].map(i => (<text key={i} x={4} y={20+i*60}>R{i}</text>))}
        {[0,1,2,3,4].map(i => (<text key={i} x={20+i*80} y={14}>C{i}</text>))}
      </g>
      {/* allied formation — strict hex grid */}
      {Array.from({length:15}).map((_,i) => {
        const x = 40 + (i%5)*70;
        const y = 380 + Math.floor(i/5)*30;
        return (
          <g key={`a${i}`}>
            <polygon points={`${x-7},${y-12} ${x+7},${y-12} ${x+12},${y} ${x+7},${y+12} ${x-7},${y+12} ${x-12},${y}`} fill={`${c}55`} stroke={c} strokeWidth="0.8"/>
            <rect x={x-4} y={y-4} width="8" height="8" fill={c}/>
          </g>
        );
      })}
      {/* enemy formation (top) */}
      {Array.from({length:15}).map((_,i) => {
        const x = 40 + (i%5)*70;
        const y = 70 + Math.floor(i/5)*30;
        return (
          <g key={`e${i}`}>
            <polygon points={`${x-7},${y-12} ${x+7},${y-12} ${x+12},${y} ${x+7},${y+12} ${x-7},${y+12} ${x-12},${y}`} fill={`${ec}55`} stroke={ec} strokeWidth="0.8"/>
            <rect x={x-4} y={y-4} width="8" height="8" fill={ec}/>
          </g>
        );
      })}
      {/* beam volleys — synchronized */}
      {[100, 170, 240, 310].map((x,i) => (
        <line key={i} x1={x} y1={370} x2={x} y2={130} stroke={race.glow} strokeWidth="1" opacity="0.85"/>
      ))}
      {/* explosion (hex grid one) */}
      <g transform="translate(170 130)">
        <polygon points="-14,-24 14,-24 24,0 14,24 -14,24 -24,0" fill="#fff4d6" opacity="0.85"/>
        <polygon points="-9,-15 9,-15 15,0 9,15 -9,15 -15,0" fill="oklch(0.70 0.22 60)"/>
      </g>
      <text x="220" y="160" fontFamily="JetBrains Mono" fontSize="13" fontWeight="700" fill={race.glow}>::dmg(38)</text>
      <text x="40" y="370" fontFamily="JetBrains Mono" fontSize="10" fill={`${c}cc`}>::tick 1424</text>
    </svg>
  );
}

function BattleCanavar({ race, enemyKey }) {
  const c = race.primary;
  const ec = RACES[enemyKey].primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 500" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
      <defs>
        <pattern id="btl-cnv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={`${c}55`} strokeWidth="0.4"/>
        </pattern>
      </defs>
      <rect width="390" height="500" fill="url(#btl-cnv-hatch)" opacity="0.5"/>
      {/* terrain shapes */}
      <path d="M 0 200 Q 100 180, 200 210 Q 300 240, 390 200" stroke={`${c}99`} strokeWidth="0.8" fill="none"/>
      <path d="M 0 320 Q 130 300, 230 330 Q 310 360, 390 330" stroke={`${c}99`} strokeWidth="0.8" fill="none"/>
      {/* allied beasts — chaotic positions */}
      {[[60,380],[110,400],[170,395],[240,388],[300,405],[80,440],[200,440],[320,440],[140,420]].map(([x,y],i)=>(
        <g key={`a${i}`}>
          <path d={`M ${x-8} ${y} Q ${x} ${y-10}, ${x+8} ${y} Q ${x+4} ${y+6}, ${x-8} ${y} Z`} fill={c}
            style={{ filter: `drop-shadow(0 0 4px ${race.glow}66)` }}/>
          <circle cx={x-2} cy={y-3} r="1" fill={race.glow}/>
          <circle cx={x+2} cy={y-3} r="1" fill={race.glow}/>
        </g>
      ))}
      {/* enemy formation (top) */}
      {Array.from({length:16}).map((_,i) => {
        const x = 30 + (i%8)*45;
        const y = 110 + Math.floor(i/8)*24;
        return <rect key={`e${i}`} x={x-4} y={y-4} width="8" height="8" fill={ec}/>;
      })}
      {/* blood splatters */}
      {[[180, 140],[100, 150],[280, 130],[160, 170],[300, 165]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill={c}/>
          <circle cx={x+5} cy={y+3} r="1.4" fill={c}/>
          <circle cx={x-4} cy={y+4} r="1" fill={c}/>
        </g>
      ))}
      {/* claw marks */}
      <g stroke={c} strokeWidth="1.4" fill="none" opacity="0.85">
        <path d="M 200 100 L 195 130 M 210 100 L 207 130 M 220 100 L 219 130"/>
      </g>
      <text x="180" y="170" fontFamily="Chakra Petch" fontSize="14" fontWeight="700" fill={race.glow} letterSpacing="2">-62 !</text>
      <text x="220" y="380" fontFamily="Chakra Petch" fontSize="10" fontWeight="700" fill={race.glow}>+ KAN</text>
    </svg>
  );
}

function BattleSeytan({ race, enemyKey }) {
  const c = race.primary, g = race.glow;
  const ec = RACES[enemyKey].primary;
  return (
    <svg width="100%" height="100%" viewBox="0 0 390 500" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id="btl-sy-bg" cx="50%" cy="60%" r="80%">
          <stop offset="0%" stopColor={c} stopOpacity="0.20"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="390" height="500" fill="url(#btl-sy-bg)"/>
      {/* battlefield = giant pentagram */}
      <g transform="translate(195 280)" fill="none" stroke={c} strokeWidth="0.6" opacity="0.6">
        <circle r="180"/>
        <circle r="150"/>
        <circle r="100"/>
        {(() => {
          const pts = Array.from({length:5}, (_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI/2;
            return [Math.cos(a)*150, Math.sin(a)*150];
          });
          const order = [0,2,4,1,3,0];
          const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
          return <path d={d} stroke={g} strokeWidth="1" style={{ filter:`drop-shadow(0 0 4px ${g})` }}/>;
        })()}
      </g>
      {/* enemy at top */}
      {Array.from({length:14}).map((_,i) => {
        const x = 40 + (i%7)*52, y = 90 + Math.floor(i/7)*22;
        return <rect key={`e${i}`} x={x-3} y={y-3} width="6" height="6" fill={ec}/>;
      })}
      {/* summoned imps at pentagram points */}
      {Array.from({length:5}).map((_,i)=>{
        const a = (i / 5) * Math.PI * 2 - Math.PI/2;
        const x = 195 + Math.cos(a)*150;
        const y = 280 + Math.sin(a)*150;
        return (
          <g key={i}>
            <polygon points={`${x-6},${y+4} ${x},${y-10} ${x+6},${y+4}`} fill={c} stroke={g} strokeWidth="0.6"
              style={{ filter: `drop-shadow(0 0 4px ${g}77)` }}/>
            <circle cx={x} cy={y-2} r="1.2" fill={g}/>
          </g>
        );
      })}
      {/* swarm of imps around */}
      {Array.from({length:18}).map((_,i)=>{
        const a = i*0.42;
        const r = 90 + (i%3)*20;
        const x = 195 + Math.cos(a)*r;
        const y = 320 + Math.sin(a)*r*0.4;
        return <polygon key={i} points={`${x-3},${y+2} ${x},${y-5} ${x+3},${y+2}`} fill={c}/>;
      })}
      {/* shadow tendril striking enemy */}
      <g stroke={c} strokeWidth="3" fill="none" opacity="0.85">
        <path d="M 195 280 Q 220 200, 240 130 Q 250 110, 260 100"/>
      </g>
      <g stroke={g} strokeWidth="1" fill="none" opacity="0.85">
        <path d="M 195 280 Q 220 200, 240 130 Q 250 110, 260 100" style={{ filter:`drop-shadow(0 0 6px ${g})` }}/>
      </g>
      <text x="240" y="140" fontFamily="Chakra Petch" fontSize="12" fontWeight="700" fill={g} letterSpacing="2">⊕ -84</text>
      <text x="120" y="380" fontFamily="Chakra Petch" fontSize="10" fontWeight="700" fill={g} letterSpacing="2">+ III RUH</text>
    </svg>
  );
}

// ============================================================
// RaceTierUpMoment — the celebratory visual when leveling up
// Used in: ScrTierUp (16)
// ============================================================
function RaceTierUpMoment({ race, fromLevel = 8, toLevel = 9, levelName = 'METROPOL' }) {
  if (race.key === 'zerg')    return <TierUpZerg race={race} from={fromLevel} to={toLevel} name={levelName}/>;
  if (race.key === 'otomat')  return <TierUpOtomat race={race} from={fromLevel} to={toLevel} name={levelName}/>;
  if (race.key === 'canavar') return <TierUpCanavar race={race} from={fromLevel} to={toLevel} name={levelName}/>;
  if (race.key === 'seytan')  return <TierUpSeytan race={race} from={fromLevel} to={toLevel} name={levelName}/>;
  return <TierUpInsan race={race} from={fromLevel} to={toLevel} name={levelName}/>;
}

const Spin = ({ size, color }) => (
  <div style={{
    position:'absolute', inset:-8, width: 'calc(100% + 16px)', height: 'calc(100% + 16px)',
    border:`1px dashed ${color}77`, borderRadius:'50%',
    animation:'nd-spin 12s linear infinite',
  }}/>
);

function TierUpInsan({ race, from, to, name }) {
  return (
    <div style={{ textAlign:'center', marginBottom: 18 }}>
      <Eyebrow style={{ color: race.primary, marginBottom: 8 }}>PROMOSYON TÖRENİ · ÇAĞ 1</Eyebrow>
      <div style={{ position:'relative', display:'inline-block', marginBottom: 8 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* medal */}
          <circle cx="60" cy="60" r="40" fill={`${race.primary}33`} stroke={race.primary} strokeWidth="2"
            style={{ filter: `drop-shadow(0 0 12px ${race.glow}99)` }}/>
          <circle cx="60" cy="60" r="32" fill="none" stroke={race.primary} strokeWidth="1"/>
          {/* chevrons */}
          {[-1,0,1].map(i => (
            <path key={i} d={`M 44 ${56+i*8} L 60 ${50+i*8} L 76 ${56+i*8}`} stroke={race.primary} strokeWidth="2.4" fill="none"/>
          ))}
          {/* ribbons */}
          <path d="M 30 95 L 40 75 L 60 100 L 80 75 L 90 95" stroke={race.primary} strokeWidth="2" fill={`${race.primary}55`}/>
        </svg>
        <Spin color={race.primary}/>
      </div>
      <H1 style={{ color: ND.text, fontSize: 14, letterSpacing:'0.30em' }}>UNVAN</H1>
      <H1 style={{ color: race.primary, fontSize: 32, letterSpacing:'0.18em',
        textShadow: `0 0 18px ${race.glow}aa` }}>{name}</H1>
      <Caption style={{ marginTop: 4 }}>RANK {from} → <span style={{ color: race.primary }}>RANK {to}</span> · Çağ 1 zirvesi</Caption>
    </div>
  );
}

function TierUpZerg({ race, from, to, name }) {
  return (
    <div style={{ textAlign:'center', marginBottom: 18 }}>
      <Eyebrow style={{ color: race.primary, marginBottom: 8 }}>EVRİM AŞAMASI · GENOM SIÇRAMASI</Eyebrow>
      <div style={{ position:'relative', display:'inline-block', marginBottom: 8 }}>
        <svg width="140" height="120" viewBox="0 0 140 120">
          {/* mitosis: two cells splitting */}
          <defs>
            <radialGradient id="tu-zr-cell">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
              <stop offset="35%" stopColor={race.glow} stopOpacity="0.85"/>
              <stop offset="100%" stopColor={race.primary} stopOpacity="0.4"/>
            </radialGradient>
          </defs>
          <ellipse cx="46" cy="60" rx="36" ry="38" fill="url(#tu-zr-cell)" stroke={race.primary} strokeWidth="1.2"
            style={{ filter:`drop-shadow(0 0 12px ${race.glow}88)` }}/>
          <ellipse cx="94" cy="60" rx="36" ry="38" fill="url(#tu-zr-cell)" stroke={race.primary} strokeWidth="1.2"
            style={{ filter:`drop-shadow(0 0 12px ${race.glow}88)` }}/>
          {/* connecting filament */}
          <path d="M 76 55 Q 70 62, 76 70 M 64 55 Q 70 62, 64 70" stroke={race.glow} strokeWidth="0.8" fill="none"/>
          {/* nuclei */}
          <circle cx="46" cy="60" r="6" fill={race.glow}/>
          <circle cx="94" cy="60" r="6" fill={race.glow}/>
          {/* chromatin */}
          <path d="M 40 55 Q 46 50, 52 55 M 88 55 Q 94 50, 100 55" stroke="#fff" strokeWidth="0.8" fill="none" opacity="0.85"/>
        </svg>
        <Spin color={race.primary}/>
      </div>
      <H1 style={{ color: ND.text, fontSize: 14, letterSpacing:'0.30em' }}>EVRİM</H1>
      <H1 style={{ color: race.primary, fontSize: 32, letterSpacing:'0.18em',
        textShadow: `0 0 18px ${race.glow}aa` }}>{name}</H1>
      <Caption style={{ marginTop: 4 }}>AŞ. {from} → <span style={{ color: race.primary }}>AŞ. {to}</span> · Mutasyon stabil</Caption>
    </div>
  );
}

function TierUpOtomat({ race, from, to, name }) {
  return (
    <div style={{ textAlign:'center', marginBottom: 18 }}>
      <Eyebrow style={{ color: race.primary, marginBottom: 8, fontFamily: ND.mono }}>::build pipeline · stage 9</Eyebrow>
      <div style={{ position:'relative', display:'inline-block', marginBottom: 8 }}>
        <svg width="160" height="120" viewBox="0 0 160 120">
          <defs>
            <pattern id="tu-oto-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 0 H10 M0 0 V10" stroke={`${race.primary}55`} strokeWidth="0.3"/>
            </pattern>
          </defs>
          <rect x="20" y="20" width="120" height="80" fill="rgba(20,36,64,0.85)" stroke={race.primary} strokeWidth="1.4"/>
          <rect x="22" y="22" width="116" height="76" fill="url(#tu-oto-grid)"/>
          {/* progress bar */}
          <rect x="30" y="60" width="100" height="6" fill="rgba(0,0,0,0.3)" stroke={race.primary} strokeWidth="0.6"/>
          <rect x="30" y="60" width="100" height="6" fill={race.glow} style={{ filter:`drop-shadow(0 0 4px ${race.glow})` }}/>
          {/* boot text */}
          <text x="80" y="42" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={race.glow}>::build OK</text>
          <text x="80" y="80" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill={`${race.primary}cc`}>v{to}.0.0 · stable</text>
          <text x="80" y="92" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="7" fill={`${race.primary}99`}>sha: a4f9e8c</text>
        </svg>
      </div>
      <H1 style={{ color: ND.text, fontSize: 14, letterSpacing:'0.30em', fontFamily: ND.mono }}>BUILD</H1>
      <H1 style={{ color: race.primary, fontSize: 32, letterSpacing:'0.18em',
        textShadow: `0 0 18px ${race.glow}aa`, fontFamily: ND.mono }}>v{to}.0</H1>
      <Caption style={{ marginTop: 4 }}>v{from}.0 → <span style={{ color: race.primary }}>v{to}.0</span> · ::ship to prod</Caption>
    </div>
  );
}

function TierUpCanavar({ race, from, to, name }) {
  return (
    <div style={{ textAlign:'center', marginBottom: 18 }}>
      <Eyebrow style={{ color: race.primary, marginBottom: 8 }}>YENİ KAN · YENİ ÇAĞ</Eyebrow>
      <div style={{ position:'relative', display:'inline-block', marginBottom: 8 }}>
        <svg width="140" height="120" viewBox="0 0 140 120">
          {/* beast roar silhouette */}
          <path d="M 70 18 Q 50 36, 36 56 Q 28 80, 36 100 Q 50 100, 60 92 L 64 100 L 72 92 L 80 100 L 84 92 Q 90 100, 104 100 Q 112 80, 104 56 Q 90 36, 70 18 Z"
            fill="#0a0604" stroke={race.primary} strokeWidth="1.5"
            style={{ filter: `drop-shadow(0 0 10px ${race.glow}99)` }}/>
          {/* eyes */}
          <circle cx="58" cy="62" r="3.4" fill={race.glow}
            style={{ filter: `drop-shadow(0 0 5px ${race.glow})` }}/>
          <circle cx="82" cy="62" r="3.4" fill={race.glow}
            style={{ filter: `drop-shadow(0 0 5px ${race.glow})` }}/>
          {/* fangs */}
          <path d="M 64 78 L 66 90 L 68 78 M 72 78 L 74 90 L 76 78" fill="#fff" stroke={race.primary} strokeWidth="0.4"/>
          {/* horns */}
          <path d="M 56 28 Q 48 14, 52 6 M 84 28 Q 92 14, 88 6" stroke={race.primary} strokeWidth="2.4" fill="none"/>
          {/* blood drops below */}
          <path d="M 56 110 L 58 116 L 60 110 Z M 80 110 L 82 116 L 84 110 Z" fill={race.primary}/>
        </svg>
      </div>
      <H1 style={{ color: ND.text, fontSize: 14, letterSpacing:'0.30em' }}>AVCI ÇAĞI</H1>
      <H1 style={{ color: race.primary, fontSize: 32, letterSpacing:'0.18em',
        textShadow: `0 0 18px ${race.glow}aa` }}>{name}</H1>
      <Caption style={{ marginTop: 4 }}>ÇAĞ {from} → <span style={{ color: race.primary }}>ÇAĞ {to}</span> · Kan kutsandı</Caption>
    </div>
  );
}

function TierUpSeytan({ race, from, to, name }) {
  const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
  return (
    <div style={{ textAlign:'center', marginBottom: 18 }}>
      <Eyebrow style={{ color: race.primary, marginBottom: 8 }}>· YENİ MÜHÜR · YENİ MERTEBE ·</Eyebrow>
      <div style={{ position:'relative', display:'inline-block', marginBottom: 8 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* sigil being burned */}
          <circle cx="70" cy="70" r="58" fill="none" stroke={race.primary} strokeWidth="1"/>
          <circle cx="70" cy="70" r="48" fill="none" stroke={race.primary} strokeWidth="0.6"/>
          {(() => {
            const pts = Array.from({length:5}, (_, i) => {
              const a = (i / 5) * Math.PI * 2 - Math.PI/2;
              return [70 + Math.cos(a)*44, 70 + Math.sin(a)*44];
            });
            const order = [0,2,4,1,3,0];
            const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
            return <path d={d} stroke={race.glow} strokeWidth="2"
              style={{ filter:`drop-shadow(0 0 8px ${race.glow})` }} fill="none"/>;
          })()}
          {/* central flame */}
          <path d="M 70 50 Q 60 64, 64 76 Q 68 84, 70 86 Q 72 84, 76 76 Q 80 64, 70 50 Z"
            fill={race.glow} opacity="0.85" style={{ filter:`drop-shadow(0 0 6px ${race.glow})` }}/>
          {/* runes */}
          {Array.from({length:6}).map((_,i)=>{
            const a = (i / 6) * Math.PI * 2;
            const x = 70 + Math.cos(a)*54;
            const y = 70 + Math.sin(a)*54;
            return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontFamily="Chakra Petch" fontSize="10" fill={race.glow} fontWeight="700">✦</text>;
          })}
        </svg>
        <Spin color={race.primary}/>
      </div>
      <H1 style={{ color: ND.text, fontSize: 14, letterSpacing:'0.30em' }}>MERTEBE</H1>
      <H1 style={{ color: race.primary, fontSize: 32, letterSpacing:'0.18em',
        textShadow: `0 0 18px ${race.glow}aa` }}>{romans[to-1] || to}</H1>
      <Caption style={{ marginTop: 4 }}>{romans[from-1] || from} → <span style={{ color: race.primary }}>{romans[to-1] || to}</span> · Pakt güçlendi</Caption>
    </div>
  );
}

// ============================================================
// RaceCommanderCard — primary commander display per race
// Used in: ScrCommanders (19)
// ============================================================
function RaceCommanderCard({ race, primary = true, commander }) {
  if (race.key === 'zerg')    return <CmdrZerg race={race} primary={primary} cmd={commander}/>;
  if (race.key === 'otomat')  return <CmdrOtomat race={race} primary={primary} cmd={commander}/>;
  if (race.key === 'canavar') return <CmdrCanavar race={race} primary={primary} cmd={commander}/>;
  if (race.key === 'seytan')  return <CmdrSeytan race={race} primary={primary} cmd={commander}/>;
  return <CmdrInsan race={race} primary={primary} cmd={commander}/>;
}

function CmdrInsan({ race, primary, cmd }) {
  const c = race.primary;
  return (
    <div style={{
      background: 'rgba(8,12,26,0.85)',
      border: `1px solid ${c}88`,
      padding: 12,
      clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      boxShadow: primary ? `0 0 18px ${race.glow}55` : 'none',
      display:'flex', gap: 12, alignItems:'center',
    }}>
      <div style={{ width: 76, height: 76, border:`1px solid ${c}`, background:`${c}22`,
        display:'flex', alignItems:'center', justifyContent:'center',
        clipPath:'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)' }}>
        <UnitSilhouette race={race} tier={primary ? 5 : 3}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: c, fontFamily: ND.mono }}>::DOSSIER · CL-{primary?'5':'3'}</Eyebrow>
        <H3 style={{ color: ND.text, fontSize: 13, marginTop: 2 }}>{cmd.n}</H3>
        <Caption style={{ fontSize: 11, marginTop: 1 }}>{cmd.t}</Caption>
        <div style={{ marginTop: 6, display:'flex', gap: 6, alignItems:'center' }}>
          <Chip color={c}>LV {cmd.lv}</Chip>
          <RaceTierBadge race={race} tier={primary ? 5 : 3} size={16}/>
        </div>
      </div>
    </div>
  );
}

function CmdrZerg({ race, primary, cmd }) {
  const c = race.primary, g = race.glow;
  return (
    <div style={{
      background:'radial-gradient(ellipse at 20% 50%, oklch(0.20 0.15 340 / 0.7), rgba(12,2,18,0.85))',
      border: `1px solid ${c}88`,
      padding: 12,
      borderRadius:'24px 6px 24px 6px',
      boxShadow: primary ? `inset 0 0 24px ${c}33, 0 0 18px ${g}55` : 'none',
      display:'flex', gap: 12, alignItems:'center', position:'relative',
    }}>
      {/* vein connection back to queen */}
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
        <defs>
          <radialGradient id="cm-zr-eg">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
            <stop offset="40%" stopColor={g} stopOpacity="0.7"/>
            <stop offset="100%" stopColor={c} stopOpacity="0.5"/>
          </radialGradient>
        </defs>
        <ellipse cx="40" cy="42" rx="30" ry="34" fill="url(#cm-zr-eg)" stroke={c} strokeWidth="1.2"
          style={{ filter: `drop-shadow(0 0 6px ${g}aa)` }}/>
        <circle cx="40" cy="42" r="7" fill={g}/>
        {/* tendrils */}
        <path d="M 12 30 Q 20 30, 24 36 M 68 30 Q 60 30, 56 36 M 12 60 Q 20 60, 24 54 M 68 60 Q 60 60, 56 54" stroke={c} strokeWidth="1" fill="none"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: c }}>{primary ? 'KOVAN BİLİNCİ · ANA' : 'KOVAN UZANTI · ' + (cmd.tier || '')}</Eyebrow>
        <H3 style={{ color: ND.text, fontSize: 13, marginTop: 2 }}>{cmd.n}</H3>
        <Caption style={{ fontSize: 11, marginTop: 1 }}>{cmd.t}</Caption>
        <div style={{ marginTop: 6, display:'flex', gap: 6, alignItems:'center' }}>
          <Code style={{ color: c }}>EVRİM AŞ.</Code>
          <RaceTierBadge race={race} tier={primary ? 5 : 3} size={16}/>
          <Chip color={c}>LV {cmd.lv}</Chip>
        </div>
      </div>
    </div>
  );
}

function CmdrOtomat({ race, primary, cmd }) {
  const c = race.primary;
  return (
    <div style={{
      background:'rgba(8,18,32,0.85)',
      border: `1px solid ${c}88`,
      padding: 12, position:'relative',
      boxShadow: primary ? `0 0 18px ${race.glow}55` : 'none',
    }}>
      {/* corner crosshairs */}
      <div style={{ position:'absolute', top: 4, left: 4, width: 10, height: 10, borderTop:`1px solid ${c}`, borderLeft:`1px solid ${c}` }}/>
      <div style={{ position:'absolute', top: 4, right: 4, width: 10, height: 10, borderTop:`1px solid ${c}`, borderRight:`1px solid ${c}` }}/>
      <div style={{ position:'absolute', bottom: 4, left: 4, width: 10, height: 10, borderBottom:`1px solid ${c}`, borderLeft:`1px solid ${c}` }}/>
      <div style={{ position:'absolute', bottom: 4, right: 4, width: 10, height: 10, borderBottom:`1px solid ${c}`, borderRight:`1px solid ${c}` }}/>
      <div style={{ display:'flex', gap: 12, alignItems:'center' }}>
        <div style={{ width: 78, height: 78, border:`1px solid ${c}`, background:`${c}11`, position:'relative' }}>
          {/* schematic */}
          <svg width="78" height="78" viewBox="0 0 78 78">
            <rect x="6" y="6" width="66" height="66" fill="none" stroke={`${c}55`} strokeWidth="0.4"/>
            <rect x="20" y="20" width="38" height="38" fill={`${c}33`} stroke={c} strokeWidth="1"/>
            <rect x="32" y="32" width="14" height="14" fill={c}/>
            <text x="39" y="68" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={c}>UNIT::PRIME</text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow style={{ color: c, fontFamily: ND.mono }}>PID::{cmd.lv.toString(16).padStart(4,'0')}::ACTIVE</Eyebrow>
          <H3 style={{ color: ND.text, fontSize: 13, marginTop: 2, fontFamily: ND.mono }}>{cmd.n}</H3>
          <Caption style={{ fontSize: 11, marginTop: 1, fontFamily: ND.mono }}>{cmd.t}</Caption>
          <div style={{ marginTop: 6, display:'flex', gap: 6, alignItems:'center', fontFamily: ND.mono }}>
            <Code style={{ color: c }}>::lv{cmd.lv}</Code>
            <RaceTierBadge race={race} tier={primary ? 5 : 3} size={16}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function CmdrCanavar({ race, primary, cmd }) {
  const c = race.primary;
  return (
    <div style={{
      background:'linear-gradient(180deg, rgba(28,12,4,0.85), rgba(12,4,2,0.85))',
      border: `1px solid ${c}88`,
      padding: 12,
      borderRadius:'4px 18px 4px 18px',
      boxShadow: primary ? `0 0 18px ${race.glow}55` : 'none',
      display:'flex', gap: 12, alignItems:'center', position:'relative',
    }}>
      {/* corner claw mark */}
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ position:'absolute', top: 4, right: 4 }}>
        <path d="M 2 16 Q 4 4, 8 16 M 9 16 Q 11 3, 15 16 M 16 16 Q 18 5, 18 12" stroke={c} strokeWidth="1.2" fill="none"/>
      </svg>
      <div style={{ width: 78, height: 78, border:`1px solid ${c}`, background:`${c}22`,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:'4px 18px 4px 18px' }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <path d="M 14 14 Q 8 30, 14 44 Q 28 50, 42 44 Q 48 30, 42 14 Q 28 8, 14 14 Z" fill="#0a0604" stroke={c} strokeWidth="1.4"/>
          <circle cx="22" cy="26" r="3" fill={race.glow}/>
          <circle cx="34" cy="26" r="3" fill={race.glow}/>
          <path d="M 24 36 L 26 42 L 28 36 M 30 36 L 32 42 L 34 36" fill="#fff" stroke={c} strokeWidth="0.4"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: c }}>{primary ? 'SÜRÜ LİDERİ · ALFA' : 'SÜRÜ ÜYESİ'}</Eyebrow>
        <H3 style={{ color: ND.text, fontSize: 13, marginTop: 2 }}>{cmd.n}</H3>
        <Caption style={{ fontSize: 11, marginTop: 1 }}>{cmd.t}</Caption>
        <div style={{ marginTop: 6, display:'flex', gap: 6, alignItems:'center' }}>
          <Code style={{ color: c }}>{cmd.lv} AV</Code>
          <RaceTierBadge race={race} tier={primary ? 5 : 3} size={16}/>
        </div>
      </div>
    </div>
  );
}

function CmdrSeytan({ race, primary, cmd }) {
  const c = race.primary, g = race.glow;
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(20,2,6,0.92), rgba(8,1,3,0.92))',
      border: `1px solid ${c}88`,
      padding: 12,
      boxShadow: primary ? `inset 0 0 28px ${c}33, 0 0 18px ${g}55` : `inset 0 0 14px ${c}22`,
      display:'flex', gap: 12, alignItems:'center', position:'relative',
    }}>
      {/* corner sigil marks */}
      <div style={{ position:'absolute', top: 4, left: 4, right: 4, bottom: 4, border:`1px solid ${c}33`, pointerEvents:'none' }}/>
      <div style={{ width: 78, height: 78, position:'relative',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="78" height="78" viewBox="0 0 78 78">
          <circle cx="39" cy="39" r="34" fill="none" stroke={c} strokeWidth="0.8"/>
          <circle cx="39" cy="39" r="26" fill="none" stroke={c} strokeWidth="0.5"/>
          {(() => {
            const pts = Array.from({length:5}, (_, i) => {
              const a = (i / 5) * Math.PI * 2 - Math.PI/2;
              return [39 + Math.cos(a)*22, 39 + Math.sin(a)*22];
            });
            const order = [0,2,4,1,3,0];
            const d = 'M ' + order.map(o => pts[o].join(' ')).join(' L ');
            return <path d={d} stroke={g} strokeWidth="1" fill="none" style={{ filter:`drop-shadow(0 0 4px ${g})` }}/>;
          })()}
          <circle cx="39" cy="39" r="5" fill={g}/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: c }}>{primary ? '· PAKT MÜHRÜ · BAŞ ·' : '· VASSAL ·'}</Eyebrow>
        <H3 style={{ color: ND.text, fontSize: 13, marginTop: 2, letterSpacing:'0.06em' }}>{cmd.n}</H3>
        <Caption style={{ fontSize: 11, marginTop: 1 }}>{cmd.t}</Caption>
        <div style={{ marginTop: 6, display:'flex', gap: 6, alignItems:'center' }}>
          <Code style={{ color: c, letterSpacing:'0.2em' }}>MERTEBE</Code>
          <RaceTierBadge race={race} tier={primary ? 5 : 3} size={16}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  RaceAwakeningArt, RaceGalaxyVision, RaceBattlefield, RaceTierUpMoment, RaceCommanderCard,
});

// Add spin keyframe globally (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('nd-spin-style')) {
  const st = document.createElement('style');
  st.id = 'nd-spin-style';
  st.textContent = '@keyframes nd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(st);
}
