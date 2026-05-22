// Nebula Dominion — Auth & onboarding screens (race-radical)

// 01. Splash / Title — 5 versiyonu race'e göre kompoze edilir
function ScrSplash({ race }) {
  return (
    <Screen race={race} intensity={1.3}>
      {/* race-specific bg art behind everything */}
      <div style={{ position:'absolute', inset: 0, opacity: 0.62 }}>
        <RaceAwakeningArt race={race} height="100%"/>
      </div>
      {/* darken */}
      <div style={{ position:'absolute', inset: 0, background:
        'linear-gradient(180deg, rgba(3,5,11,0.4) 0%, rgba(3,5,11,0) 30%, rgba(3,5,11,0) 65%, rgba(3,5,11,0.92) 100%)' }}/>

      <div style={{ position:'relative', flex: 1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'space-between', padding:'80px 32px 60px', textAlign:'center' }}>
        <div>
          <Eyebrow style={{ color: race.primary, marginBottom: 22 }}>{splashEyebrow(race)}</Eyebrow>
          <div style={{ marginBottom: 22, display:'flex', justifyContent:'center' }}>
            <div style={{ color: race.glow }} className={splashSigilAnim(race)}>
              <Sigil race={race} size={86} glow/>
            </div>
          </div>
          <H1 style={{ fontSize: 36, color: ND.text, letterSpacing:'0.10em', marginBottom: 8,
            fontFamily: race.key === 'otomat' ? ND.mono : ND.display }}>
            {splashTitleA(race)}
          </H1>
          <H1 style={{ fontSize: 36, color: race.primary, letterSpacing:'0.36em',
            textShadow:`0 0 18px ${race.glow}80`,
            fontFamily: race.key === 'otomat' ? ND.mono : ND.display }}>
            {splashTitleB(race)}
          </H1>
          <Caption style={{ marginTop: 18, color: ND.textDim, maxWidth: 260 }}>
            {splashSubtitle(race)}
          </Caption>
        </div>
        <div style={{ width:'100%' }}>
          <NDButton race={race} size="lg" full>{splashCta(race)}</NDButton>
          <div style={{ marginTop: 12, fontFamily: ND.mono, fontSize: 10, color: ND.textMute, letterSpacing:'0.18em' }}>
            v0.1 · MVP BUILD 0426 · {race.short}-CHANNEL
          </div>
        </div>
      </div>

      {/* Race-specific corner HUD */}
      <SplashCornerHUD race={race}/>
    </Screen>
  );
}

function splashEyebrow(race) {
  const map = {
    insan:   'KOZMİK YANKI · KOLONY KANALI · ÇAĞ 0',
    zerg:    'KOZMİK YANKI · KOVAN UYANIYOR · ÇAĞ 0',
    otomat:  '::cosmic_echo · ::boot_seq=01 · ::age 0',
    canavar: 'VAHŞİ KAN UYANDI · AY 0',
    seytan:  '· KOZMİK YANKI · SÜRGÜN BİTTİ · ÇAĞ 0 ·',
  };
  return map[race.key];
}
function splashTitleA(race) {
  return race.key === 'otomat' ? 'NEBULA' : 'NEBULA';
}
function splashTitleB(race) {
  return race.key === 'otomat' ? 'DOMINION' : 'DOMINION';
}
function splashSubtitle(race) {
  const map = {
    insan:   'Beş ırk uyandı. Beş vizyon çarpıştı.\nGalaksi senin yazacağın hikaye.',
    zerg:    'Yumurta çatladı. Sürü senin uzantın.\nAsimile et, evrimi yaz.',
    otomat:  '::5 races detected · 5 logics conflict\n::write the optimal solution',
    canavar: 'Beş kan uyandı. Beş ulu yarıştı.\nGüçlü olan yönetir. Sen kimsin?',
    seytan:  'Beş sürgün döndü. Beş pakt yazıldı.\nİntikamın bedelini sen belirle.',
  };
  return map[race.key].split('\n').map((t, i) => (<React.Fragment key={i}>{t}{i === 0 && <br/>}</React.Fragment>));
}
function splashCta(race) {
  const map = {
    insan:'EVRENE GİR', zerg:'KOVAN\'A KATIL', otomat:'::initialize',
    canavar:'AV BAŞLAT', seytan:'PAKT YAZ',
  };
  return map[race.key];
}
function splashSigilAnim(race) {
  // The sigil pulses with race-specific rhythm
  const map = { insan:'nd-glow', zerg:'nd-breath', otomat:'nd-tick',
    canavar:'nd-glow', seytan:'nd-sigil' };
  return map[race.key];
}

