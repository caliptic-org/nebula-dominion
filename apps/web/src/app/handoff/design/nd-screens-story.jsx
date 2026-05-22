// Nebula Dominion — Story, progression, commanders (race-radical)

// 16. Tier level-up
function ScrTierUp({ race }) {
  return (
    <Screen race={race} intensity={1.5}>
      <div style={{ flex: 1, display:'flex', flexDirection:'column', padding:'70px 22px 22px' }}>
        <RaceTierUpMoment race={race} fromLevel={8} toLevel={9} levelName="METROPOL"/>

        {/* Unlocks */}
        <Eyebrow style={{ marginBottom: 6 }}>YENİ AÇILIMLAR</Eyebrow>
        <div style={{ display:'flex', flexDirection:'column', gap: 6, marginBottom: 12 }}>
          {tierUpUnlocks(race).map((u, i) => (
            <Panel key={i} style={{ padding: 10, display:'flex', alignItems:'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, background: `${race.primary}22`,
                border: `1px solid ${race.primary}`, display:'flex',
                alignItems:'center', justifyContent:'center', color: race.primary,
                fontFamily: ND.display, fontSize: 14,
              }}>{u.glyph || '✦'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text }}>{u.n}</div>
                <Code>{u.t} · {u.d}</Code>
              </div>
            </Panel>
          ))}
        </div>

        {/* Next age preview */}
        <Eyebrow style={{ marginBottom: 6 }}>SONRAKİ · ÇAĞ 2</Eyebrow>
        <Panel race={race} glow style={{ padding: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <H3 style={{ color: ND.text }}>YILDIZ SİSTEMİ HAKİMİYETİ</H3>
            <RaceTierBadge race={race} tier={2} size={20}/>
          </div>
          <Caption style={{ marginTop: 6 }}>Ana yıldız sistemini ele geçirme dönemi. Atmosferi geçiş ve ilk yörünge yapısı. ~12-18 gün.</Caption>
        </Panel>

        <div style={{ flex: 1 }}/>
        <NDButton race={race} size="lg" full>HİKAYE SAHNESİ İZLE ▶</NDButton>
      </div>
    </Screen>
  );
}

function tierUpUnlocks(race) {
  const map = {
    insan: [
      { glyph:'✦', n:'Subspace Anteni', t:'YAPI', d:'Galaktik haritaya erişim' },
      { glyph:'⚔', n:'Genetik Savaşçı', t:'BİRİM · T4', d:'Hanedanlık zırhı' },
      { glyph:'★', n:'General Reyes', t:'KOMUTAN', d:'Eğitim hızı +18%' },
      { glyph:'▶', n:'Hikaye Seti 01', t:'SAHNE', d:'Yıldızların Mültecileri' },
    ],
    zerg: [
      { glyph:'⬬', n:'Yutucu Tümsek', t:'ORGAN', d:'Kadim güç emer' },
      { glyph:'~', n:'Beyin Kurt', t:'EVRİM · AŞ4', d:'Sürü AI puanı +20%' },
      { glyph:'⊙', n:'Genom Üstadı Threnix', t:'KOVAN UZANTI', d:'Mutasyon hızı +28%' },
      { glyph:'▶', n:'Hikaye Seti 01', t:'SAHNE', d:'Kovan Bilincinin Doğuşu' },
    ],
    otomat: [
      { glyph:'⊞', n:'Cihaz Modülü', t:'YAPI', d:'Kadim teknoloji slot' },
      { glyph:':', n:'Phoenix Komutan', t:'BUILD · v3.0', d:'Uçan komuta birimi' },
      { glyph:'∎', n:'Algoritma Şövalye Crucible', t:'PROCESS', d:'Birim hasarı +16%' },
      { glyph:'▶', n:'Build Log 01', t:'SAHNE', d:'Mantığın Yeniden Doğuşu' },
    ],
    canavar: [
      { glyph:'☥', n:'Atalar Mağarası', t:'KUTSAL', d:'Kan Özü emer' },
      { glyph:'❖', n:'Ejder Aslanı', t:'BEDEN · IV', d:'Tier-4 canavar' },
      { glyph:'☾', n:'Şaman Ulrek', t:'ATA ÇAĞIRICI', d:'Kan Özü +24%' },
      { glyph:'▶', n:'Saga 01', t:'SAHNE', d:'Vahşi Kanın Çağrısı' },
    ],
    seytan: [
      { glyph:'✦', n:'Yasak Grimuva', t:'KADİM', d:'Kadim yetenekler' },
      { glyph:'⊕', n:'Kanat Şeytanı', t:'PAKT · IV', d:'Tier-4 birim' },
      { glyph:'☩', n:'Cadı-Kraliçe Lilithra', t:'VASSAL', d:'Çağırma süresi -25%' },
      { glyph:'▶', n:'Folio 01', t:'SAHNE', d:'Sürgünden Dönüş' },
    ],
  };
  return map[race.key];
}

// 17. Story scene (cinematic viewer)
function ScrStoryScene({ race }) {
  // Currently showing set 2 (Stellar Expansion / Yıldız Açılımı)
  const setIdx = 1;
  return (
    <Screen race={race} dim={0.3}>
      <div style={{ position:'relative', flex: 1, display:'flex', flexDirection:'column' }}>
        {/* Full bleed story art for current set */}
        <div style={{ position:'absolute', inset: 0 }}>
          <RaceStoryArt race={race} setIdx={setIdx} height="100%"/>
        </div>
        <div style={{ position:'absolute', inset: 0, background:'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.92) 100%)' }}/>

        {/* Letterbox cinema bars */}
        <div style={{ position:'absolute', top: 44, left: 0, right: 0, height: 32, background:'#000', zIndex: 1 }}/>
        <div style={{ position:'absolute', bottom: 44, left: 0, right: 0, height: 16, background:'#000', zIndex: 1 }}/>

        {/* Race-specific corner ornaments */}
        <StorySceneCorners race={race}/>

        {/* Top chrome — chapter info */}
        <div style={{ position:'absolute', top: 56, left: 16, right: 16,
          display:'flex', justifyContent:'space-between', zIndex: 2 }}>
          <div>
            <Eyebrow style={{ color: race.primary }}>HİKAYE SETİ 01 · ÇAĞ 1 → ÇAĞ 2</Eyebrow>
            <div style={{ fontFamily: ND.display, fontSize: 13, color: ND.text, marginTop: 2, textShadow: '0 1px 6px #000' }}>
              {race.storyTitle.toUpperCase()}
            </div>
          </div>
          <div style={{
            padding:'4px 8px', background:'rgba(0,0,0,0.7)',
            border:`1px solid ${ND.border}`, fontFamily: ND.mono, fontSize: 10, color: ND.text,
          }}>ATLA · ⏵⏵</div>
        </div>

        {/* Subtitle CC chip */}
        <div style={{ position:'absolute', left: '50%', transform:'translateX(-50%)',
          top: 102, padding:'2px 8px', fontFamily: ND.mono, fontSize: 8, letterSpacing:'0.16em',
          color: race.primary, border: `1px solid ${race.primary}66`,
          background: 'rgba(6,8,15,0.85)', zIndex: 2 }}>
          CC · TR
        </div>

        {/* Bottom dialogue */}
        <div style={{ position:'absolute', left: 16, right: 16, bottom: 70, zIndex: 2 }}>
          <Panel style={{ padding: 16, background:'rgba(6,8,15,0.92)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
              <Eyebrow style={{ color: race.primary }}>{narratorLabel(race)}</Eyebrow>
              <Code>2 / 5</Code>
            </div>
            <div style={{ fontFamily: ND.body, fontSize: 15, color: ND.text, lineHeight: 1.5, textWrap:'pretty' }}>
              {race.storyAct2}
            </div>
            <div style={{ display:'flex', gap: 6, marginTop: 12 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 3,
                  background: i === 2 ? race.primary : (i < 2 ? race.primaryDim : ND.border) }}/>
              ))}
            </div>
          </Panel>
        </div>

        <div style={{ position:'absolute', bottom: 18, left: 0, right: 0, textAlign:'center',
          fontFamily: ND.mono, fontSize: 10, color: race.primary, letterSpacing:'0.18em', zIndex: 2 }}>
          DEVAM İÇİN DOKUN ›
        </div>
      </div>
    </Screen>
  );
}

