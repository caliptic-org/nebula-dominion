// Nebula Dominion — Race-specific atoms: lexicon, badges, labels, HUD, tabs.
// Each race has its own VOCABULARY for progression — not just colors.

// ============================================================
// RACE_LEX — verbs, labels, formatters per race
// ============================================================
const RACE_LEX = {
  insan: {
    actionVerb: 'İNŞA', productionVerb: 'EĞİT', mergeVerb: 'TERFI',
    fieldName: 'KOMUTA SEKTÖRÜ', catalogName: 'YAPI KATALOĞU',
    productionName: 'KIŞLA · EĞİTİM HATTI', mergeName: 'PROMOSYON SALONU',
    rosterName: 'TUGAY ENVANTERİ',
    tierKind: 'mil', timeKind: 'countdown',
    levelLabel: 'KOMUTAN LV', statusOk: 'OPERASYONEL', statusBuild: 'İNŞA',
    buildTabs: ['Tümü','Ekonomi','Askeri','Bilim','Subspace'],
    productionTabs: ['Tümü','Piyade','Mecha','Komutan','Filo'],
    quickActions: [
      { k:'build',  l:'İNŞA',   ico:'hammer' },
      { k:'prod',   l:'EĞİT',   ico:'helmet' },
      { k:'merge',  l:'TERFI',  ico:'star'   },
    ],
    morphHint: 'BLUEPRINT', verticalFlow: 'Sıralı dağıtım',
  },
  zerg: {
    actionVerb: 'MUTASYON', productionVerb: 'DOĞUR', mergeVerb: 'EVRİMLE',
    fieldName: 'KOVAN HARİTASI', catalogName: 'GENOM AĞACI',
    productionName: 'LARVA HAVUZU', mergeName: 'EVRİM ÇUKURU',
    rosterName: 'SÜRÜ TABLOSU',
    tierKind: 'morph', timeKind: 'embryo',
    levelLabel: 'EVRİM AŞ.', statusOk: 'CANLI', statusBuild: 'GEBE',
    buildTabs: ['Tümü','Et','Çukur','Damar','Brood'],
    productionTabs: ['Tümü','Larva','Avcı','Mutasyon','Brood'],
    quickActions: [
      { k:'spawn',  l:'DOĞUR',     ico:'egg' },
      { k:'mutate', l:'MUTASYON',  ico:'helix' },
      { k:'merge',  l:'EVRİMLE',   ico:'spiral' },
    ],
    morphHint: 'GENOM', verticalFlow: 'Damar akışı',
  },
  otomat: {
    actionVerb: 'MONTAJ', productionVerb: 'DERLE', mergeVerb: 'BİRLEŞTİR',
    fieldName: 'DEVRE TABANI', catalogName: 'MODÜL ŞEMASI',
    productionName: 'AKIŞ BANDI', mergeName: 'KOMPONENT BİRLEŞTİRME',
    rosterName: 'BİRİM REGİSTRİ',
    tierKind: 'version', timeKind: 'tick',
    levelLabel: 'BUILD', statusOk: 'AKTİF', statusBuild: 'DERLENİYOR',
    buildTabs: ['Tümü','Veri','Montaj','Mantık','Subspace'],
    productionTabs: ['Tümü','Sentinel','Catapult','Phoenix','Demiurge'],
    quickActions: [
      { k:'assemble', l:'MONTAJ',   ico:'gear' },
      { k:'compile',  l:'DERLE',    ico:'cpu' },
      { k:'merge',    l:'BİRLEŞTİR', ico:'fuse' },
    ],
    morphHint: 'BLUEPRINT v', verticalFlow: 'Data akışı',
  },
  canavar: {
    actionVerb: 'KAZ', productionVerb: 'AV', mergeVerb: 'YE',
    fieldName: 'AVLAK BÖLGESİ', catalogName: 'BEDEN AĞACI',
    productionName: 'AV ROTASI', mergeName: 'YAMYAMLIK HALKASI',
    rosterName: 'SÜRÜ KAYDI',
    tierKind: 'blood', timeKind: 'phase',
    levelLabel: 'AVCI ÇAĞI', statusOk: 'UYANIK', statusBuild: 'BÜYÜYOR',
    buildTabs: ['Tümü','Av','İn','Atalar','Yarık'],
    productionTabs: ['Tümü','Avcı','Sürü','Atalar','Tanrı'],
    quickActions: [
      { k:'dig',   l:'KAZ',    ico:'claw' },
      { k:'hunt',  l:'AV',     ico:'fang' },
      { k:'eat',   l:'YE',     ico:'jaw'  },
    ],
    morphHint: 'BEDEN', verticalFlow: 'Kan akışı',
  },
  seytan: {
    actionVerb: 'PAKT YAZ', productionVerb: 'ÇAĞIR', mergeVerb: 'MÜHÜRLE',
    fieldName: 'KARANLIK MAHKEME', catalogName: 'GRİMUVA',
    productionName: 'ÇAĞIRMA RİTÜELİ', mergeName: 'PAKT MÜHRÜ',
    rosterName: 'MAHKEME SİCİLİ',
    tierKind: 'seal', timeKind: 'ritual',
    levelLabel: 'PAKT MERTEBESI', statusOk: 'MÜHÜRLÜ', statusBuild: 'AÇILIYOR',
    buildTabs: ['Tümü','Ruh','Tapınak','Pakt','Yarık'],
    productionTabs: ['Tümü','Imp','Cadı','Lord','Demon'],
    quickActions: [
      { k:'pact',  l:'PAKT',    ico:'sigil' },
      { k:'summon',l:'ÇAĞIR',   ico:'flame' },
      { k:'seal',  l:'MÜHÜRLE', ico:'rune'  },
    ],
    morphHint: 'SİGİL', verticalFlow: 'Ruh akışı',
  },
};
const LEX = (race) => RACE_LEX[race.key];

