export enum Race {
  INSAN    = 'insan',
  ZERG     = 'zerg',
  OTOMAT   = 'otomat',
  CANAVAR  = 'canavar',
  SEYTAN   = 'seytan',
}

export enum UnitType {
  // İnsan
  MARINE    = 'marine',
  MEDIC     = 'medic',
  SIEGE_TANK= 'siege_tank',
  GHOST     = 'ghost',
  // Zerg
  ZERGLING  = 'zergling',
  HYDRALISK = 'hydralisk',
  ULTRALISK = 'ultralisk',
  QUEEN     = 'queen',
  // Otomat
  SENTINEL  = 'sentinel',
  FABRICATOR= 'fabricator',
  COLOSSUS  = 'colossus',
  // Canavar
  RAVAGER   = 'ravager',
  PREDATOR  = 'predator',
  TITAN     = 'titan',
  // Şeytan
  SHADE     = 'shade',
  WARLOCK   = 'warlock',
  DREADLORD = 'dreadlord',
}

export interface UnitCost {
  mineral: number;
  gas: number;
  energy: number;
}

export interface UnitConfig {
  type: UnitType;
  race: Race;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  cost: UnitCost;
  trainTimeSeconds: number;
  abilities: string[];
  description: string;
}

export interface PlayerUnit {
  id: string;
  type: UnitType;
  race: Race;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  positionX: number;
  positionY: number;
  abilities: string[];
  isAlive: boolean;
}

export interface CommanderInfo {
  id: string;
  name: string;
  portrait: string;
  race: Race;
  level: number;
  isUnlocked: boolean;
  story: string;
  abilities: string[];
}

export interface RaceDescription {
  name: string;
  subtitle: string;
  description: string;
  lore: string;
  color: string;
  bgColor: string;
  glowColor: string;
  icon: string;
  dataRace: string;
  primaryCommanderPortrait: string;
  commanders: CommanderInfo[];
  stats: {
    attack: number;
    defense: number;
    speed: number;
    hp: number;
  };
  structures: string[];
}