// Race-specific corner ornaments for the cinema viewer
function StorySceneCorners({ race }) {
  const c = race.primary;
  // Top-left + top-right corner brackets, with race flavor
  return (
    <>
      {/* Top-left bracket */}
      <svg width="40" height="40" style={{ position:'absolute', top: 80, left: 10, zIndex: 2 }}>
        {race.key === 'insan' && <g stroke={c} strokeWidth="1" fill="none"><path d="M 0 4 H 22 M 4 0 V 22"/></g>}
        {race.key === 'zerg' && <g stroke={c} strokeWidth="1" fill="none"><path d="M 0 4 Q 12 4, 22 14 M 4 0 Q 4 12, 14 22"/></g>}
        {race.key === 'otomat' && <g stroke={c} strokeWidth="1" fill="none"><path d="M 0 4 H 22 M 4 0 V 22"/><circle cx="4" cy="4" r="2" fill={c}/></g>}
        {race.key === 'canavar' && <g stroke={c} strokeWidth="1.4" fill="none"><path d="M 4 24 Q 6 6, 24 4"/></g>}
        {race.key === 'seytan' && <g stroke={c} strokeWidth="0.8" fill="none"><circle cx="6" cy="6" r="4"/><path d="M 6 1 V 11 M 1 6 H 11"/></g>}
      </svg>
      {/* Top-right bracket */}
      <svg width="40" height="40" style={{ position:'absolute', top: 80, right: 10, zIndex: 2, transform:'scaleX(-1)' }}>
        {race.key === 'insan' && <g stroke={c} strokeWidth="1" fill="none"><path d="M 0 4 H 22 M 4 0 V 22"/></g>}
        {race.key === 'zerg' && <g stroke={c} strokeWidth="1" fill="none"><path d="M 0 4 Q 12 4, 22 14 M 4 0 Q 4 12, 14 22"/></g>}
        {race.key === 'otomat' && <g stroke={c} strokeWidth="1" fill="none"><path d="M 0 4 H 22 M 4 0 V 22"/><circle cx="4" cy="4" r="2" fill={c}/></g>}
        {race.key === 'canavar' && <g stroke={c} strokeWidth="1.4" fill="none"><path d="M 4 24 Q 6 6, 24 4"/></g>}
        {race.key === 'seytan' && <g stroke={c} strokeWidth="0.8" fill="none"><circle cx="6" cy="6" r="4"/><path d="M 6 1 V 11 M 1 6 H 11"/></g>}
      </svg>
    </>
  );
}