// ============================================================
// RaceTierBadge — race-specific tier indicator
// ============================================================
function RaceTierBadge({ race, tier = 1, size = 24, locked = false }) {
  const kind = LEX(race).tierKind;
  const c = locked ? 'oklch(0.55 0.02 240)' : race.primary;
  const glow = locked ? 'transparent' : race.glow;

  if (kind === 'mil') {
    // Hex chevron T1..T5 — military pip
    return (
      <svg width={size * 1.6} height={size} viewBox="0 0 32 20" style={{ display:'block' }}>
        <polygon points="4,1 28,1 32,10 28,19 4,19 0,10" fill="none" stroke={c} strokeWidth="1.2"/>
        <text x="16" y="14" textAnchor="middle" fontFamily="Chakra Petch" fontWeight="700"
          fontSize="11" fill={c} letterSpacing="1.2">T{tier}</text>
      </svg>
    );
  }
  if (kind === 'morph') {
    // Morphology silhouette — 5 evolving shapes
    const shapes = [
      <circle key="1" cx="10" cy="10" r="4" fill={c}/>,
      <g key="2"><circle cx="7" cy="10" r="3" fill={c}/><circle cx="13" cy="10" r="3" fill={c}/></g>,
      <g key="3"><circle cx="10" cy="10" r="5" fill={c}/><path d="M5 8 L 2 5 M15 8 L 18 5" stroke={c} strokeWidth="1.5"/></g>,
      <g key="4"><path d="M4 10 L 10 4 L 16 10 L 10 16 Z" fill={c}/><path d="M10 4 L 10 1 M 4 10 L 1 10 M 16 10 L 19 10 M 10 16 L 10 19" stroke={c} strokeWidth="1.2"/></g>,
      <g key="5"><path d="M10 2 L 18 8 L 16 16 L 10 18 L 4 16 L 2 8 Z" fill={c}/><circle cx="7" cy="8" r="1" fill={race.glow}/><circle cx="13" cy="8" r="1" fill={race.glow}/></g>,
    ];
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" style={{ display:'block', filter: !locked ? `drop-shadow(0 0 4px ${glow}aa)` : 'none' }}>
        {shapes[Math.max(0, Math.min(4, tier - 1))]}
      </svg>
    );
  }
  if (kind === 'version') {
    // v1.0 stamp — software-version badge
    return (
      <div style={{
        display:'inline-flex', alignItems:'center', gap:2,
        padding:'2px 5px', fontFamily:'JetBrains Mono', fontSize: size * 0.42, fontWeight:600,
        color: c, border:`1px solid ${c}`, letterSpacing:'0.06em',
        background: `${c}11`, lineHeight: 1,
      }}>v{tier}.0</div>
    );
  }
  if (kind === 'blood') {
    // Blood drop tally
    return (
      <div style={{ display:'inline-flex', gap:2, lineHeight:0 }}>
        {Array.from({ length: tier }).map((_, i) => (
          <svg key={i} width={size * 0.5} height={size * 0.7} viewBox="0 0 8 12">
            <path d="M4 0 L 7.5 7 Q 7.5 11, 4 11 Q 0.5 11, 0.5 7 Z" fill={c}
              style={{ filter: !locked ? `drop-shadow(0 0 2px ${glow})` : 'none' }}/>
          </svg>
        ))}
      </div>
    );
  }
  if (kind === 'seal') {
    // Pact seal — concentric sigil with N points
    const r = size / 2 - 1;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="0.8"/>
        <circle cx={size/2} cy={size/2} r={r - 3} fill="none" stroke={c} strokeWidth="0.5"/>
        {Array.from({ length: 3 + tier }).map((_, i) => {
          const ang = (i / (3 + tier)) * Math.PI * 2 - Math.PI / 2;
          const x = size/2 + Math.cos(ang) * (r - 2);
          const y = size/2 + Math.sin(ang) * (r - 2);
          return <circle key={i} cx={x} cy={y} r="1.4" fill={c}/>;
        })}
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          fontFamily="JetBrains Mono" fontSize="7" fill={c}>{['I','II','III','IV','V'][tier-1] || 'V'}</text>
      </svg>
    );
  }
  return null;
}

