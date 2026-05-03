import { Race } from '@/types/units';

export interface QuizOption {
  id: string;
  label: string;
  scores: Partial<Record<Race, number>>;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const RACE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'tempo',
    prompt: 'Savaş tempon nasıl?',
    options: [
      {
        id: 'fast-rush',
        label: 'Hızlı saldırı, erken baskın',
        scores: { [Race.ZERG]: 3, [Race.INSAN]: 1 },
      },
      {
        id: 'slow-power',
        label: 'Yavaş ama güçlü kuşatma',
        scores: { [Race.OTOMAT]: 3, [Race.INSAN]: 2 },
      },
      {
        id: 'balanced',
        label: 'Duruma göre uyum sağlarım',
        scores: { [Race.INSAN]: 3, [Race.ZERG]: 1, [Race.OTOMAT]: 1 },
      },
    ],
  },
  {
    id: 'army',
    prompt: 'Tercih ettiğin ordu yapısı?',
    options: [
      {
        id: 'swarm',
        label: 'Kalabalık ve ucuz birimler',
        scores: { [Race.ZERG]: 3 },
      },
      {
        id: 'elite-tech',
        label: 'Az sayıda ileri teknoloji birimi',
        scores: { [Race.INSAN]: 2, [Race.OTOMAT]: 3 },
      },
      {
        id: 'mixed',
        label: 'Karma — özel yetenekli birimler',
        scores: { [Race.INSAN]: 3, [Race.ZERG]: 1 },
      },
    ],
  },
  {
    id: 'risk',
    prompt: 'Risk iştahın nasıl?',
    options: [
      {
        id: 'aggressive',
        label: 'Cesur, agresif — hata yapmayı göze alırım',
        scores: { [Race.ZERG]: 3, [Race.INSAN]: 1 },
      },
      {
        id: 'turtle',
        label: 'Sağlam savunma, sonra karşı saldırı',
        scores: { [Race.OTOMAT]: 3 },
      },
      {
        id: 'tactical',
        label: 'Planlı, taktiksel ilerleme',
        scores: { [Race.INSAN]: 3, [Race.OTOMAT]: 1 },
      },
    ],
  },
  {
    id: 'aesthetic',
    prompt: 'Hangi estetik seni daha çok çekiyor?',
    options: [
      {
        id: 'organic',
        label: 'Organik, biyolüminesan, yaşayan ordular',
        scores: { [Race.ZERG]: 3 },
      },
      {
        id: 'mechanical',
        label: 'Geometrik, holografik, mekanik',
        scores: { [Race.OTOMAT]: 3 },
      },
      {
        id: 'military',
        label: 'Askeri, teknolojik, klasik',
        scores: { [Race.INSAN]: 3 },
      },
    ],
  },
];

export interface QuizResult {
  recommended: Race;
  alternative: Race;
  scores: Record<Race, number>;
}

export function scoreQuiz(answers: Record<string, string>): QuizResult | null {
  const scores: Record<Race, number> = {
    [Race.INSAN]: 0,
    [Race.ZERG]: 0,
    [Race.OTOMAT]: 0,
    [Race.CANAVAR]: 0,
    [Race.SEYTAN]: 0,
  };

  let answered = 0;
  for (const question of RACE_QUIZ_QUESTIONS) {
    const optionId = answers[question.id];
    if (!optionId) continue;
    const option = question.options.find((o) => o.id === optionId);
    if (!option) continue;
    answered += 1;
    for (const [race, value] of Object.entries(option.scores)) {
      scores[race as Race] += value ?? 0;
    }
  }

  if (answered === 0) return null;

  const ranked = (Object.entries(scores) as [Race, number][]).sort((a, b) => b[1] - a[1]);
  return {
    recommended: ranked[0][0],
    alternative: ranked[1][0],
    scores,
  };
}
