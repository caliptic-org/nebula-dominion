export type RaceId = 'zerg' | 'otomat' | 'canavar' | 'insan' | 'seytan';

export interface Commander {
  id: string;
  name: string;
  portrait: string;
}

export interface RaceConfig {
  id: RaceId;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  glow: string;
  bg: string;
  primaryPortrait: string;
  commanders: Commander[];
  lore: string;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    hp: number;
  };
}

export const RACES: RaceConfig[] = [
  {
    id: 'zerg',
    name: 'Zerg',
    subtitle: 'Organik kovan zekası',
    icon: '🦠',
    color: '#44ff44',
    glow: 'rgba(68, 255, 68, 0.45)',
    bg: 'rgba(68, 255, 68, 0.08)',
    primaryPortrait: '/assets/characters/zerg/vex_thara.png',
    commanders: [
      { id: 'vex_thara', name: 'Vex Thara', portrait: '/assets/characters/zerg/vex_thara.png' },
      { id: 'morgath', name: 'Morgath', portrait: '/assets/characters/zerg/morgath.png' },
      { id: 'threnix', name: 'Threnix', portrait: '/assets/characters/zerg/threnix.png' },
    ],
    lore: 'Biyolüminesan damarlarla örülü kovan zihni. Mutasyon hızı saldırı doğurur, kalabalık sayı savunmayı eritir. Her birim, kovanın bir parçasıdır.',
    stats: { attack: 78, defense: 52, speed: 85, hp: 62 },
  },
  {
    id: 'otomat',
    name: 'Otomat',
    subtitle: 'Holografik savaş ağı',
    icon: '◈',
    color: '#00cfff',
    glow: 'rgba(0, 207, 255, 0.45)',
    bg: 'rgba(0, 207, 255, 0.08)',
    primaryPortrait: '/assets/characters/otomat/demiurge_prime.png',
    commanders: [
      { id: 'demiurge_prime', name: 'Demiurge Prime', portrait: '/assets/characters/otomat/demiurge_prime.png' },
      { id: 'aurelius', name: 'Aurelius', portrait: '/assets/characters/otomat/aurelius.png' },
      { id: 'crucible', name: 'Crucible', portrait: '/assets/characters/otomat/crucible.png' },
    ],
    lore: 'Geometrik hesap, soğuk mantık. Holografik HUD savaş alanını tahmine indirger; her hamle önceden çözülmüştür. Otomatlar yenilmez değil, sadece kaçınılmazdır.',
    stats: { attack: 72, defense: 80, speed: 60, hp: 70 },
  },
  {
    id: 'canavar',
    name: 'Canavar',
    subtitle: 'Kadim taş ve kan',
    icon: '◆',
    color: '#ff6600',
    glow: 'rgba(255, 102, 0, 0.45)',
    bg: 'rgba(255, 102, 0, 0.08)',
    primaryPortrait: '/assets/characters/canavar/khorvash.png',
    commanders: [
      { id: 'khorvash', name: 'Khorvash', portrait: '/assets/characters/canavar/khorvash.png' },
      { id: 'ravenna', name: 'Ravenna', portrait: '/assets/characters/canavar/ravenna.png' },
      { id: 'ulrek', name: 'Ulrek', portrait: '/assets/characters/canavar/ulrek.png' },
    ],
    lore: 'Yıldızlardan önce uyanmış primitif güç. Ateş ve kemik üstüne kazınmış savaş ritüelleri. Yara aldıkça güçlenir; ölüm bile bir geçiş ayinidir.',
    stats: { attack: 92, defense: 70, speed: 48, hp: 88 },
  },
  {
    id: 'insan',
    name: 'İnsan',
    subtitle: 'Genetik savaşçılar',
    icon: '✦',
    color: '#4a9eff',
    glow: 'rgba(74, 158, 255, 0.45)',
    bg: 'rgba(74, 158, 255, 0.08)',
    primaryPortrait: '/assets/characters/insan/voss.png',
    commanders: [
      { id: 'voss', name: 'Voss', portrait: '/assets/characters/insan/voss.png' },
      { id: 'chen', name: 'Chen', portrait: '/assets/characters/insan/chen.png' },
      { id: 'reyes', name: 'Reyes', portrait: '/assets/characters/insan/reyes.png' },
      { id: 'kovacs', name: 'Kovacs', portrait: '/assets/characters/insan/kovacs.png' },
    ],
    lore: 'Genetik savaşçı zırhı, askeri disiplin, mühendislik dahası. İnsanlık dengeyi ve umudu silah olarak kullanır; teknoloji onların öfkesidir.',
    stats: { attack: 68, defense: 75, speed: 65, hp: 72 },
  },
  {
    id: 'seytan',
    name: 'Şeytan',
    subtitle: 'Lanetli gotik tarikat',
    icon: '✶',
    color: '#cc00ff',
    glow: 'rgba(204, 0, 255, 0.45)',
    bg: 'rgba(204, 0, 255, 0.08)',
    primaryPortrait: '/assets/characters/seytan/malphas.png',
    commanders: [
      { id: 'malphas', name: 'Malphas', portrait: '/assets/characters/seytan/malphas.png' },
      { id: 'lilithra', name: 'Lilithra', portrait: '/assets/characters/seytan/lilithra.png' },
      { id: 'vorhaal', name: 'Vorhaal', portrait: '/assets/characters/seytan/vorhaal.png' },
      { id: 'azurath', name: 'Azurath', portrait: '/assets/characters/seytan/azurath.png' },
    ],
    lore: 'Gotik mimari ve duman, rune sembolleri ve lanet. Şeytanlar gücü borç alır, faizini kanla öderler. Her zafer bir bedeldir, her bedel bir lanettir.',
    stats: { attack: 86, defense: 58, speed: 72, hp: 64 },
  },
];

export const RACE_BY_ID: Record<RaceId, RaceConfig> = RACES.reduce(
  (acc, r) => ({ ...acc, [r.id]: r }),
  {} as Record<RaceId, RaceConfig>,
);
