// Nebula Dominion — Leaderboard, profile, quests, alliance, shop, settings

// 20. Leaderboard
function ScrLeaderboard({ race }) {
  const entries = [
    { rk: 1, n:'XENOMIND',       r:'zerg',    g:'142,820', tier: 6 },
    { rk: 2, n:'AURELIUS_PRIME', r:'otomat',  g:'128,440', tier: 6 },
    { rk: 3, n:'KHORVASH_X',     r:'canavar', g:'98,210',  tier: 5 },
    { rk: 4, n:'VOSS.CMD',       r:'insan',   g:'76,840',  tier: 4, self: race.key === 'insan' },
    { rk: 5, n:'MAL_BLACK',      r:'seytan',  g:'54,320',  tier: 4 },
    { rk: 6, n:'CRY-OS',         r:'otomat',  g:'42,180',  tier: 4 },
    { rk: 7, n:'BROOD-X',        r:'zerg',    g:'38,420',  tier: 3 },
    { rk: 8, n:'IRONFANG',       r:'canavar', g:'32,140',  tier: 3 },
  ];
  // Make a "you" entry for the current race always present
  const youIdx = entries.findIndex(e => e.r === race.key);
  if (youIdx >= 0) entries[youIdx].self = true;

  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>

      <div style={{ padding:'10px 14px 0' }}>
        <RaceTabs race={race} items={leaderboardTabs(race)} active={0}/>
      </div>

      {/* Top 3 podium */}
      <div style={{ padding:'14px 14px 4px', display:'flex', alignItems:'flex-end', gap: 8 }}>
        {[entries[1], entries[0], entries[2]].map((e, i) => {
          const heights = [70, 96, 56][i];
          const r = RACES[e.r];
          return (
            <div key={i} style={{ flex: 1, textAlign:'center' }}>
              <div style={{ marginBottom: 6, display:'flex', justifyContent:'center' }}>
                <Sigil race={r} size={i === 1 ? 40 : 32} glow={i === 1}/>
              </div>
              <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text, letterSpacing:'0.04em' }}>{e.n}</div>
              <Code style={{ color: r.primary }}>{e.g}</Code>
              <div style={{
                marginTop: 6, height: heights,
                background: `linear-gradient(180deg, ${r.primary}55, transparent)`,
                border:`1px solid ${r.primary}88`,
                position:'relative',
              }}>
                <div style={{
                  position:'absolute', top: 6, left: 0, right: 0, textAlign:'center',
                  fontFamily: ND.display, fontSize: 18, color: r.primary,
                }}>#{e.rk}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of list */}
      <div style={{ padding:'10px 14px 0', flex: 1, overflow:'hidden' }}>
        <Eyebrow style={{ marginBottom: 6 }}>4–8 SIRALAMASI</Eyebrow>
        <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
          {entries.slice(3).map((e, i) => {
            const r = RACES[e.r];
            return (
              <Panel key={i} race={e.self ? race : null} glow={e.self}
                style={{ padding:'8px 10px', display:'flex', gap: 10, alignItems:'center' }}>
                <div style={{ width: 20, fontFamily: ND.display, fontSize: 13, color: e.self ? race.primary : ND.textDim }}>#{e.rk}</div>
                <Sigil race={r} size={20}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text }}>
                    {e.n} {e.self && <Chip color={race.primary} style={{ marginLeft: 4 }}>SEN</Chip>}
                  </div>
                  <Code style={{ color: r.primary }}>{r.name.toUpperCase()}</Code>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 4 }}>
                  <RaceTierBadge race={r} tier={e.tier} size={16}/>
                  <div style={{ fontFamily: ND.mono, fontSize: 11, color: ND.text, minWidth: 64, textAlign:'right' }}>{e.g}</div>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'8px 14px 4px', textAlign:'center' }}>
        <Code>Haftalık liderboard · 3g 14s sonra reset</Code>
      </div>
      <BottomNav race={race} active="more"/>
    </Screen>
  );
}

function leaderboardTabs(race) {
  const map = {
    insan:   ['Galaktik','Sektör','İttifak','Irk'],
    zerg:    ['Galaktik','Sektör','Kovan','Tür'],
    otomat:  ['::global','::sector','::cluster','::class'],
    canavar: ['Avlak','Bölge','Sürü','Tür'],
    seytan:  ['Mahkeme','Bölge','Pakt','Tür'],
  };
  return map[race.key];
}