// ============================================================
// RaceTime — race-specific time / progress label
// ============================================================
function RaceTime({ race, pct = 0, eta = '00:00', state = 'progress' }) {
  const kind = LEX(race).timeKind;
  const c = race.primary;
  if (kind === 'countdown') {
    return <span style={{ fontFamily: ND.mono, fontSize: 10, color: c, letterSpacing: '0.06em' }}>⏱ {eta}</span>;
  }
  if (kind === 'embryo') {
    return <span style={{ fontFamily: ND.mono, fontSize: 10, color: c, letterSpacing: '0.06em' }}>EMBRİYO %{pct}</span>;
  }
  if (kind === 'tick') {
    const total = 360; const cur = Math.round(total * pct / 100);
    return <span style={{ fontFamily: ND.mono, fontSize: 10, color: c, letterSpacing: '0.06em' }}>TICK {cur}/{total}</span>;
  }
  if (kind === 'phase') {
    const ph = Math.min(4, Math.max(1, Math.ceil(pct / 25)));
    return <span style={{ fontFamily: ND.mono, fontSize: 10, color: c, letterSpacing: '0.06em' }}>{'◐◑◒◓'[ph-1] || '○'} AV {ph}/4</span>;
  }
  if (kind === 'ritual') {
    const sealsTotal = 7;
    const sealed = Math.round(sealsTotal * pct / 100);
    return <span style={{ fontFamily: ND.mono, fontSize: 10, color: c, letterSpacing: '0.06em' }}>{'⊕'.repeat(sealed)}{'○'.repeat(sealsTotal-sealed)}</span>;
  }
  return null;
}

