import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import type { AbilityDef, BattleSnapshot, BattleUnit } from './types';

const PORTRAIT = (race: Race, file: string) => `/assets/characters/${RACE_DESCRIPTIONS[race].dataRace}/${file}`;

function unit(
  id: string,
  name: string,
  portrait: string,
  side: 'friendly' | 'enemy',
  hp: number,
  maxHp: number,
  morale: number,
  status: BattleUnit['status'],
  x: number,
  y: number,
  controlGroup?: number,
): BattleUnit {
  return { id, name, portrait, side, hp, maxHp, morale, status, x, y, controlGroup };
}

const COMMON_ABILITIES = (
  attack: { id: string; name: string; glyph: string; description: string },
  ultimate: { id: string; name: string; glyph: string; description: string },
): AbilityDef[] => [
  {
    id: attack.id, name: attack.name, hotkey: 'Q', glyph: attack.glyph,
    cooldownSeconds: 4, remainingCooldown: 0, description: attack.description,
  },
  {
    id: 'defend', name: 'Mevzilen', hotkey: 'W', glyph: '🛡',
    cooldownSeconds: 8, remainingCooldown: 3.2,
    description: 'Savunma duruşu — alınan hasar %35 azalır, hareket %50.',
  },
  {
    id: 'rally', name: 'Toplan', hotkey: 'E', glyph: '⚑',
    cooldownSeconds: 12, remainingCooldown: 0,
    description: 'Yakındaki dost birimleri çağırır, moral +15 verir.',
  },
  {
    id: ultimate.id, name: ultimate.name, hotkey: 'R', glyph: ultimate.glyph,
    cooldownSeconds: 60, remainingCooldown: 0, ultimate: true,
    description: ultimate.description,
  },
  {
    id: 'move', name: 'Yürü', hotkey: 'A', glyph: '↔',
    cooldownSeconds: 0, remainingCooldown: 0,
    description: 'Hedef noktaya yürüyerek ilerle.',
  },
  {
    id: 'special', name: 'Özel', hotkey: 'S', glyph: '✦',
    cooldownSeconds: 18, remainingCooldown: 6.8,
    description: 'Birime özgü ek yetenek.',
  },
];

const ABILITIES_BY_RACE: Record<Race, AbilityDef[]> = {
  [Race.INSAN]: COMMON_ABILITIES(
    { id: 'attack', name: 'Saldır', glyph: '⚔', description: 'Standart saldırı. Yakındaki düşmana otomatik atak.' },
    { id: 'airstrike', name: 'Hava Saldırısı', glyph: '✈', description: 'ULTİMATE: Hedef bölgeye orbital bombardıman.' },
  ),
  [Race.ZERG]: COMMON_ABILITIES(
    { id: 'rend', name: 'Yırt', glyph: '🦷', description: 'Kemiksi pençeyle parçala. Kanama uygular.' },
    { id: 'spawn', name: 'Sürü Doğur', glyph: '🥚', description: 'ULTİMATE: 5 zergling spawn et.' },
  ),
  [Race.OTOMAT]: COMMON_ABILITIES(
    { id: 'lance', name: 'Foton Mızrak', glyph: '◆', description: 'Geometrik enerji mızrağı. Kalkanı geçer.' },
    { id: 'teleport', name: 'Kuantum Sıçra', glyph: '◈', description: 'ULTİMATE: Tüm seçili birimleri ışınla.' },
  ),
  [Race.CANAVAR]: COMMON_ABILITIES(
    { id: 'crush', name: 'Ezme Vuruşu', glyph: '✊', description: 'Devasa darbe. Sersemletir.' },
    { id: 'quake', name: 'Yer Sarsıntısı', glyph: '⛰', description: 'ULTİMATE: Alanı yarar, kaya yağmuru.' },
  ),
  [Race.SEYTAN]: COMMON_ABILITIES(
    { id: 'curse', name: 'Lanet', glyph: '☠', description: 'Lanet uygula — düşman atak %30 düşer.' },
    { id: 'voidrift', name: 'Boyut Yarığı', glyph: '✶', description: 'ULTİMATE: Düşmanı void boyutuna sürgüne yolla.' },
  ),
};

function friendlyUnits(race: Race): BattleUnit[] {
  const cmdrs = RACE_DESCRIPTIONS[race].commanders;
  const positions: Array<[number, number]> = [
    [220, 380], [310, 250], [180, 470], [380, 320], [260, 540], [420, 200],
  ];
  return cmdrs.slice(0, 5).map((c, i) => unit(
    c.id,
    c.name,
    c.portrait,
    'friendly',
    [62, 88, 41, 100, 76][i] ?? 80,
    100,
    [85, 92, 38, 64, 71][i] ?? 80,
    (['attacking', 'defending', 'idle', 'moving', 'attacking'] as const)[i] ?? 'idle',
    positions[i]?.[0] ?? 200,
    positions[i]?.[1] ?? 300,
    i < 3 ? 1 : 2,
  ));
}

function enemyUnits(): BattleUnit[] {
  // Generic enemy avatars (no portrait — rendered as silhouettes).
  const positions: Array<[number, number]> = [
    [720, 200], [820, 320], [680, 460], [780, 540], [870, 240], [620, 380],
  ];
  return positions.map((pos, i) => unit(
    `enemy-${i + 1}`,
    `Düşman ${i + 1}`,
    '',
    'enemy',
    50 + i * 7,
    100,
    100,
    'attacking',
    pos[0],
    pos[1],
  ));
}

export function buildSnapshot(race: Race): BattleSnapshot {
  return {
    race,
    resources: { mineral: 1240, gas: 580, energy: 320 },
    resourceRates: { mineral: 18, gas: 7, energy: 4 },
    wave: { current: 7, total: 20, nextInSeconds: 42, totalSeconds: 60 },
    speed: 1,
    paused: false,
    units: friendlyUnits(race),
    enemies: enemyUnits(),
    combats: [
      { x: 540, y: 320 },
      { x: 600, y: 460 },
    ],
    selectedUnitId: friendlyUnits(race)[0]?.id ?? null,
    abilities: ABILITIES_BY_RACE[race].map((a) => ({ ...a })),
    controlGroups: [
      { num: 1, size: 3 },
      { num: 2, size: 2 },
      { num: 3, size: 0 },
    ],
    damageNumbers: [],
    populationCap: 30,
  };
}

export const ABILITIES = ABILITIES_BY_RACE;