// 21. Profile
function ScrProfile({ race }) {
  const stats = [
    { l:'TOPLAM SAVAŞ', v:'184' },
    { l:'ZAFER ORANI', v:'%73' },
    { l:'KAYIP', v:'49' },
    { l:'BERABERE', v:'5' },
    { l:'EN UZUN SERİ', v:'12' },
    { l:'YOK EDİLEN', v:'8,420' },
  ];
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>

      {/* Hero header */}
      <div style={{ position:'relative', padding:'14px 14px 12px',
        background: `linear-gradient(180deg, ${race.primary}18, transparent)`,
        borderBottom:`1px solid ${race.primary}33`,
      }}>
        <div style={{ display:'flex', gap: 12, alignItems:'flex-start' }}>
          <Sigil race={race} size={60} glow/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow style={{ color: race.primary }}>{profileEyebrow(race)}</Eyebrow>
            <H2 style={{ color: ND.text, fontSize: 18, marginTop: 2 }}>{race.handle.toUpperCase()}</H2>
            <Caption style={{ fontSize: 11 }}>{race.avatar} · {race.name}</Caption>
            <div style={{ display:'flex', gap: 4, marginTop: 6, alignItems:'center' }}>
              <Chip color={race.primary}>LV 24</Chip>
              <RaceTierBadge race={race} tier={4} size={18}/>
              <Chip color={ND.warn}>★ 7</Chip>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Bar value={64} max={100} color={race.primary} height={4}
            label={`ÇAĞ 3 · SEVİYE 24 / 27`} trailing="64% sonraki seviye"/>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding:'12px 14px 0' }}>
        <Eyebrow style={{ marginBottom: 6 }}>{statsTitle(race)}</Eyebrow>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 6 }}>
          {stats.map((s, i) => (
            <Panel key={i} style={{ padding: 8, textAlign:'center' }}>
              <Eyebrow style={{ fontSize: 9 }}>{s.l}</Eyebrow>
              <div style={{ fontFamily: ND.display, fontSize: 16, color: ND.text, marginTop: 2 }}>{s.v}</div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Achievements / sigils / scars */}
      <div style={{ padding:'12px 14px 0', flex: 1, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
          <Eyebrow>{achTitle(race)}</Eyebrow>
          <Code style={{ color: race.primary }}>14 / 60</Code>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap: 5 }}>
          {Array.from({length: 18}).map((_, i) => {
            const unlocked = i < 4;
            const c = race.primary;
            // race-specific badge shape
            let style = {
              aspectRatio:'1',
              border:`1px solid ${unlocked ? c : ND.border}`,
              background: unlocked ? `${c}22` : 'rgba(10,14,28,0.6)',
              opacity: unlocked ? 1 : 0.4,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: unlocked ? c : ND.textMute,
              fontFamily: ND.display, fontSize: 10,
            };
            if (race.key === 'insan')   style.clipPath = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';
            if (race.key === 'zerg')    style.borderRadius = '50%';
            if (race.key === 'otomat')  style.borderRadius = '0';
            if (race.key === 'canavar') style.borderRadius = '2px 10px 2px 10px';
            if (race.key === 'seytan')  style.clipPath = 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)';
            const glyph = unlocked
              ? (race.key === 'seytan' ? '⊕' : race.key === 'canavar' ? '❖' : race.key === 'otomat' ? '◉' : race.key === 'zerg' ? '⬬' : '★')
              : '·';
            return <div key={i} style={style}>{glyph}</div>;
          })}
        </div>
      </div>

      <BottomNav race={race} active="more"/>
    </Screen>
  );
}

function profileEyebrow(race) {
  const map = {
    insan:'KOMUTAN DOSYASI', zerg:'KOVAN BİLİNCİ · ÖZ',
    otomat:'::pid_dossier', canavar:'AVCI SİCİLİ', seytan:'· PAKT SİCİLİ ·',
  };
  return map[race.key];
}
function statsTitle(race) {
  const map = { insan:'SAVAŞ İSTATİSTİĞİ', zerg:'KOVAN İSTATİSTİĞİ',
    otomat:'::metrics', canavar:'AV İSTATİSTİĞİ', seytan:'PAKT İSTATİSTİĞİ' };
  return map[race.key];
}
function achTitle(race) {
  const map = { insan:'BAŞARIM', zerg:'EVRİM İZLERİ',
    otomat:'::achievements', canavar:'KAN İZLERİ', seytan:'KAZANILMIŞ MÜHÜRLER' };
  return map[race.key];
}