function narratorLabel(race) {
  const map = {
    insan:   '— ANLATICI',
    zerg:    '— KOVAN BİLİNCİ',
    otomat:  '::LOG-NARRATOR.v1',
    canavar: '— ATALARIN SESİ',
    seytan:  '· KARANLIK FISILTI ·',
  };
  return map[race.key];
}

// 18. Story gallery — story sets + 54-level tier path
function ScrStoryGallery({ race }) {
  const ages = STORY_SET_LABELS.map((s, i) => ({
    idx: s.idx, n: s.age, t: galleryTitle(race, i) || race.storyTitle,
    s: 5, done: i === 0 ? 5 : (i === 1 ? 3 : 0), locked: i >= 2,
  }));
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <Eyebrow style={{ color: race.primary }}>{race.name.toUpperCase()} · HİKAYE & İLERLEME</Eyebrow>
          <H3 style={{ color: ND.text, marginTop: 2 }}>5 SET · 25 SAHNE · 54 SEVİYE</H3>
        </div>
        <Code style={{ color: race.primary }}>%32 TAMAM</Code>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY:'auto', overflowX:'hidden', padding:'10px 14px 12px' }}>
        {/* Story sets section */}
        <Eyebrow style={{ marginBottom: 8 }}>HİKAYE SETLERİ</Eyebrow>
        <div style={{ display:'flex', flexDirection:'column', gap: 8, marginBottom: 18 }}>
          {ages.map((a, i) => (
            <Panel key={i} race={i === 1 ? race : null} glow={i === 1}
              style={{ padding: 8, opacity: a.locked ? 0.55 : 1 }}>
              <div style={{ display:'flex', alignItems:'stretch', gap: 10 }}>
                <div style={{ width: 88, height: 60, flexShrink: 0, overflow:'hidden',
                  border: `1px solid ${race.primary}55`, position:'relative' }}>
                  <RaceStoryArt race={race} setIdx={a.idx} height={60}/>
                  {a.locked && <div style={{ position:'absolute', inset: 0,
                    background:'rgba(6,8,15,0.78)', display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily: ND.display, fontSize: 18, color: race.primary }}>🔒</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <Eyebrow style={{ color: race.primary }}>{a.n}</Eyebrow>
                    {a.locked
                      ? <Chip>KİLİT</Chip>
                      : <Code style={{ color: race.primary }}>{a.done}/{a.s}</Code>}
                  </div>
                  <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text, marginTop: 2 }}>{a.t}</div>
                  <Code style={{ fontSize: 9, color: ND.textDim, marginTop: 2, display:'block' }}>
                    {STORY_SET_LABELS[i].short}
                  </Code>
                  <div style={{ display:'flex', gap: 3, marginTop: 4 }}>
                    {Array.from({length: a.s}).map((_, j) => (
                      <div key={j} style={{ flex: 1, height: 3,
                        background: a.locked ? ND.border : (j < a.done ? race.primary : ND.border) }}/>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        {/* 54-level tier path */}
        <Eyebrow style={{ marginBottom: 8 }}>TIER YOLU · 6 ÇAĞ × 9 SEVİYE</Eyebrow>
        <div style={{
          background: 'rgba(8,12,26,0.65)',
          border: `1px solid ${race.primary}44`,
          padding: '8px 4px',
          marginBottom: 8,
        }}>
          <RaceTierPath race={race} currentLevel={9}/>
        </div>
        <Code style={{ color: ND.textDim, textAlign:'center', display:'block' }}>
          MEVCUT: <span style={{ color: race.primary }}>LV 9 · {TIER_NAMES_54[8]}</span> · Hedef: LV 54
        </Code>
      </div>

      <BottomNav race={race} active="story"/>
    </Screen>
  );
}

function galleryTitle(race, idx) {
  const map = {
    insan:   ['Yıldızların Mültecileri','Yutucu Yıldız Hanedanlığı\'nın Doğuşu','Galaktik Federasyon','Subspace Çağı','Kozmik Miras'],
    zerg:    ['Kovan Bilincinin Doğuşu','Yıldız Tohumları','Birinci Büyük Hasat','Kozmik Bilincin Uyanışı','Evrenin Yutucusu'],
    otomat:  ['Mantığın Yeniden Doğuşu','Yıldızlar Arası Mantık','Algoritmanın Egemenliği','Boyutlar Arası Hesaplama','Evrensel Optimizasyon'],
    canavar: ['Vahşi Kanın Çağrısı','Yıldız Avı','Atalar Uyanışı','Boyutlar Arası Vahşi Av','Primordial Canavar Tanrı'],
    seytan:  ['Sürgünden Dönüş','Karanlık Mahkeme\'nin Kuruluşu','Karanlık Lordlar Çağı','Boyutlar Arası Karanlık','Sonsuz Karanlık Hükümdar'],
  };
  return (map[race.key] || [])[idx];
}

// 19. Commanders roster — race-specific cards
function ScrCommanders({ race }) {
  const cmd = race.commanders;
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0', display:'flex', justifyContent:'space-between' }}>
        <H3 style={{ color: ND.text }}>{commandersTitle(race)}</H3>
        <Code style={{ color: race.primary }}>3 / 4 AKTİF</Code>
      </div>

      {/* Primary commander */}
      <div style={{ padding:'12px 14px 0' }}>
        <RaceCommanderCard race={race} primary={true} commander={{
          n: cmd[0].n, t: cmd[0].t, lv: cmd[0].lv, tier: cmd[0].tier
        }}/>
        <div style={{ marginTop: 8 }}>
          <Bar value={64} max={100} color={race.primary} height={3}
            label={`LV ${cmd[0].lv}`} trailing="64 / 100 XP"/>
        </div>
      </div>

      <div style={{ padding:'14px 14px 0' }}>
        <Eyebrow style={{ marginBottom: 6 }}>{commandersSub(race)}</Eyebrow>
      </div>
      <div style={{ padding:'0 14px', flex: 1, overflow:'hidden', display:'flex', flexDirection:'column', gap: 6 }}>
        {cmd.slice(1).map((c, i) => {
          const locked = c.skill === 'KİLİT';
          return (
            <div key={i} style={{ opacity: locked ? 0.6 : 1, position:'relative' }}>
              <RaceCommanderCard race={race} primary={false} commander={{ n: c.n, t: c.t, lv: c.lv, tier: c.tier }}/>
              <div style={{
                position:'absolute', top: 8, right: 8,
                fontFamily: ND.mono, fontSize: 9, color: locked ? ND.textMute : race.primary }}>
                {locked ? '🔒 KİLİT' : `⚡ ${c.skill}`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding:'10px 14px 14px' }}>
        <NDButton race={race} variant="ghost" size="md" full>{commandersTreeLabel(race)} →</NDButton>
      </div>
      <BottomNav race={race} active="cmd"/>
    </Screen>
  );
}

function commandersTitle(race) {
  const map = {
    insan:   'KOMUTAN MECLİSİ',
    zerg:    'KOVAN UZANTILARI',
    otomat:  '::PROCESS REGISTRY',
    canavar: 'SÜRÜ KONSEYİ',
    seytan:  '· KARANLIK MAHKEME ·',
  };
  return map[race.key];
}
function commandersSub(race) {
  const map = {
    insan:   'YANINDA SAVAŞANLAR',
    zerg:    'KOVAN BAĞLI EVRİMLER',
    otomat:  '::child processes',
    canavar: 'BAĞLI VAHŞİLER',
    seytan:  '· BAĞLI VASSALLAR ·',
  };
  return map[race.key];
}
function commandersTreeLabel(race) {
  const map = {
    insan:   'YETENEK AĞACI',
    zerg:    'GENOM AĞACI',
    otomat:  '::dependency graph',
    canavar: 'KAN BAĞI',
    seytan:  'PAKT MERTEBELERİ',
  };
  return map[race.key];
}

Object.assign(window, { ScrTierUp, ScrStoryScene, ScrStoryGallery, ScrCommanders });
