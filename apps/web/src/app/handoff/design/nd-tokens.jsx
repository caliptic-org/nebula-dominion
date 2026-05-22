// Nebula Dominion — Design tokens, shared atoms, race themes

// ---------- Race themes ----------
const RACES = {
  insan: {
    key: 'insan',
    name: 'İnsanlar',
    short: 'İNS',
    motto: 'Bilim · İrade · Kardeşlik',
    primary: 'oklch(0.82 0.16 80)',     // gold
    primaryDim: 'oklch(0.62 0.13 80)',
    glow: 'oklch(0.85 0.18 80)',
    sigil: 'TRIDENT',
    resourceA: { name: 'Kredi', icon: 'cred' },
    resourceB: { name: 'Bilim', icon: 'sci' },
    avatar: 'Kmt. A. Voss',
    title: 'Yutucu Yıldız Varisi',
    handle: 'voss.cmd',
    allianceTag: 'YZH',
    allianceName: 'Yutucu Yıldız Hanedanlığı',
    capitalBase: 'KAEL-7',
    enemyRace: 'zerg',          // who they encounter in screens
    units: [
      { n: 'Marine',          t: 1 },
      { n: 'Sniper',          t: 2 },
      { n: 'Engineer',        t: 2 },
      { n: 'Mecha Walker',    t: 3 },
      { n: 'Genetic Warrior', t: 4 },
      { n: 'Captain',         t: 5 },
    ],
    buildings: [
      { n: 'Komuta Üssü',     t: 'Ana yapı',          locked: false },
      { n: 'Reaktör Modülü',  t: 'Enerji üretir',     locked: false },
      { n: 'Kışla',           t: 'Birim eğitimi',     locked: false },
      { n: 'Bilim Akademisi', t: 'Araştırma',         locked: false },
      { n: 'Subspace Anteni', t: 'Galaksi haberleşmesi', locked: true },
      { n: 'Genetik Lab',     t: 'Tier-4 birimleri',  locked: true },
    ],
    commanders: [
      { n: 'Kmt. Aleksander Voss', t: 'Genetik Savaşçı', lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm filo +12% hasar' },
      { n: 'Dr. Elara Chen',       t: 'Baş Bilim Adamı', lv: 14, tier: 'TIER 2', skill: 'Bilim +22%' },
      { n: 'General Marcus Reyes', t: 'Askeri Komutan',  lv: 9,  tier: 'TIER 3', skill: 'Eğitim hızı +18%' },
      { n: "Lily 'Phantom' Kovacs", t: 'İstihbarat',     lv: 0,  tier: 'TIER 4', skill: 'KİLİT' },
    ],
    storyTitle: 'Yıldızların Mültecileri',
    storyAct1: '"Eski Dünya öldü. Sen küllerden yeni bir başlangıç çıkaracaktın."',
    storyAct2: '"Eski uygarlığın kayıp teknolojisi yeniden uyandı. Genetik Savaşçı doğdu."',
    capitalDescription: 'Komuta üssü · birim üretim hızı +18%',
    seasonGoal: 'GALAKTİK FEDERASYON',
  },
  zerg: {
    key: 'zerg',
    name: 'Zergler',
    short: 'ZRG',
    motto: 'Asimile · Evrim · Sürü',
    primary: 'oklch(0.66 0.24 340)',
    primaryDim: 'oklch(0.48 0.18 340)',
    glow: 'oklch(0.72 0.26 340)',
    sigil: 'HIVE',
    resourceA: { name: 'Biyokütle', icon: 'bio' },
    resourceB: { name: 'Genetik', icon: 'gen' },
    avatar: 'Ana Krl. Vex’thara',
    title: 'Yutucu Kraliçe',
    handle: 'vex.brood',
    allianceTag: 'KVN',
    allianceName: 'Kovan Bilinci',
    capitalBase: 'BROOD-1',
    enemyRace: 'insan',
    units: [
      { n: 'Larva',           t: 1 },
      { n: 'Pençeli Avcı',    t: 2 },
      { n: 'Tüneli Yutan',    t: 2 },
      { n: 'Mutasyon Lord',   t: 3 },
      { n: 'Mega Lokost',     t: 4 },
      { n: 'Beyin Kurt',      t: 5 },
    ],
    buildings: [
      { n: 'Kovan Çekirdeği', t: 'Ana yapı',          locked: false },
      { n: 'Biyokütle Havuzu', t: 'Kaynak depo',       locked: false },
      { n: 'Mutasyon Çukuru', t: 'Birim üretimi',     locked: false },
      { n: 'Genom Tümseği',   t: 'Mutasyon hızı',     locked: false },
      { n: 'Yutucu Tümsek',   t: 'Kadim güç emme',    locked: true },
      { n: 'Subspace Damarı', t: 'Boyut seyahati',    locked: true },
    ],
    commanders: [
      { n: 'Ana Kraliçe Vex’thara', t: 'Kovan Bilinci',  lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm sürü +14% saldırı' },
      { n: 'Genom Üstadı Threnix',  t: 'Evrim Mühendisi', lv: 14, tier: 'TIER 3', skill: 'Mutasyon hızı +28%' },
      { n: 'Beyin Kurt Mor’gath',   t: 'Strateji',        lv: 9,  tier: 'TIER 4', skill: 'AI saldırı puanı +20%' },
      { n: 'Brood-Anne Kthala',     t: 'Üretim Lordu',    lv: 0,  tier: 'TIER 5', skill: 'KİLİT' },
    ],
    storyTitle: 'Kovan Bilincinin Doğuşu',
    storyAct1: '"Yutucu Kurt enerjisinin ilk dalgası dünyanı vurduğunda, derinlerdeki yumurta uyandı."',
    storyAct2: '"Sürü senin uzantın oldu. Her bilinç bir tek varlığın parçasıydı."',
    capitalDescription: 'Kovan kalbi · biyokütle akışı +22%',
    seasonGoal: 'GALAKTİK ASİMİLASYON',
  },
  otomat: {
    key: 'otomat',
    name: 'Otomatlar',
    short: 'OTO',
    motto: 'Mantık · Optimizasyon · Ağ',
    primary: 'oklch(0.78 0.16 220)',
    primaryDim: 'oklch(0.58 0.13 220)',
    glow: 'oklch(0.82 0.18 220)',
    sigil: 'CORE',
    resourceA: { name: 'Mineral', icon: 'min' },
    resourceB: { name: 'Hesap', icon: 'cpu' },
    avatar: 'Demiurge Prime',
    title: 'Sonsuz Mantık Demiurge',
    handle: 'demiurge.pr',
    allianceTag: 'AĞ',
    allianceName: 'Sonsuzluk Ağı',
    capitalBase: 'NODE-04',
    enemyRace: 'canavar',
    units: [
      { n: 'Sentinel',        t: 1 },
      { n: 'Drone Operatör',  t: 2 },
      { n: 'Cataphract',      t: 3 },
      { n: 'Phoenix Komutan', t: 3 },
      { n: 'Yargı Çekirdek',  t: 4 },
      { n: 'Demiurge Birimi', t: 5 },
    ],
    buildings: [
      { n: 'Sonsuzluk Çekirdeği', t: 'Ana yapı',         locked: false },
      { n: 'Veri Kaynağı',        t: 'Hesap üretir',     locked: false },
      { n: 'Montaj Hattı',        t: 'Birim üretimi',    locked: false },
      { n: 'Mantık Matrisi',      t: 'Araştırma',        locked: false },
      { n: 'Cihaz Hazinesi',      t: 'Kadim teknoloji',  locked: true },
      { n: 'Subspace Çözücü',     t: 'Boyutlar arası',   locked: true },
    ],
    commanders: [
      { n: 'Demiurge Prime',     t: 'Merkez YZ',     lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Tüm üretim +10%' },
      { n: 'Mimar Aurelius',     t: 'Yapı Lordu',    lv: 14, tier: 'TIER 2', skill: 'İnşaa süresi -22%' },
      { n: 'Alg. Şövalye Crucible', t: 'Savaş Komutanı', lv: 9, tier: 'TIER 3', skill: 'Birim hasarı +16%' },
      { n: 'Lo-Khode Veri-Mühendis', t: 'Sistem Yönetici', lv: 0, tier: 'TIER 4', skill: 'KİLİT' },
    ],
    storyTitle: 'Mantığın Yeniden Doğuşu',
    storyAct1: '"Yutucu Kurt enerjisi eski yaratıcıların kalıntılarını uyandırdı. Sen ilk düşünen varlıktın."',
    storyAct2: '"Mükemmellik amaç değildi. Mükemmellik başlangıçtı."',
    capitalDescription: 'Çekirdek modülü · hesaplama kapasitesi +18%',
    seasonGoal: 'EVRENSEL OPTİMİZASYON',
  },
  canavar: {
    key: 'canavar',
    name: 'Canavarlar',
    short: 'CNV',
    motto: 'Güç · İçgüdü · Hiyerarşi',
    primary: 'oklch(0.72 0.18 50)',
    primaryDim: 'oklch(0.52 0.14 50)',
    glow: 'oklch(0.78 0.20 50)',
    sigil: 'FANG',
    resourceA: { name: 'Vahşi Et', icon: 'meat' },
    resourceB: { name: 'Kan Özü', icon: 'blood' },
    avatar: 'Alpha Khorvash',
    title: 'Primordial Canavar Tanrı',
    handle: 'khorvash.a',
    allianceTag: 'SRÜ',
    allianceName: 'Khorvash Sürüsü',
    capitalBase: 'HOWL-1',
    enemyRace: 'otomat',
    units: [
      { n: 'Howler',          t: 1 },
      { n: 'Yelmik Avcı',     t: 2 },
      { n: 'Fırtına Boğası',  t: 3 },
      { n: 'Ejder Aslanı',    t: 4 },
      { n: 'Atavar Ruhu',     t: 4 },
      { n: 'Beast God Yavru', t: 5 },
    ],
    buildings: [
      { n: 'Alfa Tahtı',       t: 'Ana yapı',           locked: false },
      { n: 'Av Kampı',         t: 'Et üretimi',         locked: false },
      { n: 'Vahşi Çukur',      t: 'Birim eğitimi',      locked: false },
      { n: 'Atalar Sunağı',    t: 'Kan Özü üretimi',    locked: false },
      { n: 'Atalar Mağarası',  t: 'Kadim güçler',       locked: true },
      { n: 'Boyut Yarığı',     t: 'Subspace av',        locked: true },
    ],
    commanders: [
      { n: 'Alpha Khorvash',         t: 'Sürü Lideri', lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Yakın dövüş +18%' },
      { n: 'Şaman Ulrek',            t: 'Ata Çağrıcı', lv: 14, tier: 'TIER 2', skill: 'Kan Özü +24%' },
      { n: 'Avcı Kraliçe Ravenna',   t: 'Av Lordu',    lv: 9,  tier: 'TIER 3', skill: 'Av süresi -30%' },
      { n: 'Korova, Beast-God Yavru', t: 'Primordial', lv: 0,  tier: 'TIER 5', skill: 'KİLİT' },
    ],
    storyTitle: 'Vahşi Kanın Çağrısı',
    storyAct1: '"Yutucu Kurt enerjisi vahşi kanını uyandırdı. Sen sıradan bir canavar değildin."',
    storyAct2: '"Güçlü olan yönetir. Bu yasaydı. Sen yasaydın."',
    capitalDescription: 'Alfa tahtı · sürü gücü +20%',
    seasonGoal: 'VAHŞİ HİYERARŞİ',
  },
  seytan: {
    key: 'seytan',
    name: 'Şeytanlar',
    short: 'ŞYT',
    motto: 'Pakt · Arzu · Borç',
    primary: 'oklch(0.62 0.22 15)',
    primaryDim: 'oklch(0.45 0.18 15)',
    glow: 'oklch(0.70 0.24 15)',
    sigil: 'SIGIL',
    resourceA: { name: 'Ruh Özü', icon: 'soul' },
    resourceB: { name: 'Karanlık Md.', icon: 'dark' },
    avatar: 'K. Lord Malphas',
    title: 'Sonsuz Karanlık Hükümdar',
    handle: 'malphas.l',
    allianceTag: 'MHK',
    allianceName: 'Karanlık Mahkeme',
    capitalBase: 'TEMPLE-2',
    enemyRace: 'insan',
    units: [
      { n: 'Imp',             t: 1 },
      { n: 'Cadı Kalfası',    t: 2 },
      { n: 'Lanetli Asker',   t: 2 },
      { n: 'Kanlı Lord',      t: 3 },
      { n: 'Kanat Şeytanı',   t: 4 },
      { n: 'Demon Lord',      t: 5 },
    ],
    buildings: [
      { n: 'Karanlık Taht',    t: 'Ana yapı',          locked: false },
      { n: 'Ruh Toplayıcı',    t: 'Ruh Özü üretir',    locked: false },
      { n: 'Lanet Tapınağı',   t: 'Birim çağırma',     locked: false },
      { n: 'Pakt Sembolü',     t: 'Pakt yetenekleri',  locked: false },
      { n: 'Yasak Grimoire',   t: 'Kadim yetenekler',  locked: true },
      { n: 'Yarık Kapısı',     t: 'Boyut seyahati',    locked: true },
    ],
    commanders: [
      { n: 'Karanlık Lord Malphas', t: 'Sürgün Lord',  lv: 24, tier: 'BAŞ KOMUTAN', skill: 'Pakt maliyeti -15%' },
      { n: 'Cadı-Kraliçe Lilithra', t: 'Ritüel Ustası', lv: 14, tier: 'TIER 2', skill: 'Çağırma süresi -25%' },
      { n: 'Suikastçı Vorhaal',     t: 'Gölge Bıçak',  lv: 9,  tier: 'TIER 3', skill: 'Komutan suikast şansı' },
      { n: 'Borç Tahsilcisi Azurath', t: 'Borç Lordu', lv: 0,  tier: 'TIER 4', skill: 'KİLİT' },
    ],
    storyTitle: 'Sürgünden Dönüş',
    storyAct1: '"Sen unutulmuş bir lordsun. Sürgün edilmiştin. Geri döndün."',
    storyAct2: '"İlk pakt. İlk hizmetkâr. İlk adım intikam yolunda."',
    capitalDescription: 'Karanlık taht · pakt menzili +25%',
    seasonGoal: 'KARANLIK MAHKEME',
  },
};

// ---------- Universal tokens ----------
const ND = {
  bg: '#06080F',                       // void
  bgDeep: '#03050B',
  surface: 'rgba(18, 24, 42, 0.78)',   // panel
  surfaceSolid: '#0E1426',
  surfaceHi: 'rgba(28, 38, 64, 0.85)',
  border: 'rgba(120, 160, 220, 0.18)',
  borderHi: 'rgba(120, 200, 255, 0.36)',
  text: 'oklch(0.96 0.01 240)',
  textDim: 'oklch(0.72 0.02 240)',
  textMute: 'oklch(0.52 0.02 240)',
  danger: 'oklch(0.65 0.22 25)',
  ok: 'oklch(0.72 0.16 145)',
  warn: 'oklch(0.80 0.15 80)',
  display: '"Chakra Petch", "Rajdhani", system-ui, sans-serif',
  body: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

// ---------- Nebula background SVG ----------
function NebulaBg({ race = RACES.insan, intensity = 1, dim = 1, children, style }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: ND.bg, ...style,
    }}>
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 400 800" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id={`neb-${id}-a`} cx="20%" cy="15%" r="60%">
            <stop offset="0%" stopColor={race.primary} stopOpacity={0.35 * intensity * dim} />
            <stop offset="60%" stopColor={race.primaryDim} stopOpacity={0.08 * intensity * dim} />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`neb-${id}-b`} cx="85%" cy="80%" r="55%">
            <stop offset="0%" stopColor="oklch(0.55 0.18 280)" stopOpacity={0.30 * intensity * dim} />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`neb-${id}-c`} cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <pattern id={`stars-${id}`} width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="6"  cy="13" r="0.6" fill="#fff" opacity="0.7" />
            <circle cx="42" cy="28" r="0.4" fill="#fff" opacity="0.5" />
            <circle cx="64" cy="52" r="0.7" fill="#fff" opacity="0.8" />
            <circle cx="22" cy="60" r="0.5" fill="#fff" opacity="0.6" />
            <circle cx="55" cy="9"  r="0.3" fill="#fff" opacity="0.4" />
            <circle cx="11" cy="40" r="0.35" fill="#fff" opacity="0.45" />
            <circle cx="74" cy="72" r="0.45" fill="#fff" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="400" height="800" fill={ND.bgDeep} />
        <rect width="400" height="800" fill={`url(#stars-${id})`} />
        <rect width="400" height="800" fill={`url(#neb-${id}-a)`} />
        <rect width="400" height="800" fill={`url(#neb-${id}-b)`} />
        <rect width="400" height="800" fill={`url(#neb-${id}-c)`} />
      </svg>
      {children}
    </div>
  );
}