// 22. Quests / Missions
function ScrQuests({ race }) {
  const lex = LEX(race);
  const daily = [
    { n: dailyQuest(race, 0), p: 2, t: 3, rew:'+200 XP · 50 KRT' },
    { n: dailyQuest(race, 1), p: 5, t: 5, rew:'+120 XP · 30 KRT', done: true },
    { n: dailyQuest(race, 2), p: 0, t: 1, rew:'+80 XP' },
  ];
  const weekly = [
    { n: weeklyQuest(race, 0), p: 2, t: 3, rew:'Komutan: M. Reyes' },
    { n: weeklyQuest(race, 1), p:12, t:20, rew:'+1,200 XP · 4 KRİSTAL' },
  ];
  const story = [
    { n:'Çağ 1 → Çağ 2 geçişi', p: 92, t:100, rew:'Hikaye Seti 01' },
  ];
  return (
    <Screen race={race} dim={0.7}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0' }}>
        <H3 style={{ color: ND.text }}>{questsTitle(race)}</H3>
        <Caption style={{ marginTop: 2 }}>3 günlük · 2 haftalık · 1 hikaye görevi</Caption>
      </div>

      <QuestSection race={race} title={dailyLabel(race)} sub="18s 22dk sonra reset" items={daily}/>
      <QuestSection race={race} title={weeklyLabel(race)} sub="3g 14s sonra reset" items={weekly}/>
      <QuestSection race={race} title={storyLabel(race)} sub="Çağ 1 zirvesi" items={story}/>

      <div style={{ flex: 1 }}/>
      <BottomNav race={race} active="more"/>
    </Screen>
  );
}