// ============================================================
// RaceLevelChip — replaces flat level number with race flavor
// ============================================================
function RaceLevelChip({ race, level = 9, name = 'Metropol' }) {
  const lex = LEX(race);
  const c = race.primary;
  // İnsan: hex with rank pips
  if (race.key === 'insan') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 6px 3px 3px',
        background:`linear-gradient(180deg, ${c}28, transparent)`, border:`1px solid ${c}66`,
        clipPath:'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)' }}>
        <div style={{ width:22, height:22, background:c, color:'#0A0E1A',
          fontFamily:ND.display, fontWeight:700, fontSize:12,
          display:'flex', alignItems:'center', justifyContent:'center' }}>{level}</div>
        <div style={{ lineHeight:1.05, fontFamily:ND.display, fontSize:10, color:ND.text, letterSpacing:'0.06em', textTransform:'uppercase' }}>{name}</div>
      </div>
    );
  }
  // Zerg: pulsing organic capsule with mutation count
  if (race.key === 'zerg') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 8px 3px 4px',
        background:`radial-gradient(ellipse at left, ${c}40, transparent 70%)`,
        border:`1px solid ${c}66`,
        borderRadius:'14px 4px 14px 4px' }}>
        <div style={{ width:22, height:22, borderRadius:'50%',
          background:`radial-gradient(circle, ${race.glow}, ${c})`,
          boxShadow:`0 0 8px ${race.glow}aa, inset 0 0 4px #00000066`,
          color:'#0A0E1A', fontFamily:ND.display, fontWeight:700, fontSize:11,
          display:'flex', alignItems:'center', justifyContent:'center' }}>{level}</div>
        <div style={{ lineHeight:1.05, fontFamily:ND.display, fontSize:10, color:ND.text, letterSpacing:'0.04em' }}>
          <div style={{ opacity:0.55, fontSize:8, letterSpacing:'0.18em' }}>{lex.levelLabel}</div>
          <div style={{ textTransform:'uppercase' }}>{name}</div>
        </div>
      </div>
    );
  }
  // Otomat: version stamp + build hash
  if (race.key === 'otomat') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 6px',
        background:'rgba(8,12,26,0.8)', border:`1px solid ${c}66`,
        clipPath:'polygon(0 0, 100% 0, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}>
        <div style={{ fontFamily:ND.mono, fontWeight:700, fontSize:11, color:c }}>
          v{level}.0
        </div>
        <div style={{ lineHeight:1.05, fontFamily:ND.mono, fontSize:9, color:ND.text, letterSpacing:'0.04em' }}>
          <div style={{ opacity:0.55, fontSize:8 }}>BUILD</div>
          <div>{name.toLowerCase().replace(/\s+/g,'-')}</div>
        </div>
      </div>
    );
  }
  // Canavar: bone-carved tally
  if (race.key === 'canavar') {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 8px 3px 4px',
        background:`linear-gradient(180deg, ${c}22, transparent)`,
        border:`1px solid ${c}66`,
        borderRadius:'2px' }}>
        {/* claw mark */}
        <svg width="24" height="22" viewBox="0 0 24 22">
          <path d="M3 18 L 8 4 M 9 18 L 12 3 M 15 18 L 16 4 M 21 18 L 20 5" stroke={c} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        </svg>
        <div style={{ lineHeight:1.05, fontFamily:ND.display, fontSize:11, color:ND.text, letterSpacing:'0.06em' }}>
          <div style={{ opacity:0.55, fontSize:8, letterSpacing:'0.18em' }}>{lex.levelLabel} {level}</div>
          <div style={{ textTransform:'uppercase' }}>{name}</div>
        </div>
      </div>
    );
  }
  // Şeytan: pact seal mertebe
  if (race.key === 'seytan') {
    const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 8px 3px 4px',
        background:`radial-gradient(circle at left, ${c}33, transparent 70%)`,
        border:`1px solid ${c}66` }}>
        <div style={{ width:22, height:22, position:'relative' }}>
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="9.5" fill="none" stroke={c} strokeWidth="0.8"/>
            <polygon points="11,2 13.5,8.5 20,9 14.8,13.5 16.5,20 11,16.5 5.5,20 7.2,13.5 2,9 8.5,8.5" fill={`${c}44`} stroke={c} strokeWidth="0.5"/>
          </svg>
        </div>
        <div style={{ lineHeight:1.05, fontFamily:ND.display, fontSize:11, color:ND.text, letterSpacing:'0.06em' }}>
          <div style={{ opacity:0.55, fontSize:8, letterSpacing:'0.18em' }}>MERTEBE {romans[level-1] || level}</div>
          <div style={{ textTransform:'uppercase' }}>{name}</div>
        </div>
      </div>
    );
  }
  return null;
}