export const RACE_DESCRIPTIONS: Record<Race, RaceDescription> = {
  [Race.INSAN]: {
    name: 'İnsan',
    subtitle: 'Askeri Teknoloji & Umut',
    description:
      'Genetik Savaşçı zırhıyla donanmış insan birlikleri, dengeli teknoloji ve üst düzey savunma kabiliyetiyle savaş alanına hükmeder.',
    lore:
      'Evrenin kenar noktalarında hayatta kalmayı öğrenen insanlık, genetik modifikasyon ve ileri silah teknolojisiyle savaşa yeni bir boyut kazandırdı. Her komutan, yıllar süren eğitimin ürünüdür.',
    color: '#4a9eff',
    bgColor: 'rgba(74,158,255,0.08)',
    glowColor: 'rgba(74,158,255,0.3)',
    icon: '⚔️',
    dataRace: 'insan',
    primaryCommanderPortrait: '/assets/characters/insan/voss.png',
    commanders: [
      { id: 'voss', name: 'Voss', portrait: '/assets/characters/insan/voss.png', race: Race.INSAN, level: 5, isUnlocked: true, story: 'Elit Genetik Savaşçı birliğinin lideri.', abilities: ['Stimpack', 'Nişancı Modu', 'Zırh Takviyesi'] },
      { id: 'chen', name: 'Chen', portrait: '/assets/characters/insan/chen.png', race: Race.INSAN, level: 3, isUnlocked: true, story: 'Savaş mühendisi ve taktik deha.', abilities: ['Mevzi Kur', 'Mühendislik', 'Bomba Uzmanı'] },
      { id: 'reyes', name: 'Reyes', portrait: '/assets/characters/insan/reyes.png', race: Race.INSAN, level: 2, isUnlocked: false, story: 'Gizli operasyon uzmanı.', abilities: ['Görünmezlik', 'Keskin Nişancı', 'Sabotaj'] },
      { id: 'kovacs', name: 'Kovacs', portrait: '/assets/characters/insan/kovacs.png', race: Race.INSAN, level: 4, isUnlocked: false, story: 'Kuşatma tankı operatörü ve strateji ustası.', abilities: ['Kuşatma Modu', 'Tank Ateşi', 'Savunma Hattı'] },
    ],
    stats: { attack: 60, defense: 80, speed: 55, hp: 75 },
    structures: ['yutucu_yildiz_akademisi', 'sonsuzluk_cekirdegi'],
  },
  [Race.ZERG]: {
    name: 'Zerg',
    subtitle: 'Organik Kovan & Biyolüminesan',
    description:
      'Kovan zihniyle hareket eden Zerg ordusu, hızlı ve acımasız saldırılarıyla düşmanı ezer. Organik biyolüminesas yapıları evrende benzersizdir.',
    lore:
      "Kadim evrimsel güçlerle şekillenmiş Zerg ırkı, kovan bilincinin yönlendirmesiyle var olur. Her birim Kovan Ana'nın iradesinin bir uzantısıdır. Işıldayan damarları ve organik yapıları ile karanlıkta parlayan ölüm.",
    color: '#44ff44',
    bgColor: 'rgba(68,255,68,0.08)',
    glowColor: 'rgba(68,255,68,0.3)',
    icon: '🧬',
    dataRace: 'zerg',
    primaryCommanderPortrait: '/assets/characters/zerg/vex_thara.png',
    commanders: [
      { id: 'vex_thara', name: 'Vex Thara', portrait: '/assets/characters/zerg/vex_thara.png', race: Race.ZERG, level: 6, isUnlocked: true, story: "Kovan Ana'nın birincil sesi ve en güçlü yayılımcısı.", abilities: ['Kovan Sürüsü', 'Biyolüminesan Patlama', 'Mutasyon Çağrısı'] },
      { id: 'morgath', name: 'Morgath', portrait: '/assets/characters/zerg/morgath.png', race: Race.ZERG, level: 4, isUnlocked: true, story: 'Savaş genetiğiyle optimize edilmiş yıkım makinesi.', abilities: ['Adrenal Salınım', 'Zırh Yırma', 'Sürü Hücumu'] },
      { id: 'threnix', name: 'Threnix', portrait: '/assets/characters/zerg/threnix.png', race: Race.ZERG, level: 3, isUnlocked: false, story: 'Zihin kontrolcüsü ve parazit ustası.', abilities: ['Zihin Kontrolü', 'Parazit Yayılımı', 'Nöral Parazit'] },
    ],
    stats: { attack: 85, defense: 45, speed: 90, hp: 55 },
    structures: ['kovan_kalbi', 'mutasyon_cukuru'],
  },
  [Race.OTOMAT]: {
    name: 'Otomat',
    subtitle: 'Geometrik Hologram & Soğuk Akıl',
    description:
      'Holografik HUD ve geometrik grid mimarisiyle tasarlanmış Otomat birlikleri, hesaplı ve soğukkanlı savaş stratejileriyle öne çıkar.',
    lore:
      "Demiurge Prime'ın yaratıcı zekasından doğan Otomat ırkı, saf mantık ve mükemmel geometri ilkeleriyle savaşır. Holografik sistemleri ve enerji kalkanları onları savaş alanının mühendisleri yapar.",
    color: '#00cfff',
    bgColor: 'rgba(0,207,255,0.08)',
    glowColor: 'rgba(0,207,255,0.3)',
    icon: '⚡',
    dataRace: 'otomat',
    primaryCommanderPortrait: '/assets/characters/otomat/demiurge_prime.png',
    commanders: [
      { id: 'demiurge_prime', name: 'Demiurge Prime', portrait: '/assets/characters/otomat/demiurge_prime.png', race: Race.OTOMAT, level: 7, isUnlocked: true, story: 'Otomat ırkının yaratıcısı ve en güçlü varlığı.', abilities: ['Holografik Yansıma', 'Enerji Alanı', 'Geometrik Kesim'] },
      { id: 'aurelius', name: 'Aurelius', portrait: '/assets/characters/otomat/aurelius.png', race: Race.OTOMAT, level: 4, isUnlocked: true, story: 'Taktik hesaplama birimi ve strateji motoru.', abilities: ['Hesaplama Artışı', 'Grid Kilidi', 'Hassas Atış'] },
      { id: 'crucible', name: 'Crucible', portrait: '/assets/characters/otomat/crucible.png', race: Race.OTOMAT, level: 3, isUnlocked: false, story: 'Yüksek enerji silah platformu.', abilities: ['Plazma Topu', 'Enerji Tükenmez', 'Kale Modu'] },
    ],
    stats: { attack: 75, defense: 90, speed: 40, hp: 70 },
    structures: ['sonsuzluk_cekirdegi', 'atalar_magarasi'],
  },
  [Race.CANAVAR]: {
    name: 'Canavar',
    subtitle: 'Kadim Taş & Kan',
    description:
      'Kadim güçlerle beslenen Canavar ırkı, ham kuvvet ve yıkıcı saldırılarıyla savaş alanını altüst eder. Taş ve kemik dokulu zırhları onları durdurulamaz kılar.',
    lore:
      'Evrenin ilk çağlarından beri var olan Canavarlar, primitif ama yenilmez savaşçılardır. Ateş parçacıkları ve kadim lav akıntısıyla çevrili yapıları, her savaşta dehşet saçar.',
    color: '#ff6600',
    bgColor: 'rgba(255,102,0,0.08)',
    glowColor: 'rgba(255,102,0,0.3)',
    icon: '🔥',
    dataRace: 'canavar',
    primaryCommanderPortrait: '/assets/characters/canavar/khorvash.png',
    commanders: [
      { id: 'khorvash', name: 'Khorvash', portrait: '/assets/characters/canavar/khorvash.png', race: Race.CANAVAR, level: 6, isUnlocked: true, story: 'Canavar ırkının en korkunç savaşçısı ve klan lideri.', abilities: ['Ateş Nefesi', 'Taş Zırh', 'Yıkım Darbesi'] },
      { id: 'ravenna', name: 'Ravenna', portrait: '/assets/characters/canavar/ravenna.png', race: Race.CANAVAR, level: 4, isUnlocked: true, story: 'Kadim büyü ve fiziksel güç ustası.', abilities: ['Lav Patlaması', 'Kan Büyüsü', 'Taş Devrim'] },
      { id: 'ulrek', name: 'Ulrek', portrait: '/assets/characters/canavar/ulrek.png', race: Race.CANAVAR, level: 3, isUnlocked: false, story: 'Dev boyutlu yıkım makinesi.', abilities: ['Ezme', 'Yer Sarsıntısı', 'Primitif Öfke'] },
    ],
    stats: { attack: 95, defense: 70, speed: 35, hp: 90 },
    structures: ['atalar_magarasi', 'yutucu_tumsegi'],
  },
  [Race.SEYTAN]: {
    name: 'Şeytan',
    subtitle: 'Gotik Duman & Lanet',
    description:
      "Gotik mimari ve lanet enerjisiyle beslenen Şeytan ırkı, ruh dünyasından güç alarak düşmanlarına kâbus yaşatır. Kırmızı-mor glow ve rune sembolleri onları tanımlar.",
    lore:
      "Boyutlar arası yarıklardan geçen Şeytanlar, lanet ve büyünün en saf formunu kullanır. Malphas'ın yönetiminde duman ve karanlıkla örülü kalelerinde savaş taktiklerini mükemmelleştirirler.",
    color: '#cc00ff',
    bgColor: 'rgba(204,0,255,0.08)',
    glowColor: 'rgba(204,0,255,0.3)',
    icon: '💀',
    dataRace: 'seytan',
    primaryCommanderPortrait: '/assets/characters/seytan/malphas.png',
    commanders: [
      { id: 'malphas', name: 'Malphas', portrait: '/assets/characters/seytan/malphas.png', race: Race.SEYTAN, level: 8, isUnlocked: true, story: 'Şeytan ırkının en güçlü büyücüsü ve lanet ustası.', abilities: ['Lanet Fırtınası', 'Ruh Çalma', 'Karanlık Portal'] },
      { id: 'lilithra', name: 'Lilithra', portrait: '/assets/characters/seytan/lilithra.png', race: Race.SEYTAN, level: 5, isUnlocked: true, story: 'Kaos büyücüsü ve zihin bükücü.', abilities: ['Kaos Dalgası', 'Zihin Çürütme', 'Duman Kalkanı'] },
      { id: 'vorhaal', name: 'Vorhaal', portrait: '/assets/characters/seytan/vorhaal.png', race: Race.SEYTAN, level: 4, isUnlocked: false, story: 'Ölümsüz savaşçı ve lanet taşıyıcısı.', abilities: ['Ölümsüzlük', 'Lanet Dokunuşu', 'Karanlık Zırh'] },
      { id: 'azurath', name: 'Azurath', portrait: '/assets/characters/seytan/azurath.png', race: Race.SEYTAN, level: 3, isUnlocked: false, story: 'Boyutlar arası yolcu ve savaş runu ustası.', abilities: ['Boyut Kapısı', 'Rune Patlaması', 'Astral Yolculuk'] },
    ],
    stats: { attack: 90, defense: 55, speed: 65, hp: 60 },
    structures: ['karanlik_mahkeme', 'lanet_tapinagi'],
  },
};