// Corner HUD detail — different per race
function SplashCornerHUD({ race }) {
  const c = race.primary;
  if (race.key === 'insan') {
    return (
      <>
        <div style={{ position:'absolute', top: 60, left: 16, fontFamily: ND.mono, fontSize: 9, color: c + 'aa', letterSpacing:'0.18em' }}>
          SECTOR<br/>ORIGO-0
        </div>
        <div style={{ position:'absolute', top: 60, right: 16, textAlign:'right', fontFamily: ND.mono, fontSize: 9, color: c + 'aa', letterSpacing:'0.18em' }}>
          SIGNAL<br/>///<span className="nd-blink">STABLE</span>
        </div>
      </>
    );
  }
  if (race.key === 'zerg') {
    return (
      <>
        <div style={{ position:'absolute', top: 60, left: 16, fontFamily: ND.mono, fontSize: 9, color: c + 'aa', letterSpacing:'0.18em' }}>
          KOVAN<br/>BROOD-1
        </div>
        <div style={{ position:'absolute', top: 60, right: 16, textAlign:'right', fontFamily: ND.mono, fontSize: 9, color: c + 'aa', letterSpacing:'0.18em' }}>
          VİTAL<br/><span className="nd-pulse">~~ %92</span>
        </div>
      </>
    );
  }
  if (race.key === 'otomat') {
    return (
      <>
        <div style={{ position:'absolute', top: 60, left: 16, fontFamily: ND.mono, fontSize: 9, color: c + 'aa', letterSpacing:'0.16em' }}>
          ::node<br/>NODE-04
        </div>
        <div style={{ position:'absolute', top: 60, right: 16, textAlign:'right', fontFamily: ND.mono, fontSize: 9, color: c + 'aa', letterSpacing:'0.16em' }}>
          ::heartbeat<br/><span className="nd-tick">OK · OK · OK</span>
        </div>
      </>
    );
  }
  if (race.key === 'canavar') {
    return (
      <>
        <div style={{ position:'absolute', top: 60, left: 16, fontFamily: 'Chakra Petch', fontSize: 9, color: c + 'aa', letterSpacing:'0.20em' }}>
          AVLAK<br/>HOWL-1
        </div>
        <div style={{ position:'absolute', top: 60, right: 16, textAlign:'right', fontFamily: 'Chakra Petch', fontSize: 9, color: c + 'aa', letterSpacing:'0.20em' }}>
          AY<br/>DOLUNAY
        </div>
      </>
    );
  }
  if (race.key === 'seytan') {
    return (
      <>
        <div style={{ position:'absolute', top: 60, left: 16, fontFamily: 'Chakra Petch', fontSize: 9, color: c + 'aa', letterSpacing:'0.30em' }}>
          · MAHKEME ·<br/>TEMPLE-2
        </div>
        <div style={{ position:'absolute', top: 60, right: 16, textAlign:'right', fontFamily: 'Chakra Petch', fontSize: 9, color: c + 'aa', letterSpacing:'0.30em' }}>
          · MÜHÜR ·<br/><span className="nd-sigil" style={{ color: c }}>⊕ III</span>
        </div>
      </>
    );
  }
}

