// Nebula Dominion — Base / gameplay screens (race-radical)
// Each screen composes race-specific atoms from nd-race-atoms + nd-race-views.

const LEX_OF = (race) => RACE_LEX[race.key];

// 06. Base Home — race-specific field + HUD + sidebar + selected detail
function ScrBaseHome({ race }) {
  const lex = LEX_OF(race);
  return (
    <Screen race={race} dim={0.5}>
      <RaceHUD race={race} level={9} levelName="Metropol" resA="12,480" resB="3,210" crystal="42"/>
      {/* Tier progress sub-banner */}
      <div style={{ padding: '8px 12px', background: 'rgba(8,12,26,0.7)', borderBottom: `1px solid ${ND.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
          <Code style={{ color: race.primary }}>ÇAĞ 1 · GEZEGENSEL UYANIŞ</Code>
          <Code>9 / 9 → ÇAĞ 2</Code>
        </div>
        <Bar value={92} max={100} color={race.primary} height={3}/>
      </div>

      {/* Main field */}
      <div style={{ position:'relative', flex: 1, overflow:'hidden' }}>
        <RaceBaseField race={race} focusedIdx={1}/>

        {/* status chip */}
        <div style={{ position:'absolute', top: 12, left: 12 }}>
          <Chip color={race.primary}><span className="nd-blink" style={{ color: race.glow }}>●</span> {lex.statusOk}</Chip>
        </div>

        {/* Race-specific vitals widget */}
        <BaseVitalsWidget race={race}/>

        {/* Production toast */}
        <Panel race={race} glow style={{ position:'absolute', top: 76, right: 12, padding:'8px 10px', maxWidth: 178 }}>
          <Code style={{ color: race.primary }}>{lex.productionVerb} TAMAM</Code>
          <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text, marginTop: 2 }}>×4 {race.units[1].n}</div>
          <Bar value={100} max={100} color={race.primary} height={2}/>
        </Panel>

        {/* Selected building card */}
        <div style={{ position:'absolute', bottom: 84, left: 12, right: 12 }}>
          <Panel race={race} glow style={{ padding: 10 }}>
            <div style={{ display:'flex', gap: 10 }}>
              <div style={{ width: 64, height: 64,
                background: `linear-gradient(180deg, ${race.primary}22, transparent)`,
                border: `1px dashed ${race.primary}66`,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <UnitSilhouette race={race} tier={3}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <H3 style={{ color: ND.text, fontSize: 12 }}>{race.buildings[0].n.toUpperCase()}</H3>
                  <RaceTierBadge race={race} tier={3} size={18}/>
                </div>
                <Caption style={{ fontSize: 11, marginTop: 2 }}>{race.capitalDescription}</Caption>
                <div style={{ display:'flex', gap: 6, marginTop: 8 }}>
                  <NDButton race={race} variant="outline" size="sm">{lex.actionVerb}</NDButton>
                  <NDButton race={race} variant="ghost" size="sm">DETAY</NDButton>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Race-specific quick actions */}
        <div style={{ position:'absolute', right: 10, top: '36%' }}>
          <RaceQuickActions race={race}/>
        </div>
      </div>

      <BottomNav race={race} active="base"/>
    </Screen>
  );
}

// Race-specific vitals badge — top-right of the field
function BaseVitalsWidget({ race }) {
  const lex = LEX_OF(race);
  const c = race.primary;
  const data = {
    insan:   { title:'OPERASYONEL', a:{ l:'SEKTÖR', v:'4/4 ONLINE' }, b:{ l:'ALARM', v:'2' }, c:{ l:'KIT.', v:'%87' } },
    zerg:    { title:'KOVAN VİTAL.', a:{ l:'VİTAL', v:'%92' }, b:{ l:'LARVA', v:'1.2K' }, c:{ l:'MUT.', v:'4 HAZIR' } },
    otomat:  { title:'::system_load', a:{ l:'CPU', v:'64%' }, b:{ l:'PROC', v:'08/16' }, c:{ l:'WARN', v:'2' } },
    canavar: { title:'SÜRÜ MORALİ', a:{ l:'MORAL', v:'+18' }, b:{ l:'AV', v:'3 ✓' }, c:{ l:'AY', v:'DOLUN.' } },
    seytan:  { title:'PAKT DURUMU', a:{ l:'AKTİF', v:'VII' }, b:{ l:'RUH', v:'3 BAĞLI' }, c:{ l:'MÜHÜR', v:'✦ HAZIR' } },
  }[race.key];
  // race-specific shape
  let shape = {};
  if (race.key === 'insan')   shape = { clipPath:'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' };
  if (race.key === 'zerg')    shape = { borderRadius:'14px 4px 14px 4px' };
  if (race.key === 'otomat')  shape = { borderRadius:'0' };
  if (race.key === 'canavar') shape = { borderRadius:'2px 12px 2px 12px' };
  if (race.key === 'seytan')  shape = { clipPath:'polygon(50% 0, 100% 18%, 100% 82%, 50% 100%, 0 82%, 0 18%)' };
  return (
    <div style={{ position:'absolute', top: 12, right: 12,
      background: 'rgba(6,8,15,0.85)', border: `1px solid ${c}66`,
      padding: '6px 8px', minWidth: 142,
      boxShadow: `0 0 12px ${race.glow}33`,
      ...shape,
    }}>
      <Code style={{ color: c, fontSize: 8, letterSpacing:'0.18em' }}>{data.title}</Code>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop: 4 }}>
        {[data.a, data.b, data.c].map((d, i) => (
          <div key={i} style={{ textAlign:'center' }}>
            <div style={{ fontFamily: ND.mono, fontSize: 8, color: ND.textMute, letterSpacing:'0.10em' }}>{d.l}</div>
            <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text, letterSpacing:'0.04em', marginTop: 1 }}>{d.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 07. Build menu — race-specific catalog metaphor
function ScrBuildMenu({ race }) {
  const lex = LEX_OF(race);
  return (
    <Screen race={race} dim={0.55}>
      <RaceHUD race={race}/>
      <div style={{ flex: 1, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' }}>
        {/* Dimmed field behind */}
        <div style={{ position:'absolute', inset: 0, pointerEvents:'none', opacity: 0.22 }}>
          <RaceBaseField race={race} focusedIdx={-1}/>
        </div>

        {/* Sheet */}
        <div style={{
          marginTop: 'auto',
          background: race.key === 'seytan'
            ? 'linear-gradient(180deg, rgba(20,2,6,0.96), rgba(8,1,3,0.98))'
            : 'rgba(6,10,24,0.96)',
          borderTop: `1px solid ${race.primary}66`,
          padding:'14px 14px 22px',
          boxShadow: `0 -12px 40px ${race.glow}22`,
          position:'relative',
        }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom: 10 }}>
            <div style={{ width: 40, height: 3, background: race.primary, borderRadius: 2 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
            <H3 style={{ color: ND.text }}>{lex.catalogName}</H3>
            <Code>{lex.morphHint} · {race.buildings.filter(b=>b.locked).length} KİLİT</Code>
          </div>

          <div style={{ marginBottom: 12 }}>
            <RaceTabs race={race} items={lex.buildTabs} active={0}/>
          </div>

          <RaceBuildCatalog race={race}/>

          <div style={{ marginTop: 12, display:'flex', gap: 8 }}>
            <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>FİLTRE</NDButton>
            <NDButton race={race} size="md" style={{ flex: 2 }}>{lex.actionVerb} BAŞLAT</NDButton>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// 08. Production — race-specific flow
function ScrProduction({ race }) {
  const lex = LEX_OF(race);
  // Build a queue using race units & varying percentages
  const queue = [
    { n: `${race.units[0].n} ×8`, pct: 64,  eta: '00:12' },
    { n: `${race.units[1].n} ×4`, pct: 30,  eta: '01:20' },
    { n: `${race.units[3].n} ×2`, pct: 6,   eta: '08:00' },
  ];
  const units = race.units.slice(0, 4).map((u, i) => ({
    n: u.n, t: u.t,
    c: ['80 · 20','180 · 60','440 · 180','1,200 · 480'][i],
    time: ['00:24','01:20','04:00','12:00'][i],
  }));

  return (
    <Screen race={race} dim={0.7}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <H3 style={{ color: ND.text }}>{lex.productionName}</H3>
        <Code style={{ color: race.primary }}>3 / 5 SLOT</Code>
      </div>

      {/* race-specific flow */}
      <div style={{ padding:'10px 14px 0' }}>
        <RaceProductionFlow race={race} queue={queue}/>
      </div>

      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Eyebrow>BİRİM KÜTÜPHANESİ</Eyebrow>
        <RaceTabs race={race} items={lex.productionTabs.slice(0,4)} active={0} size="sm"/>
      </div>

      <div style={{ flex: 1, overflow:'hidden', padding:'8px 14px', display:'flex', flexDirection:'column', gap: 6 }}>
        {units.map((u, i) => (
          <Panel key={i} style={{ padding: 10, display:'flex', gap: 10, alignItems:'center' }}>
            <div style={{ width: 44, height: 44,
              background: `${race.primary}10`,
              border: `1px dashed ${race.primary}55`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <UnitSilhouette race={race} tier={u.t}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <H3 style={{ color: ND.text, fontSize: 12 }}>{u.n}</H3>
                <RaceTierBadge race={race} tier={u.t} size={16}/>
              </div>
              <div style={{ display:'flex', gap: 10, marginTop: 4 }}>
                <Code style={{ color: race.primary }}>{u.c}</Code>
                <RaceTime race={race} pct={0} eta={u.time} state="queue"/>
              </div>
            </div>
            <div style={{ display:'flex', gap: 4 }}>
              <NDButton race={race} variant="outline" size="sm">−</NDButton>
              <div style={{ fontFamily: ND.mono, fontSize: 14, color: ND.text, width: 24, textAlign:'center', alignSelf:'center' }}>1</div>
              <NDButton race={race} size="sm">＋</NDButton>
            </div>
          </Panel>
        ))}
      </div>

      <div style={{ padding:'8px 14px 14px' }}>
        <NDButton race={race} size="lg" full>
          KUYRUĞA EKLE · 80 {race.resourceA.name.toUpperCase()}
        </NDButton>
      </div>
      <BottomNav race={race} active="base"/>
    </Screen>
  );
}

// 09. Roster — race-specific tier badges + card shapes
function ScrRoster({ race }) {
  const lex = LEX_OF(race);
  return (
    <Screen race={race} dim={0.7}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between' }}>
        <H3 style={{ color: ND.text }}>{lex.rosterName}</H3>
        <Code style={{ color: race.primary }}>180 / 240 POP</Code>
      </div>

      {/* Tier filter strip — race-aware shapes */}
      <div style={{ padding:'10px 14px 0' }}>
        <div style={{ display:'flex', gap: 4 }}>
          {['TÜM', ...[1,2,3,4,5].map(t=>t)].map((t,i) => {
            const on = i === 0;
            const c = race.primary;
            let shape = {};
            if (race.key === 'insan')   shape = { clipPath: 'polygon(4px 0, 100% 0, 100% 100%, 0 100%, 0 4px)' };
            if (race.key === 'zerg')    shape = { borderRadius: '12px 3px 12px 3px' };
            if (race.key === 'canavar') shape = { borderRadius: '2px 8px 1px 6px' };
            if (race.key === 'seytan')  shape = { clipPath: 'polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)' };
            return (
              <div key={i} style={{ flex: 1, padding: '6px 0',
                textAlign:'center', fontFamily: ND.display, fontSize: 9, letterSpacing:'0.10em',
                color: on ? '#0A0E1A' : ND.textDim,
                background: on ? c : 'rgba(255,255,255,0.04)',
                border: `1px solid ${on ? c : ND.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 4,
                ...shape,
              }}>
                {typeof t === 'number'
                  ? <RaceTierBadge race={race} tier={t} size={14} locked={!on}/>
                  : <span>{t}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'10px 14px', flex: 1, overflow:'hidden' }}>
        <RaceRosterGrid race={race}/>
      </div>

      <div style={{ padding:'8px 14px 14px', display:'flex', gap: 8 }}>
        <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>{lex.mergeVerb}</NDButton>
        <NDButton race={race} size="md" style={{ flex: 1 }}>FİLO YAP</NDButton>
      </div>
      <BottomNav race={race} active="base"/>
    </Screen>
  );
}