export const UNIT_DISPLAY_NAMES: Record<UnitType, string> = {
  [UnitType.MARINE]:     'Denizci',
  [UnitType.MEDIC]:      'Sağlıkçı',
  [UnitType.SIEGE_TANK]: 'Kuşatma Tankı',
  [UnitType.GHOST]:      'Hayalet',
  [UnitType.ZERGLING]:   'Zergling',
  [UnitType.HYDRALISK]:  'Hidralize',
  [UnitType.ULTRALISK]:  'Ultralisk',
  [UnitType.QUEEN]:      'Kraliçe',
  [UnitType.SENTINEL]:   'Sentinel',
  [UnitType.FABRICATOR]: 'Fabricator',
  [UnitType.COLOSSUS]:   'Colossus',
  [UnitType.RAVAGER]:    'Ravager',
  [UnitType.PREDATOR]:   'Predator',
  [UnitType.TITAN]:      'Titan',
  [UnitType.SHADE]:      'Gölge',
  [UnitType.WARLOCK]:    'Büyücü',
  [UnitType.DREADLORD]:  'Korku Lordu',
};

export const DEMO_UNITS: Record<Race, PlayerUnit[]> = {
  [Race.INSAN]: [
    { id: 'h1', type: UnitType.MARINE, race: Race.INSAN, hp: 45, maxHp: 45, attack: 10, defense: 7, speed: 3, positionX: 2, positionY: 3, abilities: ['stimpack'], isAlive: true },
    { id: 'h2', type: UnitType.MEDIC, race: Race.INSAN, hp: 30, maxHp: 30, attack: 4, defense: 5, speed: 3, positionX: 3, positionY: 5, abilities: ['heal', 'restoration'], isAlive: true },
    { id: 'h3', type: UnitType.SIEGE_TANK, race: Race.INSAN, hp: 150, maxHp: 150, attack: 35, defense: 14, speed: 1, positionX: 5, positionY: 2, abilities: ['siege_mode'], isAlive: true },
  ],
  [Race.ZERG]: [
    { id: 'z1', type: UnitType.ZERGLING, race: Race.ZERG, hp: 32, maxHp: 35, attack: 9, defense: 3, speed: 6, positionX: 1, positionY: 1, abilities: ['adrenal_glands'], isAlive: true },
    { id: 'z2', type: UnitType.HYDRALISK, race: Race.ZERG, hp: 72, maxHp: 80, attack: 16, defense: 4, speed: 4, positionX: 4, positionY: 6, abilities: ['needle_spine'], isAlive: true },
    { id: 'z3', type: UnitType.QUEEN, race: Race.ZERG, hp: 175, maxHp: 175, attack: 14, defense: 6, speed: 3, positionX: 7, positionY: 3, abilities: ['spawn_larvae'], isAlive: true },
  ],
  [Race.OTOMAT]: [
    { id: 'o1', type: UnitType.SENTINEL, race: Race.OTOMAT, hp: 80, maxHp: 80, attack: 18, defense: 12, speed: 2, positionX: 3, positionY: 2, abilities: ['energy_shield'], isAlive: true },
    { id: 'o2', type: UnitType.COLOSSUS, race: Race.OTOMAT, hp: 200, maxHp: 200, attack: 40, defense: 20, speed: 1, positionX: 6, positionY: 4, abilities: ['plasma_cannon'], isAlive: true },
  ],
  [Race.CANAVAR]: [
    { id: 'c1', type: UnitType.RAVAGER, race: Race.CANAVAR, hp: 120, maxHp: 120, attack: 28, defense: 10, speed: 3, positionX: 2, positionY: 4, abilities: ['lava_burst'], isAlive: true },
    { id: 'c2', type: UnitType.TITAN, race: Race.CANAVAR, hp: 300, maxHp: 300, attack: 55, defense: 18, speed: 1, positionX: 8, positionY: 5, abilities: ['earthquake'], isAlive: true },
  ],
  [Race.SEYTAN]: [
    { id: 's1', type: UnitType.SHADE, race: Race.SEYTAN, hp: 60, maxHp: 60, attack: 22, defense: 5, speed: 5, positionX: 1, positionY: 2, abilities: ['shadow_step'], isAlive: true },
    { id: 's2', type: UnitType.WARLOCK, race: Race.SEYTAN, hp: 55, maxHp: 55, attack: 35, defense: 4, speed: 3, positionX: 5, positionY: 7, abilities: ['curse_wave'], isAlive: true },
  ],
};