// Shared: race-aware background for login/register
function AuthBg({ race, opacity = 0.32 }) {
  return (
    <>
      <div style={{ position:'absolute', inset: 0, opacity }}>
        <RaceAwakeningArt race={race} height="100%"/>
      </div>
      <div style={{ position:'absolute', inset: 0, background:'linear-gradient(180deg, rgba(3,5,11,0.85) 0%, rgba(3,5,11,0.55) 35%, rgba(3,5,11,0.92) 100%)' }}/>
    </>
  );
}

// 02. Login
function ScrLogin({ race }) {
  return (
    <Screen race={race} dim={0.7}>
      <AuthBg race={race} opacity={0.28}/>
      <div style={{ position:'relative', flex: 1, display:'flex', flexDirection:'column', padding:'70px 24px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 30 }}>
          <Sigil race={race} size={32}/>
          <Eyebrow style={{ color: race.primary }}>NEBULA DOMINION</Eyebrow>
        </div>
        <H2 style={{ color: ND.text, marginBottom: 6 }}>{loginTitle(race)}</H2>
        <Caption style={{ marginBottom: 28 }}>{loginSub(race)}</Caption>

        <Eyebrow style={{ marginBottom: 6 }}>{idLabel(race)}</Eyebrow>
        <Panel style={{ padding:'12px 14px', marginBottom: 14 }}>
          <span style={{ fontFamily: ND.mono, fontSize: 13, color: ND.text }}>{race.handle}</span>
        </Panel>
        <Eyebrow style={{ marginBottom: 6 }}>{pwLabel(race)}</Eyebrow>
        <Panel style={{ padding:'12px 14px', marginBottom: 8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily: ND.mono, fontSize: 13, color: ND.text, letterSpacing:'0.3em' }}>••••••••••</span>
          <Code>GÖSTER</Code>
        </Panel>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 22 }}>
          <Code style={{ color: ND.textDim }}>☐ Beni hatırla</Code>
          <Code style={{ color: race.primary }}>{loginRecover(race)}</Code>
        </div>
        <NDButton race={race} size="lg" full>{loginCta(race)}</NDButton>
        <div style={{ display:'flex', alignItems:'center', gap: 10, margin:'20px 0' }}>
          <div style={{ flex: 1, height: 1, background: ND.border }}/>
          <Code>YA DA</Code>
          <div style={{ flex: 1, height: 1, background: ND.border }}/>
        </div>
        <NDButton race={race} variant="ghost" size="md" full>QUICK START · MİSAFİR</NDButton>
        <div style={{ flex: 1 }}/>
        <Caption style={{ textAlign:'center' }}>
          {newAccount(race)} <span style={{ color: race.primary }}>{joinCta(race)} →</span>
        </Caption>
      </div>
    </Screen>
  );
}

function loginTitle(race) {
  const map = { insan:'KOMUTAYA DÖN', zerg:'KOVAN\'A GERİ DÖN',
    otomat:'::resume_session', canavar:'SÜRÜYE GERİ DÖN', seytan:'PAKTI HATIRLA' };
  return map[race.key];
}
function loginSub(race) {
  const map = {
    insan:'Önceki imparatorluğunun bekleyen mesajları var.',
    zerg:'Kovanın seni hatırlıyor. Damarlar canlı.',
    otomat:'::cache exists · resume from last build',
    canavar:'Sürü uyumakta. Geri dön, ulu.',
    seytan:'Mühür hâlâ kanında. Geri dön.',
  };
  return map[race.key];
}
function idLabel(race) {
  const map = { insan:'OYUNCU KİMLİĞİ', zerg:'KOVAN UZANTI',
    otomat:'::process_id', canavar:'AVCI ADI', seytan:'PAKT SAHİBİ' };
  return map[race.key];
}
function pwLabel(race) {
  const map = { insan:'ŞİFRE', zerg:'FEROMON ANAHTARI',
    otomat:'::auth_token', canavar:'KAN MÜHRÜ', seytan:'GİZLİ HECE' };
  return map[race.key];
}
function loginRecover(race) {
  const map = { insan:'Şifre kaybı?', zerg:'Feromon kaybı?',
    otomat:'::reset_token', canavar:'Mühür kayıp?', seytan:'Hece unutuldu?' };
  return map[race.key];
}
function loginCta(race) {
  const map = { insan:'GİRİŞ YAP', zerg:'KOVANA BAĞLAN',
    otomat:'::login()', canavar:'SÜRÜYE GİR', seytan:'PAKTI YENİLE' };
  return map[race.key];
}
function newAccount(race) {
  const map = { insan:'Hesabın yok mu?', zerg:'Kovan üyesi değil misin?',
    otomat:'::new_process?', canavar:'Sürüsüz mü kaldın?', seytan:'Henüz pakt yok mu?' };
  return map[race.key];
}
function joinCta(race) {
  const map = { insan:'Sürüye katıl', zerg:'Kovana doğ',
    otomat:'::spawn', canavar:'Ulumayı dene', seytan:'Pakt yaz' };
  return map[race.key];
}