// ============================================================
// RaceResPill — race-flavored resource pill
// ============================================================
function RaceResPill({ race, kind, value, label }) {
  const c = race.primary;
  // Insan: standard pill
  if (race.key === 'insan') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 8px 4px 6px',
        background:'rgba(8,12,26,0.7)', border:`1px solid ${ND.border}`,
        clipPath:'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
        fontFamily:ND.mono, fontSize:11, color:ND.text }}>
        <ResIcon kind={kind} size={12} color={c}/>{value}
      </div>
    );
  }
  // Zerg: flowing blob with pulse
  if (race.key === 'zerg') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px 3px 7px',
        background:`linear-gradient(90deg, ${c}33, ${c}08)`,
        border:`1px solid ${c}66`,
        borderRadius:'10px 3px 10px 3px',
        fontFamily:ND.mono, fontSize:11, color:ND.text }}>
        <ResIcon kind={kind} size={12} color={c}/>{value}
      </div>
    );
  }
  // Otomat: monospace counter with hex frame
  if (race.key === 'otomat') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 6px',
        background:'rgba(8,12,26,0.85)', border:`1px solid ${c}55`,
        fontFamily:ND.mono, fontSize:11, color:ND.text, letterSpacing:'0.05em' }}>
        <ResIcon kind={kind} size={12} color={c}/>
        <span style={{ color: ND.textDim, fontSize:9 }}>{(label||'').slice(0,3).toUpperCase()}</span>{value}
      </div>
    );
  }
  // Canavar: blood-splatter, hand-drawn feel
  if (race.key === 'canavar') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px 3px 5px',
        background:'rgba(20,8,4,0.7)', border:`1px solid ${c}77`,
        borderRadius:'1px 8px 2px 6px',
        fontFamily:ND.mono, fontSize:11, color:ND.text }}>
        <ResIcon kind={kind} size={12} color={c}/>{value}
      </div>
    );
  }
  // Şeytan: candle-lit gothic
  if (race.key === 'seytan') {
    return (
      <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 8px',
        background:`linear-gradient(180deg, ${c}1c, transparent 80%)`,
        border:`1px solid ${c}66`,
        boxShadow:`inset 0 0 8px ${c}22, 0 0 4px ${race.glow}33`,
        fontFamily:ND.mono, fontSize:11, color:ND.text }}>
        <ResIcon kind={kind} size={12} color={c}/>{value}
      </div>
    );
  }
}

// ============================================================
// RaceHUD — replaces HUD with race-specific framing
// ============================================================
function RaceHUD({ race, level = 9, levelName = 'Metropol', resA = '12,480', resB = '3,210', crystal = '42' }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6,
      padding:'6px 10px',
      background:'linear-gradient(180deg, rgba(6,8,15,0.96) 0%, rgba(6,8,15,0.72) 100%)',
      borderBottom: `1px solid ${ND.border}`,
    }}>
      <RaceLevelChip race={race} level={level} name={levelName}/>
      <div style={{ flex:1 }}/>
      <RaceResPill race={race} kind={race.resourceA.icon} value={resA} label={race.resourceA.name}/>
      <RaceResPill race={race} kind={race.resourceB.icon} value={resB} label={race.resourceB.name}/>
      <RaceResPill race={race} kind="crystal" value={crystal} label="krl"/>
    </div>
  );
}

// ============================================================
// RaceTabs — tab strip with race-specific shape
// ============================================================
function RaceTabs({ race, items, active = 0, size = 'md' }) {
  const fs = size === 'sm' ? 9 : 10;
  const py = size === 'sm' ? '5px' : '6px';
  return (
    <div style={{ display:'flex', gap:4 }}>
      {items.map((t, i) => {
        const on = i === active;
        const c = race.primary;
        // shape varies per race
        let style = {
          padding:`${py} 10px`, fontFamily: ND.display, fontSize: fs, letterSpacing:'0.10em',
          color: on ? '#0A0E1A' : ND.textDim,
          background: on ? c : 'rgba(255,255,255,0.04)',
          border:`1px solid ${on ? c : ND.border}`,
          textTransform:'uppercase', cursor:'pointer', flex:'0 0 auto',
        };
        if (race.key === 'insan') style.clipPath = 'polygon(4px 0, 100% 0, 100% 100%, 0 100%, 0 4px)';
        if (race.key === 'zerg')  style.borderRadius = '12px 3px 12px 3px';
        if (race.key === 'otomat') { /* sharp */ }
        if (race.key === 'canavar') style.borderRadius = '2px 8px 1px 6px';
        if (race.key === 'seytan') style.clipPath = 'polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)';
        return <div key={t} style={style}>{t}</div>;
      })}
    </div>
  );
}

