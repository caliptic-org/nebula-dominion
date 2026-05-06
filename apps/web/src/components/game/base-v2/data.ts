import { Race } from '@/types/units';
import { STRUCTURE_ASSETS, type StructureAssetKey } from '@/lib/assets';
import {
  ABILITY_ICONS,
  BUILDING_ISOS,
  BUILDING_THUMBS,
} from './asset-manifest';
import type {
  BaseBuilding,
  CommandAction,
  RaceBaseSnapshot,
} from './types';

/** Existing repo PNG used as a deterministic fallback when CAL-349 hasn't shipped that key. */
const structurePath = (key: StructureAssetKey) => STRUCTURE_ASSETS[key];

const cmdTrain = (
  id: string,
  hotkey: string,
  label: string,
  icon: string,
  spawnLabel: string,
  spawnIcon: string,
  cost: { mineral?: number; gas?: number; energy?: number; pop?: number },
  buildSeconds: number,
  description: string,
): CommandAction => ({
  id,
  hotkey,
  label,
  icon,
  costMineral: cost.mineral,
  costGas: cost.gas,
  costEnergy: cost.energy,
  popCost: cost.pop,
  buildSeconds,
  description,
  kind: 'train',
  spawnUnit: {
    unitKey: id,
    unitLabel: spawnLabel,
    unitIcon: spawnIcon,
  },
});

const cmdUpgrade = (
  id: string,
  hotkey: string,
  label: string,
  cost: { mineral?: number; gas?: number; energy?: number },
  description: string,
): CommandAction => ({
  id,
  hotkey,
  label,
  icon: '⬆',
  iconAsset: ABILITY_ICONS.special,
  costMineral: cost.mineral,
  costGas: cost.gas,
  costEnergy: cost.energy,
  description,
  kind: 'upgrade',
});

const cmdRally: CommandAction = {
  id: 'rally',
  hotkey: 'R',
  label: 'Toplanma',
  icon: '⚑',
  iconAsset: ABILITY_ICONS.rally,
  description: 'Üretilen birimler için toplanma noktası belirle.',
  kind: 'rally',
};