// 03. Register
function ScrRegister({ race }) {
  const fields = registerFields(race);
  return (
    <Screen race={race} dim={0.7}>
      <AuthBg race={race} opacity={0.22}/>
      <div style={{ position:'relative', flex: 1, display:'flex', flexDirection:'column', padding:'70px 24px 24px' }}>
        <Eyebrow style={{ color: race.primary, marginBottom: 8 }}>{registerEyebrow(race)}</Eyebrow>
        <H2 style={{ color: ND.text, marginBottom: 22 }}>{registerTitle(race)}</H2>

        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
          {fields.map((f, i) => (
            <div key={i}>
              <Eyebrow style={{ marginBottom: 6 }}>{f.l}</Eyebrow>
              <Panel style={{ padding:'11px 14px' }}>
                <span style={{ fontFamily: ND.mono, fontSize: 12, color: ND.text }}>{f.v}</span>
              </Panel>
            </div>
          ))}
        </div>

        <Panel race={race} style={{ marginTop: 18, padding: 12, display:'flex', gap: 10, alignItems:'flex-start' }}>
          <div style={{ width: 16, height: 16, border:`1px solid ${race.primary}`, marginTop: 2,
            display:'flex', alignItems:'center', justifyContent:'center', color: race.primary, fontSize: 12 }}>✓</div>
          <Caption style={{ color: ND.textDim, fontSize: 11 }}>
            {registerPolicy(race)}
          </Caption>
        </Panel>

        <div style={{ flex: 1 }}/>
        <NDButton race={race} size="lg" full>{registerCta(race)}</NDButton>
        <Caption style={{ textAlign:'center', marginTop: 14 }}>
          Zaten kimliğin var mı? <span style={{ color: race.primary }}>Giriş yap →</span>
        </Caption>
      </div>
    </Screen>
  );
}