// ---------- Sigil (race emblem placeholder, geometric) ----------
function Sigil({ race, size = 32, glow = false }) {
  const c = race.primary;
  const stroke = race.glow;
  // 5 stylized variants — pure geometric, no figurative SVG
  const inner = {
    insan: (
      <g>
        <polygon points="32,6 56,56 8,56" fill="none" stroke={stroke} strokeWidth="2"/>
        <polygon points="32,18 48,48 16,48" fill={c} opacity="0.25"/>
        <line x1="32" y1="6" x2="32" y2="58" stroke={stroke} strokeWidth="1.2"/>
      </g>
    ),
    zerg: (
      <g>
        <circle cx="32" cy="32" r="22" fill="none" stroke={stroke} strokeWidth="2"/>
        <path d="M32 12 L42 32 L32 52 L22 32 Z" fill={c} opacity="0.35"/>
        <circle cx="32" cy="32" r="6" fill={stroke}/>
      </g>
    ),
    otomat: (
      <g>
        <rect x="10" y="10" width="44" height="44" fill="none" stroke={stroke} strokeWidth="2"/>
        <rect x="18" y="18" width="28" height="28" fill={c} opacity="0.30"/>
        <line x1="10" y1="32" x2="54" y2="32" stroke={stroke} strokeWidth="1"/>
        <line x1="32" y1="10" x2="32" y2="54" stroke={stroke} strokeWidth="1"/>
      </g>
    ),
    canavar: (
      <g>
        <polygon points="32,8 56,24 48,56 16,56 8,24" fill="none" stroke={stroke} strokeWidth="2"/>
        <polygon points="32,18 46,28 40,48 24,48 18,28" fill={c} opacity="0.30"/>
        <circle cx="24" cy="34" r="2" fill={stroke}/>
        <circle cx="40" cy="34" r="2" fill={stroke}/>
      </g>
    ),
    seytan: (
      <g>
        <polygon points="32,6 58,32 32,58 6,32" fill="none" stroke={stroke} strokeWidth="2"/>
        <polygon points="32,18 46,32 32,46 18,32" fill={c} opacity="0.35"/>
        <line x1="6" y1="32" x2="58" y2="32" stroke={stroke} strokeWidth="0.8"/>
      </g>
    ),
  }[race.key];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64"
      style={{ filter: glow ? `drop-shadow(0 0 8px ${race.glow})` : 'none', display: 'block' }}>
      {inner}
    </svg>
  );
}

