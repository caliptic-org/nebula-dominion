// Nebula Dominion — World, target, battle screens (race-radical)

// 11. Galactic map — race-specific vision
function ScrGalaxyMap({ race }) {
  const enemy = RACES[race.enemyRace];
  const ownC  = race.primary;
  const stars = [
    { x: 78,  y: 180, n: 'ORIGO-3',          own: race.key,   tier: 'T2', s: 8, color: ownC },
    { x: 145, y: 210, n: race.capitalBase,   own: race.key,   tier: 'T1', s: 6, color: ownC },
    { x: 200, y: 140, n: enemy.capitalBase,  own: enemy.key,  tier: 'T3', s: 9, color: enemy.primary },
    { x: 280, y: 200, n: 'TEMPLE-2',         own: 'seytan',   tier: 'T3', s: 7, color: RACES.seytan.primary },
    { x: 105, y: 290, n: 'ARK-5',            own: race.key,   tier: 'T2', s: 6, color: ownC },
    { x: 240, y: 310, n: 'CORE-11',          own: 'otomat',   tier: 'T4', s:10, color: RACES.otomat.primary },
    { x: 175, y: 380, n: 'HOWL-1',           own: 'canavar',  tier: 'T2', s: 7, color: RACES.canavar.primary },
    { x: 80,  y: 420, n: 'FREE-3',           own: 'free',     tier: 'T1', s: 5, color: ND.textMute },
    { x: 310, y: 100, n: 'RIFT-A',           own: 'rift',     tier: '?',  s: 6, color: 'oklch(0.75 0.20 290)' },
  ];

  const lex = LEX(race);

  return (
    <Screen race={race} dim={0.4}>
      <RaceHUD race={race}/>
      <div style={{ padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center',
        background:'rgba(8,12,26,0.55)', borderBottom: `1px solid ${ND.border}` }}>
        <div>
          <Eyebrow style={{ color: ownC }}>{galaxyHeader(race)}</Eyebrow>
          <H3 style={{ color: ND.text, fontSize: 12, marginTop: 2 }}>9 SİSTEM · 3 DÜŞMAN TEMASI</H3>
        </div>
        <div style={{ display:'flex', gap: 6 }}>
          <Chip color={ownC}>{ownChipLabel(race)}</Chip>
          <Chip color={ND.textMute}>NÖTR</Chip>
        </div>
      </div>

      {/* Map canvas */}
      <div style={{ position:'relative', flex: 1, overflow:'hidden' }}>
        <RaceGalaxyVision race={race} stars={stars} selectedIdx={2}/>

        {/* Scan beam sweep — race-specific aesthetic */}
        <GalaxyScanBeam race={race}/>

        {/* Top-left filter — race-aware tab pills */}
        <div style={{ position:'absolute', top: 10, left: 10 }}>
          <RaceTabs race={race} items={galaxyFilters(race)} active={0} size="sm"/>
        </div>

        {/* Compass / legend bottom-left */}
        <div style={{ position:'absolute', bottom: 156, left: 10,
          background:'rgba(6,8,15,0.85)', border:`1px solid ${ownC}55`, padding:'6px 8px',
          boxShadow: `0 0 8px ${race.glow}22` }}>
          <Code style={{ color: ownC, fontSize: 8, letterSpacing:'0.18em' }}>{compassLabel(race)}</Code>
          <div style={{ marginTop: 4, display:'flex', alignItems:'center', gap: 10 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="14" fill="none" stroke={ownC} strokeWidth="0.6"/>
              <circle cx="17" cy="17" r="9" fill="none" stroke={`${ownC}88`} strokeWidth="0.4"/>
              <line x1="17" y1="3" x2="17" y2="7" stroke={ownC} strokeWidth="1.2"/>
              <line x1="17" y1="27" x2="17" y2="31" stroke={ownC} strokeWidth="0.6"/>
              <line x1="3" y1="17" x2="7" y2="17" stroke={ownC} strokeWidth="0.6"/>
              <line x1="27" y1="17" x2="31" y2="17" stroke={ownC} strokeWidth="0.6"/>
              <text x="17" y="14" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={ownC} fontWeight="700">N</text>
              <polygon points="17,8 14,18 20,18" fill={race.glow} className="nd-glow" style={{ color: race.glow }}/>
            </svg>
            <div style={{ fontFamily: ND.mono, fontSize: 8, color: ND.textDim, lineHeight: 1.4 }}>
              <div>X: <span style={{ color: ownC }}>+248.4</span></div>
              <div>Y: <span style={{ color: ownC }}>−112.8</span></div>
              <div>Z: <span style={{ color: ownC }}>+0.42 ly</span></div>
            </div>
          </div>
        </div>

        {/* Zoom */}
        <div style={{ position:'absolute', right: 10, top: 60, display:'flex', flexDirection:'column', gap: 4 }}>
          {['＋','−','◎'].map(s => (
            <div key={s} style={{
              width: 32, height: 32, border:`1px solid ${ownC}55`,
              background:'rgba(8,12,26,0.85)', color: ND.text,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily: ND.mono, fontSize: 14,
            }}>{s}</div>
          ))}
        </div>

        {/* Selected target card */}
        <div style={{ position:'absolute', bottom: 76, left: 10, right: 10 }}>
          <Panel race={race} glow style={{ padding: 10, display:'flex', gap: 10 }}>
            <div style={{ width: 56, height: 56, border:`1px solid ${enemy.primary}66`,
              background: `${enemy.primary}22`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <UnitSilhouette race={enemy} tier={3}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <H3 style={{ color: ND.text, fontSize: 13 }}>{enemy.capitalBase}</H3>
                <div style={{ display:'flex', alignItems:'center', gap: 4 }}>
                  <Chip color={enemy.primary}>{enemy.short}</Chip>
                  <RaceTierBadge race={enemy} tier={3} size={16}/>
                </div>
              </div>
              <Caption style={{ fontSize: 11, marginTop: 2 }}>
                Mesafe 4.2 ly · Güç 3,840 · {enemy.avatar}
              </Caption>
              <div style={{ display:'flex', gap: 6, marginTop: 8 }}>
                <NDButton race={race} size="sm">{lex.actionVerb === 'PAKT YAZ' ? 'BOZGUN' : 'SALDIR'}</NDButton>
                <NDButton race={race} variant="ghost" size="sm">KEŞFET</NDButton>
                <NDButton race={race} variant="outline" size="sm">PAKT</NDButton>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <BottomNav race={race} active="galaxy"/>
    </Screen>
  );
}

function galaxyHeader(race) {
  const map = {
    insan:   'SEKTÖR · TACTICAL OVERLAY',
    zerg:    'SEKTÖR · KOVAN AĞI · SPORE %',
    otomat:  '::sector ORIGO-OUTER · graph view',
    canavar: 'AVLAK ATLASI · ORIGO-OUTER',
    seytan:  '· BURÇLAR · MAHKEME GÖRÜŞÜ ·',
  };
  return map[race.key];
}
function ownChipLabel(race) {
  const map = { insan:'SENİN', zerg:'KOVAN', otomat:'OWNED', canavar:'AVIN', seytan:'BAĞLI' };
  return map[race.key];
}
function galaxyFilters(race) {
  const map = {
    insan:   ['Tümü','Düşman','Tarafsız','Rift'],
    zerg:    ['Tümü','Et','Kovan','Yarık'],
    otomat:  ['::all','::hostile','::free','::rift'],
    canavar: ['Tümü','Av','Sürü','Bilinmez'],
    seytan:  ['Tümü','Pakt','Av','Yarık'],
  };
  return map[race.key];
}

function compassLabel(race) {
  const map = {
    insan:'KOORDİNAT',
    zerg:'DAMAR YÖNÜ',
    otomat:'::position',
    canavar:'RÜZGAR',
    seytan:'BURÇ',
  };
  return map[race.key];
}

// Race-specific scanning beam overlay (top-down radar sweep)
function GalaxyScanBeam({ race }) {
  const c = race.primary, g = race.glow;
  // Each race has its own scan style
  if (race.key === 'insan') {
    // Horizontal scanline
    return (
      <div style={{ position:'absolute', inset: 0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', left: 0, right: 0, height: 24, top: 0,
          background:`linear-gradient(180deg, transparent, ${g}33 50%, transparent)`,
          animation:'nd-scan-y 5s linear infinite' }}/>
      </div>
    );
  }
  if (race.key === 'zerg') {
    // Spore drift cloud sweep
    return (
      <svg style={{ position:'absolute', inset: 0, pointerEvents:'none', width:'100%', height:'100%' }} viewBox="0 0 390 540" preserveAspectRatio="none">
        <g className="nd-pulse">
          <ellipse cx="195" cy="270" rx="260" ry="20" fill="none" stroke={c} strokeWidth="0.5" opacity="0.4"/>
          <ellipse cx="195" cy="270" rx="180" ry="14" fill="none" stroke={g} strokeWidth="0.4" opacity="0.5"/>
        </g>
      </svg>
    );
  }
  if (race.key === 'otomat') {
    // Rotating radar sweep arc
    return (
      <div style={{ position:'absolute', inset: 0, pointerEvents:'none', overflow:'hidden' }}>
        <svg viewBox="-100 -100 200 200" style={{ position:'absolute', left:'50%', top:'50%',
          width: 600, height: 600, marginLeft: -300, marginTop: -300, opacity: 0.65,
          animation:'nd-spin 8s linear infinite', transformOrigin:'center' }}>
          <defs>
            <radialGradient id="ga-oto-sweep" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={g} stopOpacity="0.5"/>
              <stop offset="100%" stopColor={g} stopOpacity="0"/>
            </radialGradient>
          </defs>
          <path d="M 0 0 L 100 0 A 100 100 0 0 1 0 100 Z" fill="url(#ga-oto-sweep)"/>
        </svg>
      </div>
    );
  }
  if (race.key === 'canavar') {
    // Hunting trail flicker (no continuous sweep) — just track marks fade
    return null;
  }
  if (race.key === 'seytan') {
    // Pulsing concentric breath
    return (
      <svg style={{ position:'absolute', inset: 0, pointerEvents:'none', width:'100%', height:'100%' }} viewBox="0 0 390 540" preserveAspectRatio="none">
        <g style={{ color: c }} className="nd-pulse">
          <circle cx="195" cy="270" r="240" fill="none" stroke={c} strokeWidth="0.4"/>
          <circle cx="195" cy="270" r="170" fill="none" stroke={g} strokeWidth="0.4" opacity="0.5"/>
        </g>
      </svg>
    );
  }
}

// 12. Target detail — race-flavored intel report
function ScrTargetDetail({ race }) {
  const enemy = RACES[race.enemyRace];
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>
      <div style={{ padding:'10px 14px', background:'rgba(8,12,26,0.6)', borderBottom:`1px solid ${ND.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <Code style={{ color: ND.textDim }}>← Galaksi</Code>
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginTop: 4 }}>
          <H2 style={{ color: ND.text }}>{enemy.capitalBase}</H2>
          <Chip color={enemy.primary}>{enemy.short}</Chip>
          <RaceTierBadge race={enemy} tier={3} size={18}/>
        </div>
        <Caption style={{ marginTop: 4 }}>{enemy.avatar} · Sektör ORIGO-OUTER · 4.2 ly</Caption>
      </div>

      <div style={{ padding:'12px 14px', flex: 1, overflow:'hidden' }}>
        {/* Enemy awakening preview as recon */}
        <div style={{ marginBottom: 12 }}>
          <RaceAwakeningArt race={enemy} height={140}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          {[
            { l: 'GÜÇ',     v: '3,840', c: ND.danger },
            { l: 'SAVUNMA', v: '1,920', c: race.primary },
            { l: 'GANİMET', v: 'YÜKSEK', c: ND.warn },
          ].map((s, i) => (
            <Panel key={i} style={{ padding: 8, textAlign:'center' }}>
              <Eyebrow style={{ fontSize: 9 }}>{s.l}</Eyebrow>
              <div style={{ fontFamily: ND.display, fontSize: 16, color: s.c, marginTop: 2, letterSpacing:'0.04em' }}>{s.v}</div>
            </Panel>
          ))}
        </div>

        <Eyebrow style={{ marginBottom: 6 }}>SAVUNMA · TESPİTLER</Eyebrow>
        <Panel style={{ padding: 10, marginBottom: 12 }}>
          {enemy.buildings.slice(0, 3).map((b, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'4px 0', borderBottom: i < 2 ? `1px solid ${ND.border}` : 'none' }}>
              <div>
                <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text }}>{b.n}</div>
                <Code>{b.t}</Code>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <RaceTierBadge race={enemy} tier={3 - i} size={14}/>
                <div style={{ width: 60 }}>
                  <Bar value={100 - i*22} max={100} color={enemy.primary} height={3}/>
                </div>
              </div>
            </div>
          ))}
        </Panel>

        <Eyebrow style={{ marginBottom: 6 }}>TAHMİNİ ÖDÜL</Eyebrow>
        <div style={{ display:'flex', gap: 6 }}>
          <Panel style={{ flex: 1, padding: 8, textAlign:'center' }}>
            <ResIcon kind={race.resourceA.icon} size={16} color={race.primary}/>
            <div style={{ fontFamily: ND.mono, fontSize: 12, color: ND.text, marginTop: 2 }}>+3,400</div>
            <Code style={{ fontSize: 9 }}>{race.resourceA.name}</Code>
          </Panel>
          <Panel style={{ flex: 1, padding: 8, textAlign:'center' }}>
            <ResIcon kind={race.resourceB.icon} size={16} color={race.primary}/>
            <div style={{ fontFamily: ND.mono, fontSize: 12, color: ND.text, marginTop: 2 }}>+820</div>
            <Code style={{ fontSize: 9 }}>{race.resourceB.name}</Code>
          </Panel>
          <Panel style={{ flex: 1, padding: 8, textAlign:'center' }}>
            <ResIcon kind="crystal" size={16} color="oklch(0.82 0.16 80)"/>
            <div style={{ fontFamily: ND.mono, fontSize: 12, color: ND.text, marginTop: 2 }}>+12</div>
            <Code style={{ fontSize: 9 }}>KRİSTAL</Code>
          </Panel>
        </div>
      </div>

      <div style={{ padding:'8px 14px 14px', display:'flex', gap: 8 }}>
        <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>KEŞFE GÖNDER</NDButton>
        <NDButton race={race} size="md" style={{ flex: 2 }}>SAVAŞA HAZIRLAN →</NDButton>
      </div>
    </Screen>
  );
}

// 13. Battle prep / fleet composition
function ScrBattlePrep({ race }) {
  const u = race.units;
  const fleet = [
    { n: u[0].n, t: u[0].t, ct: 24, sel: 20 },
    { n: u[1].n, t: u[1].t, ct: 12, sel: 10 },
    { n: u[2].n, t: u[2].t, ct: 6,  sel: 0  },
    { n: u[3].n, t: u[3].t, ct: 4,  sel: 3  },
    { n: u[4].n, t: u[4].t, ct: 2,  sel: 1  },
  ];
  const total = fleet.reduce((a, b) => a + b.sel, 0);
  const enemy = RACES[race.enemyRace];
  return (
    <Screen race={race} dim={0.7}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <Eyebrow style={{ color: race.primary }}>{prepHeader(race)} · {enemy.capitalBase}</Eyebrow>
          <H3 style={{ color: ND.text, marginTop: 2 }}>{prepTitle(race)}</H3>
        </div>
        <div style={{ textAlign:'right' }}>
          <Code style={{ color: race.primary, fontSize: 11 }}>GÜÇ TAHMİNİ</Code>
          <div style={{ fontFamily: ND.display, fontSize: 18, color: ND.text }}>4,120</div>
        </div>
      </div>

      {/* Win probability gauge */}
      <div style={{ padding:'10px 14px' }}>
        <Panel style={{ padding: 10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
            <Code>KAZANMA İHTİMALİ</Code>
            <div style={{ fontFamily: ND.display, color: ND.ok, fontSize: 16 }}>%68</div>
          </div>
          <div style={{ height: 6, background:'rgba(255,255,255,0.06)', position:'relative' }}>
            <div style={{ position:'absolute', inset: 0, width:'68%',
              background:`linear-gradient(90deg, ${ND.danger}, ${ND.warn}, ${ND.ok})` }}/>
            <div style={{ position:'absolute', left:'50%', top:-2, bottom:-2, width: 1, background: ND.text + '88' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 4, fontFamily: ND.mono, fontSize: 9, color: ND.textMute }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </Panel>
      </div>

      {/* Fleet roster */}
      <div style={{ padding:'0 14px', flex: 1, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
          <Eyebrow>{fleetLabel(race)}</Eyebrow>
          <Code style={{ color: race.primary }}>{total} BİRİM · {race.avatar}</Code>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
          {fleet.map((u, i) => (
            <Panel key={i} style={{ padding: 8, display:'flex', gap: 10, alignItems:'center' }}>
              <div style={{ width: 36, height: 36, border:`1px solid ${race.primary}66`,
                background: `${race.primary}11`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <RaceTierBadge race={race} tier={u.t} size={20}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{u.n}</div>
                <Code style={{ fontSize: 10 }}>×{u.ct} mevcut · ×{u.sel} seçildi</Code>
              </div>
              <div style={{ width: 90 }}>
                <Bar value={u.sel} max={u.ct} color={race.primary} height={4}/>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Commander slot */}
      <div style={{ padding:'10px 14px 0' }}>
        <Eyebrow style={{ marginBottom: 6 }}>KOMUTAN</Eyebrow>
        <Panel race={race} style={{ padding: 8, display:'flex', gap: 10, alignItems:'center' }}>
          <Sigil race={race} size={36} glow/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{race.avatar}</div>
            <Code style={{ color: race.primary }}>LV 24 · {abilityName(race)}</Code>
          </div>
          <Code>DEĞİŞTİR ›</Code>
        </Panel>
      </div>

      <div style={{ padding:'12px 14px 14px', display:'flex', gap: 8 }}>
        <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>OTOMATİK</NDButton>
        <NDButton race={race} size="md" style={{ flex: 2 }}>{prepCTA(race)}</NDButton>
      </div>
    </Screen>
  );
}

function prepHeader(race) {
  const map = { insan:'SALDIRI', zerg:'ASİMİLE AKINI', otomat:'::strike op',
    canavar:'AV BAŞLATILIR', seytan:'PAKT İHLALİ' };
  return map[race.key];
}
function prepTitle(race) {
  const map = { insan:'FİLO TANIMLA', zerg:'SÜRÜ TOPLA', otomat:'::deploy units',
    canavar:'SÜRÜ TOPLA', seytan:'VASSALLARI ÇAĞIR' };
  return map[race.key];
}
function fleetLabel(race) {
  const map = { insan:'FİLO', zerg:'SÜRÜ', otomat:'::deployment', canavar:'SÜRÜ', seytan:'VASSAL' };
  return map[race.key];
}
function abilityName(race) {
  const map = {
    insan:'Aktif yetenek: TAKTİK GRİD',
    zerg:'Aktif yetenek: FEROMON DALGA',
    otomat:'::ability: hex_lock',
    canavar:'Aktif yetenek: VAHŞİ KÜKREYİŞ',
    seytan:'Pakt: GÖLGE PERDESİ',
  };
  return map[race.key];
}
function prepCTA(race) {
  const map = { insan:'SAVAŞ BAŞLAT ▶', zerg:'AKIN BAŞLAT ▶', otomat:'::execute ▶',
    canavar:'AV BAŞLAT ▶', seytan:'PAKT BOZ ▶' };
  return map[race.key];
}

// 14. Battle in progress — race-specific battlefield
function ScrBattle({ race }) {
  const enemy = RACES[race.enemyRace];
  return (
    <Screen race={race} dim={0.4}>
      {/* Battle HUD top */}
      <div style={{ padding:'50px 12px 8px', background:'linear-gradient(180deg, rgba(0,0,0,0.85), transparent)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
            <Sigil race={race} size={22}/>
            <Code style={{ color: race.primary }}>{race.short}</Code>
          </div>
          <div style={{ fontFamily: ND.mono, fontSize: 11, color: ND.text }}>{battleClockLabel(race)}</div>
          <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
            <Code style={{ color: enemy.primary }}>{enemy.short}</Code>
            <Sigil race={enemy} size={22}/>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <Bar value={68} max={100} color={race.primary} height={5} trailing="68%"/>
          </div>
          <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text }}>VS</div>
          <div style={{ flex: 1 }}>
            <Bar value={42} max={100} color={enemy.primary} height={5} trailing="42%"/>
          </div>
        </div>
      </div>

      {/* Race-specific battlefield */}
      <div style={{ position:'relative', flex: 1, overflow:'hidden' }}>
        <RaceBattlefield race={race} enemyKey={race.enemyRace}/>

        {/* Mini-map */}
        <div style={{ position:'absolute', top: 8, left: 8,
          width: 70, height: 50, border:`1px solid ${race.primary}55`, background:'rgba(8,12,26,0.7)' }}>
          <svg width="100%" height="100%" viewBox="0 0 70 50">
            <circle cx="20" cy="38" r="2" fill={race.primary}/>
            <circle cx="25" cy="40" r="2" fill={race.primary}/>
            <circle cx="30" cy="38" r="2" fill={race.primary}/>
            <polygon points="50,10 53,16 47,16" fill={enemy.primary}/>
            <polygon points="42,12 45,18 39,18" fill={enemy.primary}/>
          </svg>
        </div>

        {/* Combat log */}
        <div style={{ position:'absolute', bottom: 90, left: 8, right: 8, maxWidth: 246 }}>
          <Panel style={{ padding: 6, fontFamily: ND.mono, fontSize: 9, color: ND.textDim, letterSpacing:'0.04em' }}>
            {combatLog(race).map((l, i) => (
              <div key={i} style={{ color: l.color }}>{l.line}</div>
            ))}
          </Panel>
        </div>

        {/* Commander ability */}
        <div style={{ position:'absolute', right: 10, bottom: 90, display:'flex', flexDirection:'column', gap: 6 }}>
          {commanderAbilities(race).map((a, i) => (
            <div key={i} style={{
              width: 52, height: 52,
              border:`1px solid ${a.ready ? race.primary : ND.border}`,
              background: a.ready ? `radial-gradient(circle, ${race.primary}44, transparent)` : 'rgba(8,12,26,0.85)',
              boxShadow: a.ready ? `0 0 12px ${race.glow}66` : 'none',
              display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
              clipPath: race.key === 'seytan'
                ? 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)'
                : 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
            }}>
              <div style={{ fontFamily: ND.display, fontSize: 10, color: a.ready ? race.primary : ND.textDim }}>{a.n}</div>
              {!a.ready && <Code style={{ fontSize: 9 }}>{a.cd}s</Code>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ padding:'8px 14px 18px', background:'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))', display:'flex', gap: 8 }}>
        <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>⏸ DURDUR</NDButton>
        <NDButton race={race} variant="outline" size="md" style={{ flex: 1 }}>2× HIZ</NDButton>
        <NDButton race={race} variant="danger" size="md" style={{ flex: 1 }}>GERİ ÇEKİL</NDButton>
      </div>
    </Screen>
  );
}

function battleClockLabel(race) {
  const map = {
    insan:'SAVAŞ · 00:42',
    zerg:'SÜRÜ DALGASI · EMBRİYO %42',
    otomat:'::tick 0042 / clk 60Hz',
    canavar:'AV ◐ FAZ 2/4',
    seytan:'RİTÜEL ⊕⊕○○○ · 2/5',
  };
  return map[race.key];
}
function combatLog(race) {
  const c = race.primary;
  if (race.key === 'insan') return [
    { line:'[00:38] Mecha-2 → Larva (HP-42)', color: ND.textDim },
    { line:'[00:39] KOMUTAN: TAKTİK GRİD', color: c },
    { line:'[00:41] Marine-7 hasar aldı (-18)', color: ND.textDim },
    { line:'[00:42] Sniper-3 düştü', color: ND.danger },
  ];
  if (race.key === 'zerg') return [
    { line:'%38 Larva ×6 → Marine (HP-42)', color: ND.textDim },
    { line:'%40 FEROMON DALGA aktif', color: c },
    { line:'%41 Bio-acid yağmuru başladı', color: ND.textDim },
    { line:'%42 +12 BİYOKÜTLE emildi', color: c },
  ];
  if (race.key === 'otomat') return [
    { line:'[tick 0038] hex(7,3) → fire(target_id=42)', color: ND.textDim },
    { line:'[tick 0040] ::hex_lock ENGAGED', color: c },
    { line:'[tick 0041] integrity::core 84%', color: ND.textDim },
    { line:'[tick 0042] log::warn cataphract::down', color: ND.danger },
  ];
  if (race.key === 'canavar') return [
    { line:'Faz 2: pençe darbesi (-42)', color: ND.textDim },
    { line:'KÜKREDİ! Tüm sürü +%18 saldırı', color: c },
    { line:'Ravenna pusudan çıktı', color: c },
    { line:'2 sürü üyesi kayıp', color: ND.danger },
  ];
  if (race.key === 'seytan') return [
    { line:'Sigil 2/5: imp sürüsü çağrıldı', color: ND.textDim },
    { line:'GÖLGE PERDESİ açıldı', color: c },
    { line:'Vorhaal düşman komutanı işaretledi', color: c },
    { line:'Lanetli Asker -3 ruh borçlandı', color: ND.danger },
  ];
}
function commanderAbilities(race) {
  const map = {
    insan: [{ n:'GRİD', cd:0, ready:true }, { n:'FİLO', cd:12, ready:false }, { n:'ULT', cd:38, ready:false }],
    zerg:  [{ n:'FEROMON', cd:0, ready:true }, { n:'SWARM', cd:14, ready:false }, { n:'MORPH', cd:42, ready:false }],
    otomat:[{ n:'LOCK', cd:0, ready:true }, { n:'BUFFER', cd:18, ready:false }, { n:'PURGE', cd:40, ready:false }],
    canavar:[{ n:'KÜKRE', cd:0, ready:true }, { n:'PUSU', cd:16, ready:false }, { n:'ATALAR', cd:44, ready:false }],
    seytan:[{ n:'PERDE', cd:0, ready:true }, { n:'PAKT', cd:20, ready:false }, { n:'LANET', cd:45, ready:false }],
  };
  return map[race.key];
}

// 15. Battle result — race-flavored victory
function ScrBattleResult({ race }) {
  const victoryLabel = {
    insan:'ZAFER', zerg:'ASİMİLASYON', otomat:'::SUCCESS',
    canavar:'AV TAMAMLANDI', seytan:'PAKT KAZANILDI',
  }[race.key];
  return (
    <Screen race={race} intensity={1.3}>
      <div style={{ flex: 1, display:'flex', flexDirection:'column', padding:'70px 18px 18px' }}>
        <div style={{ textAlign:'center', marginBottom: 16 }}>
          <Eyebrow style={{ color: race.primary, marginBottom: 4 }}>SAVAŞ TAMAMLANDI</Eyebrow>
          <H1 style={{ color: race.primary, fontSize: 36, letterSpacing:'0.22em',
            textShadow: `0 0 24px ${race.glow}aa` }}>{victoryLabel}</H1>
          <Caption style={{ marginTop: 4 }}>VEX-9 sektörü fethedildi · 2:14 sürdü</Caption>
        </div>

        {/* Score */}
        <Panel race={race} glow style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <H3 style={{ color: ND.text }}>SAVAŞ SKORU</H3>
            <div style={{ display:'flex', gap: 4 }}>
              <RaceTierBadge race={race} tier={3} size={18}/>
              <RaceTierBadge race={race} tier={3} size={18}/>
              <RaceTierBadge race={race} tier={3} size={18}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
            {[
              { l:'KAYIP VEREN',  v:'14 / 34' },
              { l:'DÜŞMAN KAYBI', v:'52 / 60' },
              { l:'HASAR ÇIKIŞ',  v:'12,840' },
              { l:'HASAR ALIŞ',   v:'4,210' },
            ].map((s, i) => (
              <div key={i}>
                <Eyebrow style={{ fontSize: 9 }}>{s.l}</Eyebrow>
                <div style={{ fontFamily: ND.display, fontSize: 14, color: ND.text, marginTop: 2 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Loot */}
        <Eyebrow style={{ marginBottom: 6 }}>{lootLabel(race)}</Eyebrow>
        <Panel style={{ padding: 12, marginBottom: 12 }}>
          {[
            { i: race.resourceA.icon, n: race.resourceA.name, v:'+3,420' },
            { i: race.resourceB.icon, n: race.resourceB.name, v:'+820' },
            { i:'crystal', n:'Kozmik Kristal', v:'+12' },
            { i:'energy',  n:'XP', v:'+1,800' },
          ].map((d, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'6px 0', borderBottom: i < 3 ? `1px solid ${ND.border}` : 'none' }}>
              <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
                <ResIcon kind={d.i} size={16} color={race.primary}/>
                <span style={{ fontFamily: ND.body, fontSize: 12, color: ND.text }}>{d.n}</span>
              </div>
              <span style={{ fontFamily: ND.mono, fontSize: 13, color: ND.ok }}>{d.v}</span>
            </div>
          ))}
        </Panel>

        {/* MVP */}
        <Eyebrow style={{ marginBottom: 6 }}>{mvpLabel(race)}</Eyebrow>
        <Panel race={race} style={{ padding: 10, display:'flex', gap: 10, alignItems:'center', marginBottom: 12 }}>
          <div style={{ width: 50, height: 50, border:`1px solid ${race.primary}66`,
            background: `${race.primary}22`,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <UnitSilhouette race={race} tier={3}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: ND.display, fontSize: 13, color: ND.text }}>{race.units[3]?.n || race.units[2].n} #4</div>
            <Code>14 kill · 0 ölüm · 4,820 hasar</Code>
          </div>
          <div style={{ fontFamily: ND.display, fontSize: 12, color: race.primary }}>+220 XP</div>
        </Panel>

        <div style={{ flex: 1 }}/>
        <div style={{ display:'flex', gap: 8 }}>
          <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>REPLAY</NDButton>
          <NDButton race={race} size="md" style={{ flex: 2 }}>DEVAM</NDButton>
        </div>
      </div>
    </Screen>
  );
}

function lootLabel(race) {
  const map = { insan:'GANİMET', zerg:'ASİMİLE EDİLDİ', otomat:'::output',
    canavar:'AVIN ETİ', seytan:'BAĞLI RUHLAR' };
  return map[race.key];
}
function mvpLabel(race) {
  const map = { insan:'SAVAŞIN YILDIZI', zerg:'EN AÇGÖZLÜ', otomat:'::top_pid',
    canavar:'AV KRALIÇESİ', seytan:'EN ÇOK PAKT BAĞLAYAN' };
  return map[race.key];
}

Object.assign(window, { ScrGalaxyMap, ScrTargetDetail, ScrBattlePrep, ScrBattle, ScrBattleResult });