function QuestSection({ race, title, sub, items }) {
  return (
    <div style={{ padding:'14px 14px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
        <Eyebrow style={{ color: race.primary }}>{title}</Eyebrow>
        <Code>{sub}</Code>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
        {items.map((q, i) => {
          const pct = (q.p / q.t) * 100;
          const done = q.done || pct >= 100;
          return (
            <Panel key={i} race={done ? race : null} style={{ padding: 10, opacity: done ? 0.85 : 1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <div style={{ width: 18, height: 18, border:`1px solid ${done ? ND.ok : race.primary}`,
                    background: done ? ND.ok : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#0A0E1A', fontFamily: ND.display, fontSize: 11 }}>
                    {done ? '✓' : ''}
                  </div>
                  <div style={{ fontFamily: ND.display, fontSize: 12, color: ND.text, letterSpacing:'0.04em',
                    textDecoration: done ? 'line-through' : 'none' }}>{q.n}</div>
                </div>
                <Code style={{ color: done ? ND.ok : race.primary }}>{q.p}/{q.t}</Code>
              </div>
              <Bar value={q.p} max={q.t} color={done ? ND.ok : race.primary} height={3}/>
              <div style={{ marginTop: 6, fontFamily: ND.mono, fontSize: 10, color: ND.textDim }}>
                ÖDÜL · <span style={{ color: race.primary }}>{q.rew}</span>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function questsTitle(race) {
  const map = { insan:'GÖREVLER', zerg:'KOVAN EMİRLERİ', otomat:'::task queue',
    canavar:'AV EMİRLERİ', seytan:'PAKT ŞARTLARI' };
  return map[race.key];
}
function dailyLabel(race) {
  const map = { insan:'GÜNLÜK', zerg:'GÜNLÜK · EVRİM', otomat:'::daily_cron',
    canavar:'GÜNDÜZ AVLARI', seytan:'GÜNLÜK PAKTLAR' };
  return map[race.key];
}
function weeklyLabel(race) {
  const map = { insan:'HAFTALIK', zerg:'HAFTALIK · SÜRÜ', otomat:'::weekly_cron',
    canavar:'BÜYÜK AVLAR', seytan:'BÜYÜK PAKTLAR' };
  return map[race.key];
}
function storyLabel(race) {
  const map = { insan:'HİKAYE', zerg:'GENOM SETİ', otomat:'::build_quest',
    canavar:'SAGA', seytan:'FOLIO' };
  return map[race.key];
}
function dailyQuest(race, i) {
  const map = {
    insan:   ['3 PvE savaşı kazan','5 birim üret','Bir yapı yükselt'],
    zerg:    ['3 düşman asimile et','5 larva doğur','Bir organ büyüt'],
    otomat:  ['3 hostile ::neutralize','5 unit ::compile','1 module ::upgrade'],
    canavar: ['3 av öldür','5 yavru büyüt','Bir in kaz'],
    seytan:  ['3 pakt boz','5 ruh çağır','Bir tapınak yükselt'],
  };
  return (map[race.key] || map.insan)[i];
}
function weeklyQuest(race, i) {
  const map = {
    insan:   ['Tier 3 birim birleştir','20 PvP savaşı'],
    zerg:    ['Tier 3 mutasyon yap','20 PvP akın'],
    otomat:  ['v3.0 build ::merge','20 PvP ::deploy'],
    canavar: ['Tier 3 beden yükselt','20 PvP av'],
    seytan:  ['Tier 3 ruh füzyonu','20 PvP pakt'],
  };
  return (map[race.key] || map.insan)[i];
}

// 23. Alliance
function ScrAlliance({ race }) {
  const members = [
    { n: race.handle.toUpperCase(), role: allyRoles(race)[0], lv: 24, self: true },
    { n:'EL.CHEN',   role: allyRoles(race)[1], lv: 18 },
    { n:'M.REYES',   role: allyRoles(race)[1], lv: 14 },
    { n:'PHANTOM_K', role: allyRoles(race)[2], lv: 12 },
    { n:'NOVA_7',    role: allyRoles(race)[2], lv: 9 },
    { n:'IRIS.X',    role: allyRoles(race)[2], lv: 8 },
  ];
  const chat = [
    { u:'EL.CHEN',  t:'00:14', m:'Subspace ölçümleri stabil. Anten Tier 3\'e hazır.' },
    { u:'M.REYES',  t:'00:18', m:'Sektör 4 sınır karakolunda düşman keşif gemisi gördüm.' },
    { u: race.handle.toUpperCase(), t:'00:22', m:'Toplanma noktası ' + race.capitalBase + '. 3 saat içinde filo lazım.', self: true },
  ];
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>

      <div style={{ padding:'12px 14px', background:'rgba(8,12,26,0.6)', borderBottom:`1px solid ${ND.border}`,
        display:'flex', alignItems:'center', gap: 10 }}>
        <Sigil race={race} size={42} glow/>
        <div style={{ flex: 1 }}>
          <Eyebrow style={{ color: race.primary }}>[{race.allianceTag}] {race.allianceName.toUpperCase()}</Eyebrow>
          <H3 style={{ color: ND.text, fontSize: 13, marginTop: 2 }}>GALAKTİK SIRA #12</H3>
          <Code>6 / 30 ÜYE · 14,820 GÜÇ</Code>
        </div>
        <Chip color={race.primary}>AÇIK</Chip>
      </div>

      <div style={{ padding:'10px 14px 0' }}>
        <RaceTabs race={race} items={allianceTabs(race)} active={1} size="sm"/>
      </div>

      {/* Members brief */}
      <div style={{ padding:'10px 14px 0', display:'flex', gap: 6, overflow:'hidden' }}>
        {members.slice(0, 5).map((m, i) => (
          <div key={i} style={{ flex: 1, textAlign:'center' }}>
            <div style={{ width: 36, height: 36, margin:'0 auto', position:'relative' }}>
              <Sigil race={race} size={36}/>
              <div style={{ position:'absolute', right:-4, bottom:-4,
                background: race.primary, color:'#0A0E1A',
                fontFamily: ND.display, fontSize: 9, padding:'1px 4px' }}>{m.lv}</div>
            </div>
            <div style={{ fontFamily: ND.mono, fontSize: 9, color: ND.text, marginTop: 4, letterSpacing:'0.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {m.n}
            </div>
            <Code style={{ fontSize: 8 }}>{m.role}</Code>
          </div>
        ))}
      </div>

      <div style={{ padding:'12px 14px 0', flex: 1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <Eyebrow style={{ marginBottom: 6 }}>{chatLabel(race)}</Eyebrow>
        <div style={{ flex: 1, overflow:'hidden', display:'flex', flexDirection:'column', gap: 6 }}>
          {chat.map((c, i) => (
            <div key={i} style={{
              alignSelf: c.self ? 'flex-end' : 'flex-start',
              maxWidth:'82%',
              background: c.self ? `${race.primary}22` : 'rgba(18,24,42,0.78)',
              border: `1px solid ${c.self ? race.primary + '88' : ND.border}`,
              padding:'6px 10px',
              clipPath: c.self
                ? 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)'
                : 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap: 12, marginBottom: 2 }}>
                <Code style={{ color: race.primary }}>{c.u}</Code>
                <Code style={{ fontSize: 9 }}>{c.t}</Code>
              </div>
              <div style={{ fontFamily: ND.body, fontSize: 12, color: ND.text, lineHeight: 1.4 }}>{c.m}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'10px 14px 14px', display:'flex', gap: 6 }}>
        <Panel style={{ flex: 1, padding:'10px 12px' }}>
          <Code style={{ color: ND.textMute }}>{chatPlaceholder(race)}</Code>
        </Panel>
        <NDButton race={race} size="md">GÖNDER</NDButton>
      </div>
    </Screen>
  );
}

function allyRoles(race) {
  const map = {
    insan:   ['LİDER','OFFICER','ÜYE'],
    zerg:    ['KOVAN','BROOD','LARVA'],
    otomat:  ['::root','::admin','::user'],
    canavar: ['ALFA','BETA','SÜRÜ'],
    seytan:  ['LORD','VASSAL','BAĞLI'],
  };
  return map[race.key];
}
function allianceTabs(race) {
  const map = {
    insan:   ['Üyeler','Sohbet','Savaş','Hazine'],
    zerg:    ['Kovan','Damar','Akın','Et'],
    otomat:  ['::nodes','::log','::ops','::cache'],
    canavar: ['Sürü','Uluma','Av','Kemikler'],
    seytan:  ['Vassallar','Fısıltı','Pakt','Hazine'],
  };
  return map[race.key];
}
function chatLabel(race) {
  const map = { insan:'SOHBET', zerg:'DAMAR HABERLEŞME', otomat:'::message_log',
    canavar:'ULUMALAR', seytan:'· FISILTI ·' };
  return map[race.key];
}
function chatPlaceholder(race) {
  const map = { insan:'Mesaj yaz...', zerg:'Feromon gönder...', otomat:'::send_msg(...)',
    canavar:'Ulu...', seytan:'Fısılda...' };
  return map[race.key];
}

// 24. Shop
function ScrShop({ race }) {
  const offers = [
    { n:'Başlangıç Paketi', d:'180 kristal + 5 hızlandırma', p:'₺19',  tag:'EN İYİ' },
    { n:'Komutan Sandığı',  d:'1 Tier-3+ rastgele komutan',  p:'₺59',  tag:'YENİ' },
    { n:'Sezon Geçişi',     d:'12 hafta · özel hikaye',       p:'₺99',  tag:'SEZON' },
  ];
  const items = [
    { n:'Üretim Hızlandırma · 1s', p:'20 KRT' },
    { n:'Tam Kaynak Kapasitesi',   p:'60 KRT' },
    { n:'Kalkan · 8s',             p:'120 KRT' },
    { n:'Yeniden Adlandırma',      p:'500 KRT' },
  ];
  return (
    <Screen race={race} dim={0.6}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0' }}>
        <H3 style={{ color: ND.text }}>{shopTitle(race)}</H3>
        <Caption style={{ marginTop: 2 }}>{shopSub(race)}</Caption>
      </div>

      <div style={{ padding:'12px 14px 0' }}>
        <Eyebrow style={{ marginBottom: 6 }}>{shopFeatLabel(race)}</Eyebrow>
        <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
          {offers.map((o, i) => (
            <Panel key={i} race={i === 0 ? race : null} glow={i === 0}
              style={{ padding: 10, display:'flex', gap: 10, alignItems:'center' }}>
              <div style={{ width: 56, height: 56, border:`1px solid ${i === 0 ? race.primary : ND.borderHi}66`,
                background: `${i === 0 ? race.primary : ND.borderHi}11`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily: ND.display, fontSize: 9, color: i === 0 ? race.primary : ND.borderHi, letterSpacing:'0.12em',
              }}>
                {o.tag}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <H3 style={{ color: ND.text, fontSize: 12 }}>{o.n}</H3>
                  <Chip color={i === 0 ? race.primary : ND.borderHi}>{o.tag}</Chip>
                </div>
                <Caption style={{ fontSize: 11, marginTop: 2 }}>{o.d}</Caption>
              </div>
              <NDButton race={race} size="sm">{o.p}</NDButton>
            </Panel>
          ))}
        </div>
      </div>

      <div style={{ padding:'14px 14px 0', flex: 1, overflow:'hidden' }}>
        <Eyebrow style={{ marginBottom: 6 }}>HIZLANDIRMA & ÜTİLİTE</Eyebrow>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6 }}>
          {items.map((it, i) => (
            <Panel key={i} style={{ padding: 8 }}>
              <div style={{ width:'100%', aspectRatio:'2/1', marginBottom: 6,
                background: `${race.primary}10`,
                border:`1px dashed ${race.primary}55`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily: ND.mono, fontSize: 9, color: race.primary, letterSpacing:'0.12em' }}>
                {it.n.slice(0, 18).toUpperCase()}
              </div>
              <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text }}>{it.n}</div>
              <div style={{ marginTop: 6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <Code style={{ color: race.primary }}>{it.p}</Code>
                <div style={{ fontFamily: ND.display, fontSize: 10, color: race.primary, letterSpacing:'0.10em' }}>SATIN AL</div>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <BottomNav race={race} active="more"/>
    </Screen>
  );
}

function shopTitle(race) {
  const map = { insan:'KOZMİK MAĞAZA', zerg:'GENETİK BAZAR',
    otomat:'::marketplace', canavar:'PAZAR YERİ', seytan:'· KARANLIK BAZAR ·' };
  return map[race.key];
}
function shopSub(race) {
  const map = { insan:'Kozmik kristal ve premium içerikler',
    zerg:'Genetik madde ve evrim hızlandırıcılar',
    otomat:'::premium modules · sandbox license',
    canavar:'Kan kristali ve av kutsamaları',
    seytan:'Karanlık madde ve yasak paktlar' };
  return map[race.key];
}
function shopFeatLabel(race) {
  const map = { insan:'ÖNE ÇIKAN', zerg:'TAZE NÜMUNELER',
    otomat:'::featured', canavar:'KANLI AVANTAJLAR', seytan:'AÇIK PAKTLAR' };
  return map[race.key];
}

// 25. Settings
function ScrSettings({ race }) {
  const sections = [
    { t:'OYUN', items: [
      { l:'Bildirimler', r:'Açık' },
      { l:'Ses', r:'%75' },
      { l:'Müzik', r:'%50' },
      { l:'Titreşim', r:'Açık' },
      { l:'Grafik Kalitesi', r:'Yüksek' },
    ]},
    { t:'OYUNCU', items: [
      { l:'Komutan Adı', r: race.handle.toUpperCase() },
      { l:'Dil', r:'Türkçe' },
      { l:'Zaman Dilimi', r:'GMT+3' },
    ]},
    { t:'HESAP', items: [
      { l:'E-posta', r:`...@${race.short.toLowerCase()}-net.gx` },
      { l:'Şifre Değiştir', r:'›' },
      { l:'Verilerimi İndir', r:'›' },
    ]},
  ];
  return (
    <Screen race={race} dim={0.7}>
      <RaceHUD race={race}/>
      <div style={{ padding:'12px 14px 0' }}>
        <H3 style={{ color: ND.text }}>AYARLAR</H3>
        <Caption style={{ marginTop: 2 }}>v0.1.42 · MVP Build 0426 · {race.short}-CHANNEL</Caption>
      </div>

      <div style={{ padding:'12px 14px', flex: 1, overflow:'hidden' }}>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <Eyebrow style={{ marginBottom: 6 }}>{s.t}</Eyebrow>
            <Panel style={{ padding: 0 }}>
              {s.items.map((it, j) => (
                <div key={j} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'10px 12px',
                  borderBottom: j < s.items.length - 1 ? `1px solid ${ND.border}` : 'none',
                }}>
                  <span style={{ fontFamily: ND.body, fontSize: 12, color: ND.text }}>{it.l}</span>
                  <span style={{ fontFamily: ND.mono, fontSize: 11, color: race.primary, letterSpacing:'0.04em' }}>{it.r}</span>
                </div>
              ))}
            </Panel>
          </div>
        ))}

        <div style={{ display:'flex', gap: 8 }}>
          <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>ÇIKIŞ YAP</NDButton>
          <NDButton race={race} variant="danger" size="md" style={{ flex: 1 }}>HESABI SİL</NDButton>
        </div>
      </div>

      <BottomNav race={race} active="more"/>
    </Screen>
  );
}

Object.assign(window, { ScrLeaderboard, ScrProfile, ScrQuests, ScrAlliance, ScrShop, ScrSettings });
