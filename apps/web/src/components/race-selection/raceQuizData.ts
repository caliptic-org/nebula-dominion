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
    prompt: 'SavaÅŸ tempon nasÄ±l?',
    options: [
      {
        id: 'fast-rush',
        label: 'HÄ±zlÄ± saldÄ±rÄ±, erken baskÄ±n',
        scores: { [Race.ZERG]: 3, [Race.INSAN]: 1 },
      },
      {
        id: 'slow-power',
        label: 'YavaÅŸ ama gÃ¼Ã§lÃ¼ kuÅŸatma',
        scores: { [Race.OTOMAT]: 3, [Race.INSAN]: 2 },
      },
      {
        id: 'balanced',
        label: 'Duruma gÃ¶re uyum saÄŸlarÄ±m',
        scores: { [Race.INSAN]: 3, [Race.ZERG]: 1, [Race.OTOMAT]: 1 },
      },
    ],
  },
  {
    id: 'army',
    prompt: 'Tercih ettiÄŸin ordu yapÄ±sÄ±?',
    options: [
      {
        id: 'swarm',
        label: 'KalabalÄ±k ve ucuz birimler',
        scores: { [Race.ZERG]: 3 },
      },
      {
        id: 'elite-tech',
        label: 'Az sayÄ±da ileri teknoloji birimi',
        scores: { [Race.INSAN]: 2, [Race.OTOMAT]: 3 },
      },
      {
        id: 'mixed',
        label: 'Karma â€” Ã¶zel yetenekli birimler',
        scores: { [Race.INSAN]: 3, [Race.ZERG]: 1 },
      },
    ],
  },
  {
    id: 'risk',
    prompt: 'Risk iÅŸtahÄ±n nasÄ±l?',
    options: [
      {
        id: 'aggressive',
        label: 'Cesur, agresif â€” hata yapmayÄ± gÃ¶ze alÄ±rÄ±m',
        scores: { [Race.ZERG]: 3, [Race.INSAN]: 1 },
      },
      {
        id: 'turtle',
        label: 'SaÄŸlam savunma, sonra karÅŸÄ± saldÄ±rÄ±',
        scores: { [Race.OTOMAT]: 3 },
      },
      {
        id: 'tactical',
        label: 'PlanlÄ±, taktiksel ilerleme',
        scores: { [Race.INSAN]: 3, [Race.OTOMAT]: 1 },
      },
    ],
  },
  {
    id: 'aesthetic',
    prompt: 'Hangi estetik seni daha Ã§ok Ã§ekiyor?',
    options: [
      {
        id: 'organic',
        label: 'Organik, biyolÃ¼minesan, yaÅŸayan ordular',
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