// ============================================================
// RaceTexture — subtle background texture for screens
// ============================================================
function RaceTexture({ race, opacity = 1 }) {
  const id = React.useId().replace(/:/g, '');
  if (race.key === 'insan') {
    // Grid + scanlines
    return (
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity, pointerEvents:'none' }}>
        <defs>
          <pattern id={`tx-${id}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 0 H40 M0 0 V40" stroke={race.primary} strokeWidth="0.4" opacity="0.10"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#tx-${id})`}/>
      </svg>
    );
  }
  if (race.key === 'zerg') {
    // Veins
    return (
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity, pointerEvents:'none' }} preserveAspectRatio="none" viewBox="0 0 400 800">
        <g stroke={race.primary} strokeWidth="0.8" fill="none" opacity="0.16">
          <path d="M -10 120 Q 80 80, 140 140 Q 220 200, 300 160 Q 380 130, 420 180"/>
          <path d="M -10 360 Q 100 320, 180 380 Q 280 430, 420 380"/>
          <path d="M -10 580 Q 80 540, 160 600 Q 260 650, 420 610"/>
          <path d="M 200 -10 Q 220 200, 180 380 Q 140 580, 200 810"/>
        </g>
      </svg>
    );
  }
  if (race.key === 'otomat') {
    // Tight grid + nodes
    return (
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity, pointerEvents:'none' }}>
        <defs>
          <pattern id={`tx-${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 0 H20 M0 0 V20" stroke={race.primary} strokeWidth="0.3" opacity="0.16"/>
            <circle cx="0" cy="0" r="0.8" fill={race.primary} opacity="0.40"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#tx-${id})`}/>
      </svg>
    );
  }
  if (race.key === 'canavar') {
    // Cross-hatch like parchment
    return (
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity, pointerEvents:'none' }}>
        <defs>
          <pattern id={`tx-${id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <line x1="0" y1="0" x2="0" y2="14" stroke={race.primary} strokeWidth="0.4" opacity="0.16"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#tx-${id})`}/>
      </svg>
    );
  }
  if (race.key === 'seytan') {
    // Concentric sigil dim
    return (
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity, pointerEvents:'none' }} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke={race.primary} strokeWidth="0.5" opacity="0.12">
          <circle cx="200" cy="400" r="260"/>
          <circle cx="200" cy="400" r="200"/>
          <circle cx="200" cy="400" r="140"/>
          <circle cx="200" cy="400" r="80"/>
          {Array.from({length:12}).map((_,i)=>{
            const a = (i/12)*Math.PI*2;
            const x1 = 200 + Math.cos(a)*80;
            const y1 = 400 + Math.sin(a)*80;
            const x2 = 200 + Math.cos(a)*260;
            const y2 = 400 + Math.sin(a)*260;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>;
          })}
        </g>
      </svg>
    );
  }
}