function registerEyebrow(race) {
  const map = {
    insan:'YENİ KOMUTAN PROTOKOLÜ', zerg:'YENİ DAMAR FORMASYONU',
    otomat:'::spawn_new_process', canavar:'YENİ AVCI KAYDI', seytan:'YENİ PAKT YAZIMI',
  };
  return map[race.key];
}
function registerTitle(race) {
  const map = {
    insan:'SÜRÜYE KATIL', zerg:'KOVANA DOĞ',
    otomat:'::init self', canavar:'SÜRÜYE GİR', seytan:'PAKTI MÜHÜRLE',
  };
  return map[race.key];
}
function registerFields(race) {
  const map = {
    insan: [
      { l:'KOMUTAN ADI', v: race.handle },
      { l:'E-POSTA',     v: `${race.handle}@${race.short.toLowerCase()}-net.gx` },
      { l:'ŞİFRE',       v:'••••••••••••' },
      { l:'ŞİFRE TEKRAR', v:'••••••••••••' },
    ],
    zerg: [
      { l:'KOVAN UZANTI ADI', v: race.handle },
      { l:'FEROMON İMZASI',   v: '~~~~~ %92' },
      { l:'EVRİM SİNYALİ',    v:'•••••' },
      { l:'TEKRAR',           v:'•••••' },
    ],
    otomat: [
      { l:'::process_name', v: race.handle },
      { l:'::namespace',    v: `${race.handle}@${race.short.toLowerCase()}-net.gx` },
      { l:'::token',        v:'sha256:••••••••' },
      { l:'::token_confirm',v:'sha256:••••••••' },
    ],
    canavar: [
      { l:'AVCI ADI',     v: race.handle },
      { l:'SÜRÜ İŞARETİ', v: `${race.handle}@${race.short.toLowerCase()}-net.gx` },
      { l:'KAN MÜHRÜ',    v:'••••••' },
      { l:'TEKRAR',        v:'••••••' },
    ],
    seytan: [
      { l:'PAKT İSMİ',     v: race.handle },
      { l:'ÇAĞIRMA YOLU',  v: `${race.handle}@${race.short.toLowerCase()}-net.gx` },
      { l:'GİZLİ HECE',    v:'••••••' },
      { l:'TEKRAR',        v:'••••••' },
    ],
  };
  return map[race.key];
}
function registerPolicy(race) {
  const map = {
    insan: <>Galaktik Anlaşma'yı ve <span style={{ color: race.primary }}>Pakt Hükümlerini</span> okudum, kabul ediyorum. Her ölüm sürümü güçlendirir.</>,
    zerg:  <>Evrim Hükümlerini okudum, kovan bilincine katıldım. <span style={{ color: race.primary }}>Her kayıp, bir mutasyondur.</span></>,
    otomat:<>::accepts(galactic_treaty, terms_of_compute). <span style={{ color: race.primary }}>::error == data</span></>,
    canavar:<>Vahşi yasayı kabul ettim. <span style={{ color: race.primary }}>Güçlü yönetir. Zayıf yenir.</span></>,
    seytan:<>Pakt şartlarını kabul ettim. <span style={{ color: race.primary }}>Her güç bir borçtur.</span></>,
  };
  return map[race.key];
}
function registerCta(race) {
  const map = {
    insan:'HESABI KUR', zerg:'EMBRİYOYU DOĞUR',
    otomat:'::commit_self', canavar:'KAN MÜHÜRLE', seytan:'MÜHÜRLE',
  };
  return map[race.key];
}