// ---------- Resource icons ----------
function ResIcon({ kind, size = 14, color }) {
  const c = color || ND.text;
  const map = {
    cred:  <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="none" stroke={c} strokeWidth="1.4"/>,
    sci:   <g><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.4"/><circle cx="8" cy="8" r="2" fill={c}/></g>,
    bio:   <path d="M8 1 C 12 5, 12 11, 8 15 C 4 11, 4 5, 8 1 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    gen:   <g><path d="M3 3 C 13 5, 3 11, 13 13" fill="none" stroke={c} strokeWidth="1.4"/><path d="M13 3 C 3 5, 13 11, 3 13" fill="none" stroke={c} strokeWidth="1.4"/></g>,
    min:   <polygon points="8,1 14,6 12,14 4,14 2,6" fill="none" stroke={c} strokeWidth="1.4"/>,
    cpu:   <g><rect x="3" y="3" width="10" height="10" fill="none" stroke={c} strokeWidth="1.4"/><rect x="6" y="6" width="4" height="4" fill={c}/></g>,
    meat:  <path d="M3 8 Q 8 1, 13 8 Q 8 15, 3 8 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    blood: <path d="M8 1 L 13 9 Q 13 14, 8 14 Q 3 14, 3 9 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    soul:  <g><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.4"/><path d="M5 6 Q 8 11, 11 6" fill="none" stroke={c} strokeWidth="1.2"/></g>,
    dark:  <g><circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.4"/><circle cx="8" cy="8" r="6" fill={c} clipPath="inset(0 50% 0 0)"/></g>,
    crystal: <polygon points="8,1 13,6 10,15 6,15 3,6" fill="none" stroke={c} strokeWidth="1.4"/>,
    energy: <path d="M9 1 L 4 9 L 8 9 L 6 15 L 12 7 L 8 7 Z" fill="none" stroke={c} strokeWidth="1.4"/>,
    pop:    <g><circle cx="8" cy="5" r="2.5" fill="none" stroke={c} strokeWidth="1.4"/><path d="M3 14 Q 8 9, 13 14" fill="none" stroke={c} strokeWidth="1.4"/></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'inline-block', verticalAlign: 'middle' }}>{map[kind] || map.cred}</svg>;
}