// ============================================================
// RaceQuickActions — vertical side action buttons (shape per race)
// ============================================================
function RaceQuickActions({ race }) {
  const lex = LEX(race);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {lex.quickActions.map(a => {
        let shape = {};
        if (race.key === 'insan')   shape = { clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' };
        if (race.key === 'zerg')    shape = { borderRadius: '18px 4px 18px 4px' };
        if (race.key === 'otomat')  shape = { borderRadius: '1px' };
        if (race.key === 'canavar') shape = { borderRadius: '2px 12px 2px 8px' };
        if (race.key === 'seytan')  shape = { clipPath: 'polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)' };
        return (
          <div key={a.k} style={{
            width:56, height:44, padding:'4px 0',
            background:'rgba(8,12,26,0.78)', border:`1px solid ${race.primary}77`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
            color:race.primary, ...shape,
          }}>
            <RaceActionIcon kind={a.ico} color={race.primary} size={16}/>
            <span style={{ fontFamily:ND.display, fontSize:9, letterSpacing:'0.10em' }}>{a.l}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// RaceActionIcon — small icons per race vocabulary
// ============================================================
function RaceActionIcon({ kind, color, size = 16 }) {
  const c = color;
  const s = size;
  const map = {
    // Insan
    hammer: <g><path d="M3 13 L 13 3 M 1 15 L 5 11" stroke={c} strokeWidth="1.6"/><rect x="9" y="1" width="6" height="4" stroke={c} strokeWidth="1.4" fill="none"/></g>,
    helmet: <path d="M2 9 Q 8 1, 14 9 L 14 12 L 2 12 Z M 5 12 V 14 M 11 12 V 14" stroke={c} strokeWidth="1.4" fill="none"/>,
    star:   <polygon points="8,1 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6" stroke={c} strokeWidth="1.2" fill="none"/>,
    // Zerg
    egg:    <g><ellipse cx="8" cy="9" rx="5" ry="6" stroke={c} strokeWidth="1.4" fill="none"/><circle cx="8" cy="9" r="2" fill={c}/></g>,
    helix:  <g><path d="M4 1 Q 12 5, 4 9 Q 12 13, 4 15" stroke={c} strokeWidth="1.3" fill="none"/><path d="M12 1 Q 4 5, 12 9 Q 4 13, 12 15" stroke={c} strokeWidth="1.3" fill="none"/></g>,
    spiral: <path d="M8 8 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 m -2 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 m -3 0 a 6 6 0 1 0 12 0" stroke={c} strokeWidth="1.2" fill="none"/>,
    // Otomat
    gear:   <g><circle cx="8" cy="8" r="3" fill="none" stroke={c} strokeWidth="1.4"/><g stroke={c} strokeWidth="1.4">{Array.from({length:6}).map((_,i)=>{const a=(i/6)*Math.PI*2;return <line key={i} x1={8+Math.cos(a)*4} y1={8+Math.sin(a)*4} x2={8+Math.cos(a)*6.5} y2={8+Math.sin(a)*6.5}/>;})}</g></g>,
    cpu:    <g><rect x="3" y="3" width="10" height="10" stroke={c} strokeWidth="1.4" fill="none"/><rect x="6" y="6" width="4" height="4" fill={c}/><g stroke={c} strokeWidth="1">{[0,4,8].map(i=>(<g key={i}><line x1={5+i*0} y1="1" x2={5+i*0} y2="3"/></g>))}<line x1="5" y1="1" x2="5" y2="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="11" y1="1" x2="11" y2="3"/><line x1="5" y1="13" x2="5" y2="15"/><line x1="11" y1="13" x2="11" y2="15"/></g></g>,
    fuse:   <g><circle cx="4" cy="8" r="2.5" fill="none" stroke={c} strokeWidth="1.4"/><circle cx="12" cy="8" r="2.5" fill="none" stroke={c} strokeWidth="1.4"/><line x1="6.5" y1="8" x2="9.5" y2="8" stroke={c} strokeWidth="1.4"/></g>,
    // Canavar
    claw:   <g><path d="M2 13 Q 4 4, 7 13 M 6 13 Q 8 3, 11 13 M 10 13 Q 12 4, 14 13" stroke={c} strokeWidth="1.4" fill="none"/></g>,
    fang:   <g><polygon points="3,2 6,12 5,2" fill={c}/><polygon points="11,2 10,12 13,2" fill={c}/></g>,
    jaw:    <g><path d="M2 6 Q 8 14, 14 6 M 4 6 L 5 9 M 8 6 L 8 10 M 12 6 L 11 9" stroke={c} strokeWidth="1.4" fill="none"/></g>,
    // Şeytan
    sigil:  <g><polygon points="8,1 14,12 2,12" stroke={c} strokeWidth="1.4" fill="none"/><circle cx="8" cy="9" r="2" fill={c}/></g>,
    flame:  <path d="M8 1 Q 4 6, 5 10 Q 6 13, 8 14 Q 10 13, 11 10 Q 12 6, 8 1 Z M 8 7 Q 9 10, 8 12 Q 7 10, 8 7" stroke={c} strokeWidth="1.2" fill={`${c}55`}/>,
    rune:   <g><circle cx="8" cy="8" r="6" stroke={c} strokeWidth="1.2" fill="none"/><path d="M8 3 V 13 M 4 6 L 12 10 M 12 6 L 4 10" stroke={c} strokeWidth="1.2"/></g>,
  };
  return <svg width={s} height={s} viewBox="0 0 16 16" style={{ display:'block' }}>{map[kind]}</svg>;
}

// Export
Object.assign(window, {
  RACE_LEX, LEX,
  RaceTierBadge, RaceTime, RaceLevelChip, RaceResPill, RaceHUD,
  RaceTabs, RaceTexture, RaceQuickActions, RaceActionIcon,
});