// 04. Race Select — the big one
function ScrRaceSelect({ race }) {
  const all = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'].map(k => RACES[k]);
  return (
    <Screen race={race}>
      <div style={{ padding:'60px 16px 12px', textAlign:'center' }}>
        <Eyebrow style={{ color: race.primary, marginBottom: 6 }}>I. KOZMİK YANKI / İLK AŞAMA</Eyebrow>
        <H2 style={{ color: ND.text }}>IRKINI SEÇ</H2>
        <Caption style={{ marginTop: 6, color: ND.textDim }}>Bu seçim kalıcıdır. Beş yorum, beş yol.</Caption>
      </div>
      <div style={{ flex: 1, overflow:'hidden', padding:'8px 14px', display:'flex', flexDirection:'column', gap: 8 }}>
        {all.map(r => {
          const selected = r.key === race.key;
          return (
            <div key={r.key} style={{
              position:'relative',
              border:`1px solid ${selected ? r.primary : ND.border}`,
              background: selected
                ? `linear-gradient(90deg, ${r.primary}22, transparent 70%), rgba(10,14,28,0.85)`
                : 'rgba(10,14,28,0.6)',
              clipPath:'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              padding:'10px 12px',
              display:'flex', gap: 12, alignItems:'center',
              boxShadow: selected ? `0 0 0 1px ${r.primary}55, 0 0 24px -6px ${r.glow}88` : 'none',
            }}>
              <Sigil race={r} size={44} glow={selected}/>
              <div style={{ flex: 1 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap: 8 }}>
                  <H3 style={{ color: r.primary, fontSize: 13 }}>{r.name.toUpperCase()}</H3>
                  <Code style={{ fontSize: 9, color: ND.textMute }}>{r.short}-{['218','473','091','660','812'][['insan','zerg','otomat','canavar','seytan'].indexOf(r.key)]}</Code>
                </div>
                <Caption style={{ fontSize: 11, marginTop: 2 }}>{r.motto}</Caption>
                <div style={{ display:'flex', gap: 6, marginTop: 6 }}>
                  <Chip color={r.primary}>{r.resourceA.name}</Chip>
                  <Chip color={r.primary}>{r.resourceB.name}</Chip>
                </div>
              </div>
              <div style={{
                width: 24, height: 24, border:`1px solid ${selected ? r.primary : ND.border}`,
                background: selected ? r.primary : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {selected && <span style={{ color:'#0A0E1A', fontWeight: 900, fontSize: 14 }}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding:'6px 16px 32px' }}>
        <Caption style={{ textAlign:'center', marginBottom: 10 }}>
          <span style={{ color: race.primary, fontFamily: ND.display, letterSpacing:'0.12em' }}>{race.name.toUpperCase()}</span> seçildi · {race.title}
        </Caption>
        <NDButton race={race} size="lg" full>{splashCta(race)} →</NDButton>
      </div>
    </Screen>
  );
}

// 05. Race confirm — story intro (race-radical awakening art)
function ScrRaceConfirm({ race }) {
  const awakeningLabels = {
    insan:   { eyebrow:'SAHNE I · KOLONY İNİŞ',     title:'İNSANLAR İÇİN UYANIŞ' },
    zerg:    { eyebrow:'SAHNE I · YUMURTA ÇATLAR',  title:'KOVAN UYANIYOR' },
    otomat:  { eyebrow:'::SCENE 01 · FIRST BOOT',   title:'DEMIURGE PRIME AKTİF' },
    canavar: { eyebrow:'SAHNE I · İLK AV',          title:'VAHŞİ KAN UYANIR' },
    seytan:  { eyebrow:'· SAHNE I · ZİNCİR KIRILIR ·', title:'SÜRGÜN DÖNÜYOR' },
  }[race.key];
  return (
    <Screen race={race} intensity={1.4}>
      <div style={{ flex: 1, display:'flex', flexDirection:'column', padding:'60px 22px 24px' }}>
        <Eyebrow style={{ color: race.primary, marginBottom: 10 }}>{awakeningLabels.eyebrow}</Eyebrow>
        <H2 style={{ color: ND.text, marginBottom: 16, fontSize: 22 }}>{awakeningLabels.title}</H2>

        <div style={{ marginBottom: 14 }}>
          <RaceAwakeningArt race={race} height={240}/>
        </div>

        <Panel style={{ padding: 14 }}>
          <Caption style={{ color: ND.text, lineHeight: 1.6, fontSize: 13 }}>
            {race.storyAct1}
          </Caption>
          <div style={{ height: 1, background: ND.border, margin:'12px 0' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Code style={{ color: race.primary }}>{
              race.key === 'otomat' ? '::LOG-NARRATOR.v1' :
              race.key === 'seytan' ? '· KARANLIK FISILTI ·' :
              race.key === 'canavar' ? '— ATALARIN SESİ' :
              race.key === 'zerg' ? '— KOVAN BİLİNCİ' :
              '— ANLATICI'
            }</Code>
            <Code>1 / 5</Code>
          </div>
        </Panel>

        <div style={{ flex: 1 }}/>

        <div style={{ display:'flex', gap: 8, marginBottom: 12 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ flex: 1, height: 3, background: i === 1 ? race.primary : ND.border }}/>
          ))}
        </div>
        <div style={{ display:'flex', gap: 10 }}>
          <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }}>ATLA</NDButton>
          <NDButton race={race} size="md" style={{ flex: 2 }}>DEVAM ›</NDButton>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { ScrSplash, ScrLogin, ScrRegister, ScrRaceSelect, ScrRaceConfirm });
