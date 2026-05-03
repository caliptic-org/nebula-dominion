export type CommanderRace =
  | 'insan'
  | 'zerg'
  | 'otomat'
  | 'canavar'
  | 'seytan';

export interface RaceTheme {
  id: CommanderRace;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  glowColor: string;
  bgTint: string;
  borderColor: string;
}

export interface Commander {
  id: string;
  name: string;
  race: CommanderRace;
  level: number;
  isUnlocked: boolean;
  portrait: string;
  traits: string[];
  story: string;
  abilities: string[];
}

export const RACE_THEMES: Record<CommanderRace, RaceTheme> = {
  insan: {
    id: 'insan',
    name: 'İnsan',
    subtitle: 'Askeri Teknoloji',
    icon: '⚔',
    color: '#4a9eff',
    glowColor: 'rgba(74,158,255,0.55)',
    bgTint: 'rgba(74,158,255,0.10)',
    borderColor: 'rgba(74,158,255,0.35)',
  },
  zerg: {
    id: 'zerg',
    name: 'Zerg',
    subtitle: 'Organik Kovan',
    icon: '🧬',
    color: '#44ff66',
    glowColor: 'rgba(68,255,102,0.55)',
    bgTint: 'rgba(68,255,102,0.10)',
    borderColor: 'rgba(68,255,102,0.35)',
  },
  otomat: {
    id: 'otomat',
    name: 'Otomat',
    subtitle: 'Holografik Akıl',
    icon: '⚡',
    color: '#00cfff',
    glowColor: 'rgba(0,207,255,0.55)',
    bgTint: 'rgba(0,207,255,0.10)',
    borderColor: 'rgba(0,207,255,0.35)',
  },
  canavar: {
    id: 'canavar',
    name: 'Canavar',
    subtitle: 'Kadim Taş & Kan',
    icon: '🔥',
    color: '#ff6a1a',
    glowColor: 'rgba(255,106,26,0.55)',
    bgTint: 'rgba(255,106,26,0.10)',
    borderColor: 'rgba(255,106,26,0.35)',
  },
  seytan: {
    id: 'seytan',
    name: 'Şeytan',
    subtitle: 'Gotik Lanet',
    icon: '💀',
    color: '#cc44ff',
    glowColor: 'rgba(204,68,255,0.55)',
    bgTint: 'rgba(204,68,255,0.10)',
    borderColor: 'rgba(204,68,255,0.35)',
  },
};

export const RACE_ORDER: CommanderRace[] = [
  'insan',
  'zerg',
  'otomat',
  'canavar',
  'seytan',
];