// ---------- Hex/angular panel ----------
function Panel({ children, style, race, hi = false, glow = false }) {
  return (
    <div style={{
      position: 'relative',
      background: hi ? ND.surfaceHi : ND.surface,
      border: `1px solid ${hi ? ND.borderHi : ND.border}`,
      borderRadius: 6,
      boxShadow: glow && race ? `0 0 0 1px ${race.primary}40, 0 0 24px -8px ${race.glow}` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      ...style,
    }}>{children}</div>
  );
}

// Angled / cut-corner panel using clip-path
function NotchPanel({ children, style, race, fill, notch = 12 }) {
  return (
    <div style={{
      position: 'relative',
      background: fill || ND.surface,
      border: `1px solid ${race ? race.primary + '55' : ND.border}`,
      clipPath: `polygon(${notch}px 0, 100% 0, 100% calc(100% - ${notch}px), calc(100% - ${notch}px) 100%, 0 100%, 0 ${notch}px)`,
      padding: 12,
      ...style,
    }}>{children}</div>
  );
}

// ---------- Buttons ----------
function NDButton({ children, race, variant = 'primary', size = 'md', onClick, style, full, icon }) {
  const heights = { sm: 32, md: 40, lg: 48 };
  const padding = { sm: '0 12px', md: '0 16px', lg: '0 22px' };
  const fontSize = { sm: 12, md: 13, lg: 14 };
  const styles = {
    primary: {
      background: `linear-gradient(180deg, ${race?.primary || 'oklch(0.78 0.16 220)'} 0%, ${race?.primaryDim || 'oklch(0.55 0.13 220)'} 100%)`,
      color: '#0A0E1A',
      border: 'none',
      boxShadow: `0 0 0 1px ${race?.glow || 'oklch(0.85 0.18 220)'}55, 0 4px 16px -4px ${race?.glow || 'oklch(0.85 0.18 220)'}66`,
      fontWeight: 700,
    },
    ghost: {
      background: 'rgba(120, 200, 255, 0.06)',
      color: ND.text,
      border: `1px solid ${ND.border}`,
      fontWeight: 600,
    },
    outline: {
      background: 'transparent',
      color: race?.primary || ND.text,
      border: `1px solid ${race?.primary || ND.borderHi}`,
      fontWeight: 600,
    },
    danger: {
      background: 'transparent',
      color: ND.danger,
      border: `1px solid ${ND.danger}77`,
      fontWeight: 600,
    },
  };
  return (
    <button onClick={onClick}
      style={{
        height: heights[size],
        padding: padding[size],
        fontSize: fontSize[size],
        fontFamily: ND.display,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 4,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : undefined,
        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
        ...styles[variant],
        ...style,
      }}>
      {icon}<span>{children}</span>
    </button>
  );
}

