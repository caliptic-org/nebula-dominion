export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  order: number;
  category: 'intro' | 'base' | 'combat' | 'progression' | 'completion';
  reward?: { gold?: number; gems?: number; xp?: number };
  skippable: boolean;
  nextStep: string | null;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Nebula Dominion\'a Hoş Geldiniz',
    description: 'Galaksiyi fethedecek komutanı tanıyalım. Adını ve komuta tarzını belirle.',
    order: 1,
    category: 'intro',
    reward: { gold: 100 },
    skippable: false,
    nextStep: 'race_selection',
  },
  {
    id: 'race_selection',
    title: 'Irk Seçimi',
    description: 'Savaşacağın ırkı seç: İnsan (denge), Zerg (sürü gücü), veya Automata (mekanik üstünlük).',
    order: 2,
    category: 'intro',
    reward: { gold: 200 },
    skippable: false,
    nextStep: 'base_overview',
  },
  {
    id: 'base_overview',
    title: 'Üssünü Tanı',
    description: 'Komuta Merkezi\'n tüm operasyonların kalbidir. Kaynaklarını ve yapılarını keşfet.',
    order: 3,
    category: 'base',
    reward: { gold: 150 },
    skippable: false,
    nextStep: 'first_building',
  },
  {
    id: 'first_building',
    title: 'İlk Yapı',
    description: 'Mineral Çıkarıcı inşa et. Kaynaklar büyümenin temelidir.',
    order: 4,
    category: 'base',
    reward: { gold: 300, gems: 5 },
    skippable: false,
    nextStep: 'resource_collection',
  },
  {
    id: 'resource_collection',
    title: 'Kaynak Toplama',
    description: 'Mineral ve gaz üretiyor. Enerji yönetimini öğren — her yapı enerji tüketir.',
    order: 5,
    category: 'base',
    reward: { gold: 250 },
    skippable: false,
    nextStep: 'first_unit',
  },
  {
    id: 'first_unit',
    title: 'İlk Birim',
    description: 'Kışlandan ilk savaş birimi üret. Her ırkın kendine özgü birimleri vardır.',
    order: 6,
    category: 'combat',
    reward: { gold: 350, gems: 10 },
    skippable: false,
    nextStep: 'combat_basics',
  },
  {
    id: 'combat_basics',
    title: 'Savaş Temelleri',
    description: 'Saldırı, savunma, hız değerlerini anla. Sıra tabanlı taktik savaş sistemini öğren.',
    order: 7,
    category: 'combat',
    reward: { gold: 200, xp: 75 },
    skippable: false,
    nextStep: 'first_pve_battle',
  },
  {
    id: 'first_pve_battle',
    title: 'İlk PvE Savaşı',
    description: 'Bir bot rakibe karşı ilk savaşını yap. Kazanmak zorunda değilsin — öğrenmek önemli!',
    order: 8,
    category: 'combat',
    reward: { gold: 500, gems: 20, xp: 150 },
    skippable: true,
    nextStep: 'progression_intro',
  },
  {
    id: 'progression_intro',
    title: 'İlerleme Sistemi',
    description: 'XP kazan, seviyeleri geç, yeni içeriklerin kilidini aç. 6 çağ ve 54 seviye seni bekliyor.',
    order: 9,
    category: 'progression',
    reward: { gold: 400, xp: 100 },
    skippable: false,
    nextStep: 'tutorial_complete',
  },
  {
    id: 'tutorial_complete',
    title: 'Tutorial Tamamlandı',
    description: 'Komutan olarak hazırsın! Galaksiyi fethetmek için galaksiye adım at.',
    order: 10,
    category: 'completion',
    reward: { gold: 1000, gems: 50, xp: 300 },
    skippable: false,
    nextStep: null,
  },
];

export function getStepById(id: string): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((s) => s.id === id);
}

export function getNextStep(currentId: string): TutorialStep | null {
  const current = getStepById(currentId);
  if (!current?.nextStep) return null;
  return getStepById(current.nextStep) ?? null;
}

export const TUTORIAL_STEP_IDS = TUTORIAL_STEPS.map((s) => s.id);