export const COMMANDERS: Commander[] = [
  // ── İnsan ────────────────────────────────────────────
  {
    id: 'voss',
    name: 'Voss',
    race: 'insan',
    level: 5,
    isUnlocked: true,
    portrait: '/assets/characters/insan/voss.png',
    traits: ['Komuta', 'Zırh'],
    story:
      'Genetik Savaşçı Birliği komutanı. Zırh takviyesi ve nişancı modu yetenekleriyle savaş hattını ayakta tutar.',
    abilities: ['Stimpack', 'Nişancı Modu', 'Zırh Takviyesi', 'Birim Komuta'],
  },
  {
    id: 'chen',
    name: 'Chen',
    race: 'insan',
    level: 3,
    isUnlocked: true,
    portrait: '/assets/characters/insan/chen.png',
    traits: ['Mühendis', 'Taktik'],
    story:
      'Savaş mühendisi ve taktik dehası. Mevzi inşa eder, sahaya ölümcül tuzaklar yerleştirir.',
    abilities: ['Mevzi Kur', 'Mühendislik', 'Bomba Uzmanı'],
  },
  {
    id: 'reyes',
    name: 'Reyes',
    race: 'insan',
    level: 2,
    isUnlocked: false,
    portrait: '/assets/characters/insan/reyes.png',
    traits: ['Gizli', 'Sabotaj'],
    story:
      'Gizli operasyon uzmanı. Görünmezlik teknolojisi ve keskin nişancı yetenekleriyle hedefleri sessizce bertaraf eder.',
    abilities: ['Görünmezlik', 'Keskin Nişancı', 'Sabotaj'],
  },
  {
    id: 'kovacs',
    name: 'Kovacs',
    race: 'insan',
    level: 4,
    isUnlocked: false,
    portrait: '/assets/characters/insan/kovacs.png',
    traits: ['Kuşatma', 'Strateji'],
    story:
      'Kuşatma tankı operatörü. Uzun menzilli yıkıcı atışlar ve savunma hattı kurma uzmanlığı vardır.',
    abilities: ['Kuşatma Modu', 'Tank Ateşi', 'Savunma Hattı'],
  },

  // ── Zerg ─────────────────────────────────────────────
  {
    id: 'vex_thara',
    name: 'Vex Thara',
    race: 'zerg',
    level: 6,
    isUnlocked: true,
    portrait: '/assets/characters/zerg/vex_thara.png',
    traits: ['Kovan Ana', 'Yayılım'],
    story:
      'Kovan Ana\'nın birincil sesi. Sürü hareketlerini yönlendirir ve mutasyonu çağırır.',
    abilities: ['Kovan Sürüsü', 'Biyolüminesan Patlama', 'Mutasyon Çağrısı'],
  },
  {
    id: 'morgath',
    name: 'Morgath',
    race: 'zerg',
    level: 4,
    isUnlocked: true,
    portrait: '/assets/characters/zerg/morgath.png',
    traits: ['Saldırı', 'Yıkım'],
    story:
      'Savaş genetiğiyle optimize edilmiş bir yıkım makinesi. Adrenal salınım ile kısa sürede ezici güç açığa çıkarır.',
    abilities: ['Adrenal Salınım', 'Zırh Yırma', 'Sürü Hücumu'],
  },
  {
    id: 'threnix',
    name: 'Threnix',
    race: 'zerg',
    level: 3,
    isUnlocked: false,
    portrait: '/assets/characters/zerg/threnix.png',
    traits: ['Zihin', 'Parazit'],
    story:
      'Zihin kontrolcüsü ve parazit ustası. Düşman birimlerini parazitleyerek kovan hizmetine alır.',
    abilities: ['Zihin Kontrolü', 'Parazit Yayılımı', 'Nöral Parazit'],
  },

  // ── Otomat ───────────────────────────────────────────
  {
    id: 'demiurge_prime',
    name: 'Demiurge Prime',
    race: 'otomat',
    level: 7,
    isUnlocked: true,
    portrait: '/assets/characters/otomat/demiurge_prime.png',
    traits: ['Yaratıcı', 'Holografik'],
    story:
      'Otomat ırkının yaratıcısı. Holografik yansımalar ve geometrik enerji alanları üretir.',
    abilities: ['Holografik Yansıma', 'Enerji Alanı', 'Geometrik Kesim'],
  },
  {
    id: 'aurelius',
    name: 'Aurelius',
    race: 'otomat',
    level: 4,
    isUnlocked: true,
    portrait: '/assets/characters/otomat/aurelius.png',
    traits: ['Strateji', 'Hassasiyet'],
    story:
      'Taktik hesaplama birimi. Grid kilidi ve hassas atış yetenekleriyle savaş alanını kontrol eder.',
    abilities: ['Hesaplama Artışı', 'Grid Kilidi', 'Hassas Atış'],
  },
  {
    id: 'crucible',
    name: 'Crucible',
    race: 'otomat',
    level: 3,
    isUnlocked: false,
    portrait: '/assets/characters/otomat/crucible.png',
    traits: ['Plazma', 'Kale'],
    story:
      'Yüksek enerji silah platformu. Kale modunda devasa plazma topu ile alanı tarar.',
    abilities: ['Plazma Topu', 'Enerji Tükenmez', 'Kale Modu'],
  },

  // ── Canavar ──────────────────────────────────────────
  {
    id: 'khorvash',
    name: 'Khorvash',
    race: 'canavar',
    level: 6,
    isUnlocked: true,
    portrait: '/assets/characters/canavar/khorvash.png',
    traits: ['Klan Lideri', 'Ateş'],
    story:
      'Canavar klanının en korkunç savaşçısı. Ateş nefesi ve taş zırhıyla savaş alanına dehşet saçar.',
    abilities: ['Ateş Nefesi', 'Taş Zırh', 'Yıkım Darbesi'],
  },
  {
    id: 'ravenna',
    name: 'Ravenna',
    race: 'canavar',
    level: 4,
    isUnlocked: true,
    portrait: '/assets/characters/canavar/ravenna.png',
    traits: ['Kadim Büyü', 'Lav'],
    story:
      'Kadim büyü ve fiziksel güç ustası. Kan büyüsüyle düşmanı içten yıkar.',
    abilities: ['Lav Patlaması', 'Kan Büyüsü', 'Taş Devrim'],
  },
  {
    id: 'ulrek',
    name: 'Ulrek',
    race: 'canavar',
    level: 3,
    isUnlocked: false,
    portrait: '/assets/characters/canavar/ulrek.png',
    traits: ['Dev', 'Primitif'],
    story:
      'Dev boyutlu yıkım makinesi. Yer sarsıntısı ve ezme saldırılarıyla savaş hattını parçalar.',
    abilities: ['Ezme', 'Yer Sarsıntısı', 'Primitif Öfke'],
  },

  // ── Şeytan ───────────────────────────────────────────
  {
    id: 'malphas',
    name: 'Malphas',
    race: 'seytan',
    level: 8,
    isUnlocked: true,
    portrait: '/assets/characters/seytan/malphas.png',
    traits: ['Lanet', 'Büyücü'],
    story:
      'Şeytan ırkının en güçlü büyücüsü. Lanet fırtınaları ve karanlık portallar açar.',
    abilities: ['Lanet Fırtınası', 'Ruh Çalma', 'Karanlık Portal'],
  },
  {
    id: 'lilithra',
    name: 'Lilithra',
    race: 'seytan',
    level: 5,
    isUnlocked: true,
    portrait: '/assets/characters/seytan/lilithra.png',
    traits: ['Kaos', 'Zihin'],
    story:
      'Kaos büyücüsü ve zihin bükücü. Düşman birimlerini içeriden çürütür.',
    abilities: ['Kaos Dalgası', 'Zihin Çürütme', 'Duman Kalkanı'],
  },
  {
    id: 'vorhaal',
    name: 'Vorhaal',
    race: 'seytan',
    level: 4,
    isUnlocked: false,
    portrait: '/assets/characters/seytan/vorhaal.png',
    traits: ['Ölümsüz', 'Lanet'],
    story:
      'Ölümsüz savaşçı ve lanet taşıyıcısı. Vurulan her darbe onu daha güçlü kılar.',
    abilities: ['Ölümsüzlük', 'Lanet Dokunuşu', 'Karanlık Zırh'],
  },
  {
    id: 'azurath',
    name: 'Azurath',
    race: 'seytan',
    level: 3,
    isUnlocked: false,
    portrait: '/assets/characters/seytan/azurath.png',
    traits: ['Boyut', 'Rune'],
    story:
      'Boyutlar arası yolcu ve savaş runu ustası. Astral yolculuk ile cepheyi anında değiştirir.',
    abilities: ['Boyut Kapısı', 'Rune Patlaması', 'Astral Yolculuk'],
  },
];