// ---------- Stat bar / progress ----------
function Bar({ value, max = 100, color, height = 6, label, trailing }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ width: '100%' }}>
      {(label || trailing) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: ND.mono,
          color: ND.textDim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span>{label}</span><span>{trailing}</span>
        </div>
      )}
      <div style={{
        height, background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${ND.border}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 8px ${color}99`,
        }} />
      </div>
    </div>
  );
}

// ---------- Eyebrow / tag ----------
function Eyebrow({ children, color, style }) {
  return <div style={{
    fontFamily: ND.mono, fontSize: 10, letterSpacing: '0.20em',
    textTransform: 'uppercase', color: color || ND.textDim,
    ...style,
  }}>{children}</div>;
}
function Chip({ children, color, style }) {
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 6px', fontFamily: ND.mono, fontSize: 9,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    border: `1px solid ${color || ND.border}`,
    color: color || ND.textDim,
    background: (color || '#fff') + '10',
    ...style,
  }}>{children}</span>;
}

// ---------- Currency display (HUD top) ----------
function ResPill({ race, kind, value, accent }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 8px 4px 6px',
      background: 'rgba(8, 12, 26, 0.7)',
      border: `1px solid ${ND.border}`,
      borderRadius: 3,
      fontFamily: ND.mono, fontSize: 11, color: ND.text,
      letterSpacing: '0.04em',
    }}>
      <ResIcon kind={kind} size={12} color={accent}/>
      <span>{value}</span>
    </div>
  );
}

// ---------- Image placeholder ----------
function ImgSlot({ label, ratio, style, color, intensity = 0.06 }) {
  const c = color || ND.borderHi;
  return (
    <div style={{
      position: 'relative', width: '100%',
      aspectRatio: ratio,
      background: `repeating-linear-gradient(135deg, ${c}${Math.round(intensity*255).toString(16)} 0 6px, transparent 6px 12px), rgba(10,14,28,0.6)`,
      border: `1px dashed ${c}66`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      <span style={{ fontFamily: ND.mono, fontSize: 10, color: c, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', padding: '0 8px' }}>
        {label}
      </span>
    </div>
  );
}

// ---------- HUD top bar (used in game screens) ----------
function HUD({ race, level = 9, levelName = 'Metropol', resA = '12,480', resB = '3,210', crystal = '42', pop = '180/240' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px',
      background: 'linear-gradient(180deg, rgba(6,8,15,0.95) 0%, rgba(6,8,15,0.70) 100%)',
      borderBottom: `1px solid ${ND.border}`,
    }}>
      {/* Level chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 6px 4px 4px',
        background: `linear-gradient(180deg, ${race.primary}28, transparent)`,
        border: `1px solid ${race.primary}66`,
        borderRadius: 3,
        clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)',
      }}>
        <div style={{
          width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: race.primary, color: '#0A0E1A',
          fontFamily: ND.display, fontWeight: 700, fontSize: 12,
        }}>{level}</div>
        <div style={{ lineHeight: 1, fontFamily: ND.display, fontSize: 10, color: ND.text, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {levelName}
        </div>
      </div>
      {/* spacer */}
      <div style={{ flex: 1 }} />
      <ResPill race={race} kind={race.resourceA.icon} value={resA} accent={race.primary}/>
      <ResPill race={race} kind={race.resourceB.icon} value={resB} accent={race.primary}/>
      <ResPill race={race} kind="crystal" value={crystal} accent="oklch(0.82 0.16 80)"/>
    </div>
  );
}

// ---------- Bottom nav ----------
function BottomNav({ race, active = 'base' }) {
  const items = [
    { key: 'base', label: 'Üs', icon: 'base' },
    { key: 'galaxy', label: 'Galaksi', icon: 'galaxy' },
    { key: 'cmd', label: 'Komutan', icon: 'cmd' },
    { key: 'story', label: 'Hikaye', icon: 'story' },
    { key: 'more', label: 'Daha', icon: 'more' },
  ];
  const ico = (k, c) => {
    const s = 18; const sw = 1.5;
    if (k === 'base') return <svg width={s} height={s} viewBox="0 0 18 18"><rect x="2" y="9" width="14" height="7" fill="none" stroke={c} strokeWidth={sw}/><polygon points="2,9 9,3 16,9" fill="none" stroke={c} strokeWidth={sw}/><rect x="7" y="11" width="4" height="5" fill={c} opacity="0.4"/></svg>;
    if (k === 'galaxy') return <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="none" stroke={c} strokeWidth={sw}/><ellipse cx="9" cy="9" rx="6" ry="2" fill="none" stroke={c} strokeWidth={sw} transform="rotate(35 9 9)"/></svg>;
    if (k === 'cmd') return <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="9" cy="6" r="3" fill="none" stroke={c} strokeWidth={sw}/><path d="M3 16 Q 9 10, 15 16" fill="none" stroke={c} strokeWidth={sw}/></svg>;
    if (k === 'story') return <svg width={s} height={s} viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" fill="none" stroke={c} strokeWidth={sw}/><path d="M3 7 H 15 M 7 3 V 15" stroke={c} strokeWidth={sw}/></svg>;
    return <svg width={s} height={s} viewBox="0 0 18 18"><circle cx="4" cy="9" r="1.5" fill={c}/><circle cx="9" cy="9" r="1.5" fill={c}/><circle cx="14" cy="9" r="1.5" fill={c}/></svg>;
  };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      borderTop: `1px solid ${ND.border}`,
      background: 'linear-gradient(180deg, rgba(6,8,15,0.85) 0%, rgba(6,8,15,0.98) 100%)',
      padding: '6px 0 10px',
    }}>
      {items.map(it => {
        const isOn = it.key === active;
        const c = isOn ? race.primary : ND.textMute;
        return (
          <div key={it.key} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            position: 'relative',
          }}>
            {isOn && <div style={{ position: 'absolute', top: -6, height: 2, width: 24, background: race.primary, boxShadow: `0 0 8px ${race.glow}` }}/>}
            {ico(it.key, c)}
            <span style={{ fontFamily: ND.display, fontSize: 9, color: c, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Screen wrapper ----------
// A 390x844 zone inside the iOS frame's safe area.
function Screen({ children, race, dim = 1, intensity = 1, style }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      color: ND.text, fontFamily: ND.body, overflow: 'hidden',
      ...style,
    }}>
      <NebulaBg race={race} intensity={intensity} dim={dim} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ---------- Headline / display text ----------
function H1({ children, style }) { return <div style={{ fontFamily: ND.display, fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.05, ...style }}>{children}</div>; }
function H2({ children, style }) { return <div style={{ fontFamily: ND.display, fontSize: 20, fontWeight: 600, letterSpacing: '0.06em', lineHeight: 1.1, textTransform: 'uppercase', ...style }}>{children}</div>; }
function H3({ children, style }) { return <div style={{ fontFamily: ND.display, fontSize: 14, fontWeight: 600, letterSpacing: '0.10em', lineHeight: 1.2, textTransform: 'uppercase', ...style }}>{children}</div>; }
function Caption({ children, style }) { return <div style={{ fontFamily: ND.body, fontSize: 12, color: ND.textDim, lineHeight: 1.45, ...style }}>{children}</div>; }
function Code({ children, style }) { return <span style={{ fontFamily: ND.mono, fontSize: 11, color: ND.textDim, letterSpacing: '0.04em', ...style }}>{children}</span>; }

// Export to window
Object.assign(window, {
  ND, RACES, NebulaBg, Sigil, ResIcon, Panel, NotchPanel, NDButton, Bar, Eyebrow, Chip, ResPill, ImgSlot, HUD, BottomNav, Screen, H1, H2, H3, Caption, Code,
});