/** Race → snapshot. Mock numbers are tuned to read like an active session. */
export const BASE_SNAPSHOTS: Record<Race, RaceBaseSnapshot> = {
  [Race.INSAN]: {
    race: Race.INSAN,
    resources: {
      mineral: 1240,
      gas: 580,
      energy: 320,
      population: { current: 24, cap: 80 },
      rates: { mineral: 12, gas: 6, energy: -2 },
    },
    gridWidth: 14,
    gridHeight: 10,
    rallyPoint: { x: 8, y: 6 },
    pings: [
      { x: 12, y: 2, tone: 'enemy' },
      { x: 1, y: 8, tone: 'ally' },
      { x: 9, y: 9, tone: 'neutral' },
    ],
    buildings: [
      makeBuilding({
        id: 'cmdctr-01', type: 'command-center',
        name: 'Komuta Merkezi', sprite: structurePath('yutucu_yildiz_akademisi'),
        assetKey: 'human/command',
        level: 2, maxLevel: 5, hp: 1450, maxHp: 1500, isoX: 6, isoY: 4,
        status: 'producing', queueCapacity: 5,
        queue: [
          { id: 'q-cm-1', unitKey: 'scv', unitLabel: 'İşçi', unitIcon: '👷', buildSeconds: 14, remainingSeconds: 6 },
          { id: 'q-cm-2', unitKey: 'scv', unitLabel: 'İşçi', unitIcon: '👷', buildSeconds: 14, remainingSeconds: 14 },
        ],
        upgrade: { nextLevel: 3, costMineral: 400, costGas: 0, seconds: 60 },
        commands: [
          cmdTrain('train-scv', 'Q', 'İşçi Üret', '👷', 'İşçi', '👷', { mineral: 50, pop: 1 }, 14, 'Mineral ve gaz toplayan temel işçi.'),
          cmdUpgrade('up-cm', 'W', 'Komuta II', { mineral: 400 }, 'Komuta merkezini Çağ II teknolojisine yükseltir.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'barracks-01', type: 'barracks',
        name: 'Kışla I', sprite: structurePath('atalar_magarasi'),
        assetKey: 'human/barracks',
        level: 3, maxLevel: 5, hp: 820, maxHp: 1000, isoX: 3, isoY: 3,
        status: 'producing', queueCapacity: 5,
        queue: [
          { id: 'q-b1-1', unitKey: 'marine', unitLabel: 'Piyade', unitIcon: '🪖', buildSeconds: 18, remainingSeconds: 12 },
          { id: 'q-b1-2', unitKey: 'marine', unitLabel: 'Piyade', unitIcon: '🪖', buildSeconds: 18, remainingSeconds: 18 },
        ],
        upgrade: { nextLevel: 4, costMineral: 300, costGas: 150, seconds: 60 },
        commands: [
          cmdTrain('train-marine', 'Q', 'Piyade', '🪖', 'Piyade Askeri', '🪖', { mineral: 50, pop: 1 }, 18, 'Çok yönlü temel piyade birimi.'),
          cmdTrain('train-medic', 'W', 'Sağlıkçı', '✚', 'Sağlıkçı', '✚', { mineral: 50, gas: 25, pop: 1 }, 22, 'Müttefik birimleri iyileştirir.'),
          cmdUpgrade('up-marine', 'E', 'Stim Araştır', { mineral: 200, gas: 100 }, 'Piyadeler kısa süre %50 hızlı saldırır.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'factory-01', type: 'factory',
        name: 'Fabrika', sprite: structurePath('sonsuzluk_cekirdegi'),
        assetKey: 'human/factory',
        level: 1, maxLevel: 4, hp: 1100, maxHp: 1250, isoX: 9, isoY: 3,
        status: 'idle', queueCapacity: 4,
        queue: [],
        upgrade: { nextLevel: 2, costMineral: 200, costGas: 100, seconds: 45 },
        commands: [
          cmdTrain('train-tank', 'Q', 'Kuşatma Tankı', '🛡', 'Kuşatma Tankı', '🛡', { mineral: 150, gas: 100, pop: 3 }, 36, 'Ağır kuşatma topu, statik modda yüksek hasar.'),
          cmdTrain('train-hellion', 'W', 'Cehennem', '🔥', 'Cehennem', '🔥', { mineral: 100, gas: 0, pop: 2 }, 18, 'Hızlı alev fışkırtmacı.'),
          cmdUpgrade('up-factory', 'E', 'Tech Lab', { mineral: 50, gas: 25 }, 'Daha gelişmiş birimleri açar.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'refinery-01', type: 'refinery',
        name: 'Gaz Rafinerisi', sprite: structurePath('mutasyon_cukuru'),
        level: 1, maxLevel: 1, hp: 700, maxHp: 750, isoX: 11, isoY: 6,
        status: 'idle', queueCapacity: 0, queue: [],
        commands: [],
      }),
      makeBuilding({
        id: 'turret-01', type: 'turret',
        name: 'Savunma Kulesi', sprite: structurePath('karanlik_mahkeme'),
        level: 1, maxLevel: 3, hp: 250, maxHp: 250, isoX: 1, isoY: 5,
        status: 'idle', queueCapacity: 0, queue: [],
        upgrade: { nextLevel: 2, costMineral: 75, costGas: 0, seconds: 25 },
        commands: [
          cmdUpgrade('up-turret', 'Q', 'Hassasiyet+', { mineral: 75 }, 'Kule menzili %15 artar.'),
        ],
      }),
    ],
  },
  [Race.ZERG]: {
    race: Race.ZERG,
    resources: {
      mineral: 980, gas: 320, energy: 0,
      population: { current: 38, cap: 50 },
      rates: { mineral: 18, gas: 5, energy: 0 },
    },
    gridWidth: 14, gridHeight: 10,
    rallyPoint: { x: 7, y: 7 },
    pings: [
      { x: 13, y: 1, tone: 'enemy' },
      { x: 11, y: 9, tone: 'enemy' },
      { x: 2, y: 2, tone: 'neutral' },
    ],
    buildings: [
      makeBuilding({
        id: 'hatchery-01', type: 'hatchery',
        name: 'Kovan Kalbi', sprite: structurePath('kovan_kalbi'),
        assetKey: 'zerg/hive',
        level: 1, maxLevel: 3, hp: 1500, maxHp: 1500, isoX: 6, isoY: 4,
        status: 'producing', queueCapacity: 6,
        queue: [
          { id: 'q-h-1', unitKey: 'larva', unitLabel: 'Larva', unitIcon: '🪱', buildSeconds: 11, remainingSeconds: 4 },
          { id: 'q-h-2', unitKey: 'larva', unitLabel: 'Larva', unitIcon: '🪱', buildSeconds: 11, remainingSeconds: 11 },
        ],
        upgrade: { nextLevel: 2, costMineral: 150, costGas: 100, seconds: 65 },
        commands: [
          cmdTrain('train-drone', 'Q', 'Drone', '🪲', 'Drone', '🪲', { mineral: 50, pop: 1 }, 12, 'Toplayıcı işçi; ayrıca yapıya dönüşür.'),
          cmdTrain('train-zergling', 'W', 'Zergling', '🩸', 'Zergling', '🩸', { mineral: 50, pop: 1 }, 18, 'Hızlı, kalabalık halinde ölümcül.'),
          cmdUpgrade('up-hatch', 'E', 'Lair Yükselt', { mineral: 150, gas: 100 }, 'Çağ II zergleri için Lair açar.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'spawning-01', type: 'spawning-pool',
        name: 'Mutasyon Çukuru', sprite: structurePath('mutasyon_cukuru'),
        assetKey: 'zerg/spawning-pool',
        level: 2, maxLevel: 3, hp: 720, maxHp: 750, isoX: 3, isoY: 6,
        status: 'producing', queueCapacity: 5,
        queue: [
          { id: 'q-sp-1', unitKey: 'zergling', unitLabel: 'Zergling', unitIcon: '🩸', buildSeconds: 18, remainingSeconds: 9 },
        ],
        upgrade: { nextLevel: 3, costMineral: 100, costGas: 100, seconds: 50 },
        commands: [
          cmdTrain('train-hydra', 'Q', 'Hidralisk', '🦂', 'Hidralisk', '🦂', { mineral: 100, gas: 50, pop: 2 }, 24, 'Menzilli iskelet kıracı.'),
          cmdUpgrade('up-pool', 'W', 'Adrenal Bezi', { mineral: 200, gas: 200 }, 'Zergling saldırı hızı artar.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'evolution-01', type: 'evolution',
        name: 'Evrim Odası', sprite: structurePath('atalar_magarasi'),
        assetKey: 'zerg/spire',
        level: 1, maxLevel: 3, hp: 600, maxHp: 700, isoX: 9, isoY: 5,
        status: 'upgrading', queueCapacity: 0,
        queue: [],
        upgrade: { nextLevel: 2, costMineral: 100, costGas: 100, seconds: 80 },
        commands: [
          cmdUpgrade('up-melee', 'Q', 'Yakın Saldırı I', { mineral: 100, gas: 100 }, 'Tüm yakın dövüş birimleri +1 saldırı.'),
          cmdUpgrade('up-armor', 'W', 'Kalkan I', { mineral: 100, gas: 100 }, 'Tüm zerg birimleri +1 zırh.'),
        ],
      }),
      makeBuilding({
        id: 'extractor-01', type: 'extractor',
        name: 'Özüt', sprite: structurePath('lanet_tapinagi'),
        level: 1, maxLevel: 1, hp: 540, maxHp: 600, isoX: 11, isoY: 7,
        status: 'idle', queueCapacity: 0, queue: [],
        commands: [],
      }),
    ],
  },
  [Race.OTOMAT]: {
    race: Race.OTOMAT,
    resources: {
      mineral: 1480, gas: 640, energy: 540,
      population: { current: 18, cap: 60 },
      rates: { mineral: 9, gas: 4, energy: 8 },
    },
    gridWidth: 14, gridHeight: 10,
    rallyPoint: { x: 9, y: 7 },
    pings: [
      { x: 12, y: 8, tone: 'enemy' },
      { x: 2, y: 1, tone: 'ally' },
    ],
    buildings: [
      makeBuilding({
        id: 'nexus-01', type: 'nexus',
        name: 'Sonsuzluk Çekirdeği', sprite: structurePath('sonsuzluk_cekirdegi'),
        assetKey: 'automat/nexus',
        level: 2, maxLevel: 5, hp: 1700, maxHp: 1750, isoX: 6, isoY: 4,
        status: 'producing', queueCapacity: 5,
        queue: [
          { id: 'q-n-1', unitKey: 'probe', unitLabel: 'Probe', unitIcon: '🛰', buildSeconds: 12, remainingSeconds: 5 },
        ],
        upgrade: { nextLevel: 3, costMineral: 350, costGas: 0, seconds: 70 },
        commands: [
          cmdTrain('train-probe', 'Q', 'Probe', '🛰', 'Probe', '🛰', { mineral: 50, pop: 1 }, 12, 'Mineral/Gaz toplayan otomat.'),
          cmdUpgrade('up-nexus', 'W', 'Çekirdek III', { mineral: 350 }, 'Yapı kademesini yükselt.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'gateway-01', type: 'gateway',
        name: 'Geçit', sprite: structurePath('atalar_magarasi'),
        assetKey: 'automat/forge',
        level: 1, maxLevel: 4, hp: 800, maxHp: 1000, isoX: 4, isoY: 5,
        status: 'producing', queueCapacity: 4,
        queue: [
          { id: 'q-g-1', unitKey: 'sentinel', unitLabel: 'Sentinel', unitIcon: '🛡', buildSeconds: 26, remainingSeconds: 16 },
        ],
        upgrade: { nextLevel: 2, costMineral: 200, costGas: 100, seconds: 50 },
        commands: [
          cmdTrain('train-sentinel', 'Q', 'Sentinel', '🛡', 'Sentinel', '🛡', { mineral: 100, gas: 25, pop: 2 }, 26, 'Kalkanlı temel piyade.'),
          cmdTrain('train-stalker', 'W', 'Stalker', '⚡', 'Stalker', '⚡', { mineral: 125, gas: 50, pop: 2 }, 32, 'Blink yeteneği olan menzilli.'),
          cmdUpgrade('up-warpgate', 'E', 'Warp Gate', { mineral: 50, gas: 50 }, 'Geçidi Warp Gate moduna yükselt.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'cybercore-01', type: 'cybercore',
        name: 'Sibernetik Çekirdek', sprite: structurePath('yutucu_yildiz_akademisi'),
        level: 1, maxLevel: 3, hp: 550, maxHp: 700, isoX: 8, isoY: 6,
        status: 'idle', queueCapacity: 0, queue: [],
        upgrade: { nextLevel: 2, costMineral: 150, costGas: 150, seconds: 55 },
        commands: [
          cmdUpgrade('up-air', 'Q', 'Hava Saldırı I', { mineral: 150, gas: 150 }, 'Tüm hava birimleri +1 saldırı.'),
          cmdUpgrade('up-ground', 'W', 'Yer Saldırı I', { mineral: 100, gas: 100 }, 'Tüm yer birimleri +1 saldırı.'),
        ],
      }),
      makeBuilding({
        id: 'pylon-01', type: 'pylon',
        name: 'Sütun', sprite: structurePath('lanet_tapinagi'),
        assetKey: 'automat/pylon',
        level: 1, maxLevel: 1, hp: 200, maxHp: 200, isoX: 10, isoY: 4,
        status: 'idle', queueCapacity: 0, queue: [],
        commands: [],
      }),
    ],
  },
  [Race.CANAVAR]: {
    race: Race.CANAVAR,
    resources: {
      mineral: 720, gas: 380, energy: 0,
      population: { current: 14, cap: 40 },
      rates: { mineral: 8, gas: 3, energy: 0 },
    },
    gridWidth: 14, gridHeight: 10,
    rallyPoint: { x: 6, y: 7 },
    pings: [
      { x: 10, y: 9, tone: 'enemy' },
      { x: 2, y: 6, tone: 'neutral' },
    ],
    buildings: [
      makeBuilding({
        id: 'altar-01', type: 'altar',
        name: 'Atalar Mağarası', sprite: structurePath('atalar_magarasi'),
        assetKey: 'beast/stronghold',
        level: 2, maxLevel: 4, hp: 1300, maxHp: 1400, isoX: 6, isoY: 4,
        status: 'producing', queueCapacity: 5,
        queue: [
          { id: 'q-a-1', unitKey: 'ravager', unitLabel: 'Ravager', unitIcon: '🐗', buildSeconds: 30, remainingSeconds: 21 },
        ],
        upgrade: { nextLevel: 3, costMineral: 300, costGas: 200, seconds: 70 },
        commands: [
          cmdTrain('train-ravager', 'Q', 'Ravager', '🐗', 'Ravager', '🐗', { mineral: 100, gas: 50, pop: 2 }, 30, 'Vahşi yakın dövüşçü.'),
          cmdTrain('train-titan', 'W', 'Titan', '🦣', 'Titan', '🦣', { mineral: 250, gas: 200, pop: 6 }, 60, 'Devasa yıkım birimi.'),
          cmdUpgrade('up-altar', 'E', 'Mağarayı Yükselt', { mineral: 300, gas: 200 }, 'Yeni primitif yetenekleri açar.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'pit-01', type: 'pit',
        name: 'Yutucu Tümseği', sprite: structurePath('yutucu_tumsegi'),
        level: 1, maxLevel: 3, hp: 700, maxHp: 800, isoX: 4, isoY: 6,
        status: 'idle', queueCapacity: 4,
        queue: [],
        upgrade: { nextLevel: 2, costMineral: 200, costGas: 100, seconds: 55 },
        commands: [
          cmdTrain('train-predator', 'Q', 'Predator', '🐅', 'Predator', '🐅', { mineral: 100, gas: 25, pop: 2 }, 24, 'Pusu uzmanı yırtıcı.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'totem-01', type: 'totem',
        name: 'Kan Totemi', sprite: structurePath('karanlik_mahkeme'),
        level: 1, maxLevel: 3, hp: 320, maxHp: 400, isoX: 9, isoY: 5,
        status: 'idle', queueCapacity: 0, queue: [],
        upgrade: { nextLevel: 2, costMineral: 100, costGas: 50, seconds: 30 },
        commands: [
          cmdUpgrade('up-totem', 'Q', 'Kan Çağrısı', { mineral: 100, gas: 50 }, 'Yakındaki birimler +%10 saldırı hızı.'),
        ],
      }),
    ],
  },
  [Race.SEYTAN]: {
    race: Race.SEYTAN,
    resources: {
      mineral: 860, gas: 420, energy: 240,
      population: { current: 20, cap: 60 },
      rates: { mineral: 10, gas: 4, energy: 6 },
    },
    gridWidth: 14, gridHeight: 10,
    rallyPoint: { x: 8, y: 7 },
    pings: [
      { x: 12, y: 6, tone: 'enemy' },
      { x: 1, y: 1, tone: 'ally' },
    ],
    buildings: [
      makeBuilding({
        id: 'court-01', type: 'court',
        name: 'Karanlık Mahkeme', sprite: structurePath('karanlik_mahkeme'),
        level: 2, maxLevel: 5, hp: 1380, maxHp: 1500, isoX: 6, isoY: 4,
        status: 'producing', queueCapacity: 5,
        queue: [
          { id: 'q-c-1', unitKey: 'shade', unitLabel: 'Gölge', unitIcon: '👻', buildSeconds: 20, remainingSeconds: 13 },
        ],
        upgrade: { nextLevel: 3, costMineral: 350, costGas: 200, seconds: 65 },
        commands: [
          cmdTrain('train-shade', 'Q', 'Gölge', '👻', 'Gölge', '👻', { mineral: 75, gas: 25, pop: 1 }, 20, 'Çevik suikastçı.'),
          cmdTrain('train-warlock', 'W', 'Büyücü', '🔮', 'Büyücü', '🔮', { mineral: 150, gas: 100, pop: 3 }, 32, 'Lanet ve void enerjisi büyücüsü.'),
          cmdUpgrade('up-court', 'E', 'Mahkeme III', { mineral: 350, gas: 200 }, 'Mahkemeyi bir sonraki çağa yükselt.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'temple-01', type: 'temple',
        name: 'Lanet Tapınağı', sprite: structurePath('lanet_tapinagi'),
        level: 1, maxLevel: 3, hp: 800, maxHp: 950, isoX: 4, isoY: 6,
        status: 'producing', queueCapacity: 4,
        queue: [
          { id: 'q-t-1', unitKey: 'dreadlord', unitLabel: 'Korku Lordu', unitIcon: '🦇', buildSeconds: 50, remainingSeconds: 36 },
        ],
        upgrade: { nextLevel: 2, costMineral: 200, costGas: 150, seconds: 50 },
        commands: [
          cmdTrain('train-dread', 'Q', 'Korku Lordu', '🦇', 'Korku Lordu', '🦇', { mineral: 200, gas: 150, pop: 4 }, 50, 'Ölümsüz lanet taşıyıcısı.'),
          cmdRally,
        ],
      }),
      makeBuilding({
        id: 'gate-01', type: 'void-gate',
        name: 'Boşluk Kapısı', sprite: structurePath('sonsuzluk_cekirdegi'),
        assetKey: 'demon/portal',
        level: 1, maxLevel: 3, hp: 460, maxHp: 600, isoX: 9, isoY: 5,
        status: 'idle', queueCapacity: 3, queue: [],
        upgrade: { nextLevel: 2, costMineral: 150, costGas: 100, seconds: 45 },
        commands: [
          cmdUpgrade('up-gate', 'Q', 'Boyut Kapı II', { mineral: 150, gas: 100 }, 'Daha büyük portallar açar.'),
        ],
      }),
    ],
  },
};

interface MakeBuildingArgs {
  id: string;
  type: string;
  name: string;
  /** Pre-resolved fallback sprite path (existing structure PNG). */
  sprite: string;
  /** Optional CAL-349 manifest key like `human/command`. */
  assetKey?: string;
  level: number;
  maxLevel: number;
  hp: number;
  maxHp: number;
  isoX: number;
  isoY: number;
  status: BaseBuilding['status'];
  queue: BaseBuilding['queue'];
  queueCapacity: number;
  upgrade?: BaseBuilding['upgrade'];
  commands: CommandAction[];
}

function makeBuilding(b: MakeBuildingArgs): BaseBuilding {
  const iso = (b.assetKey && BUILDING_ISOS[b.assetKey]) || b.sprite;
  const thumbnail = (b.assetKey && BUILDING_THUMBS[b.assetKey]) || iso;
  return {
    id: b.id,
    type: b.type,
    name: b.name,
    thumbnail,
    isoSprite: iso,
    level: b.level,
    maxLevel: b.maxLevel,
    hp: b.hp,
    maxHp: b.maxHp,
    isoX: b.isoX,
    isoY: b.isoY,
    status: b.status,
    queue: b.queue,
    queueCapacity: b.queueCapacity,
    upgrade: b.upgrade,
    commands: b.commands,
  };
}