// 10. Merge — race-specific ritual
function ScrMerge({ race }) {
  const lex = LEX_OF(race);
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between' }}>
        <H3 style={{ color: ND.text }}>{lex.mergeName}</H3>
        <Code style={{ color: race.primary }}>×3 → +1</Code>
      </div>
      <Caption style={{ padding:'4px 14px 10px' }}>{mergeHint(race)}</Caption>

      <div style={{ padding:'0 14px' }}>
        <RaceMergeRitual race={race}/>
      </div>

      {/* Source pool — generic w/ race-specific tier badges */}
      <div style={{ padding:'14px 14px 0', display:'flex', justifyContent:'space-between' }}>
        <Eyebrow>{race.key === 'canavar' ? 'AVA UYGUN BEDEN' : race.key === 'seytan' ? 'BAĞLI RUHLAR' : race.key === 'zerg' ? 'KOZA TUTAN LARVALAR' : race.key === 'otomat' ? 'MOD-A KOMPATİBL' : 'BİRLEŞİME UYGUN'}</Eyebrow>
        <div style={{ display:'flex', alignItems:'center', gap: 4 }}>
          <RaceTierBadge race={race} tier={3} size={16}/>
          <Code>· 6 ADET</Code>
        </div>
      </div>
      <div style={{ flex: 1, padding:'8px 14px', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const on = i < 3;
            const c = race.primary;
            let shape = {};
            if (race.key === 'insan')   shape = { clipPath: 'polygon(4px 0, 100% 0, 100% 100%, 0 100%, 0 4px)' };
            if (race.key === 'zerg')    shape = { borderRadius: '10px 3px 10px 3px' };
            if (race.key === 'canavar') shape = { borderRadius: '2px 8px 2px 8px' };
            if (race.key === 'seytan')  shape = { clipPath: 'polygon(50% 0, 100% 25%, 100% 100%, 0 100%, 0 25%)' };
            return (
              <div key={i} style={{
                aspectRatio: '1',
                border: `1px solid ${on ? c : ND.border}`,
                background: on ? `${c}22` : 'rgba(10,14,28,0.7)',
                position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
                ...shape,
              }}>
                <RaceTierBadge race={race} tier={3} size={20}/>
                {on && (<Chip color={c} style={{ position:'absolute', top: 2, right: 2, fontSize: 7 }}>SEÇ</Chip>)}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'8px 14px 14px', display:'flex', gap: 8 }}>
        <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>İPTAL</NDButton>
        <NDButton race={race} size="md" style={{ flex: 2 }}>
          {lex.mergeVerb} · 200 {race.resourceB.name.toUpperCase()}
        </NDButton>
      </div>
    </Screen>
  );
}

function mergeHint(race) {
  const map = {
    insan:   'Üç tier-3 askeri promosyon töreniyle bir tier-4 kaptan unvanı verirsin.',
    zerg:    'Üç larva evrim çukurunda eriyip yeni bir mutasyon formu doğurur. Genetik kazanım kalıcıdır.',
    otomat:  'Üç modülü tek bir yüksek-versiyon yapıya derler. Komponent compatibility ::OK ise birleşir.',
    canavar: 'Alfa, üç küçük canavarı yiyerek bir üst beden formuna yükselir. Yamyamlık vahşi yasadır.',
    seytan:  'Üç ruhu pakt mührüyle bağlayıp daha büyük bir varlığı çağırırsın. Ruh borçludur.',
  };
  return map[race.key];
}

Object.assign(window, { ScrBaseHome, ScrBuildMenu, ScrProduction, ScrRoster, ScrMerge });
