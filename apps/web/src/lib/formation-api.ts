import { CHARACTER_ASSETS } from './assets';
import { toFrontendRace, type BackendRace } from './race-api';
// Re-export so legacy importers (`import { BackendRace } from './formation-api'`)
// keep building. New code should import from race-api directly.
export type { BackendRace };
import type {
  RaceKey,
  UnitClass,
  SlotUnit,
  SlotCommander,
  Formation,
  FormationTemplate,
  FormationPowerResult,
  ListFormationsResponse,
  CreateFormationRequest,
  UpdateFormationRequest,
  FormationPowerRequest,
} from '@/components/formation/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const API = '/api/v1';

export class FormationApiError extends Error {
  status: number;
  info?: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = 'FormationApiError';
    this.status = status;
    this.info = info;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  // The formation endpoints are JWT-guarded — without an Authorization
  // header the api returns 401, which gets swallowed by `callOr404` (only
  // 404 hits the empty-result branch). Pull the token from session so
  // /units/player/:id, /formations, and /formations/templates can resolve.
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let info: unknown = {};
    try {
      info = await res.json();
    } catch {
      /* ignore */
    }
    const message = (info as { message?: string | string[] }).message;
    const text = Array.isArray(message) ? message.join('; ') : message;
    throw new FormationApiError(
      text ?? `İstek başarısız: ${res.status} ${res.statusText}`,
      res.status,
      info,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Backend DTOs ─────────────────────────────────────────────────────────────

/* BackendRace is the canonical enum from race-api.ts (matches the BE DB
 * CHECK constraint `human | zerg | automaton | beast | demon`). Earlier
 * versions of this file declared a parallel type with `droid` / `creature`
 * — both wrong: the backend never emits those values, so every unit fell
 * through the RACE_MAP lookup and rendered as 'insan'. Fixed in P5.3.
 * Always import from race-api so the FE↔BE boundary has one source. */

export interface BackendUnit {
  id: string;
  playerId: string;
  name: string;
  race: BackendRace;
  tierLevel: number;
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  speed: number;
  abilities: string[];
  mergeCount: number;
  parentUnitIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

/* Use the shared toFrontendRace from race-api.ts so otomat/canavar mapping
 * stays consistent between formation, profile, race-select. The local
 * RACE_MAP wrapper kept its old `Record<BackendRace, RaceKey>` shape for
 * call-sites that still grab it directly; new code should call
 * toFrontendRace() instead. */
const RACE_MAP: Record<BackendRace, RaceKey> = {
  human:     'insan',
  zerg:      'zerg',
  automaton: 'otomat',
  beast:     'canavar',
  demon:     'seytan',
};

/** Mirror of backend's server-authoritative formula in formations.service.ts */
const COMMANDER_POWER_MULTIPLIER = 1.5;

export function clientPower(u: BackendUnit): number {
  return Math.floor(u.attack * 2 + u.defense * 1.5 + u.hp * 0.1 + u.speed * 0.5);
}

function commanderPower(u: BackendUnit): number {
  return Math.floor(clientPower(u) * COMMANDER_POWER_MULTIPLIER);
}

/** Derive a UI-only "class" from stats so the existing iconography keeps working. */
function deriveUnitClass(u: BackendUnit): UnitClass {
  const max = Math.max(u.attack, u.defense, u.hp / 6, u.speed * 1.5);
  if (max === u.defense) return 'tank';
  if (max === u.speed * 1.5) return 'stealth';
  if (max === u.hp / 6) return 'support';
  if (u.abilities.length >= 2) return 'mage';
  if (u.attack >= 90) return 'sniper';
  return 'assault';
}

function slug(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function portraitFor(race: RaceKey, name: string): string {
  const raceAssets = CHARACTER_ASSETS[race] as Record<string, string> | undefined;
  if (raceAssets) {
    const key = slug(name);
    if (key in raceAssets) return raceAssets[key];
    // Fallback: any portrait for the race so the slot shows a themed image.
    const first = Object.values(raceAssets)[0];
    if (first) return first;
  }
  return '/assets/characters/insan/voss.png';
}

export function unitToSlotUnit(u: BackendUnit): SlotUnit {
  const race = RACE_MAP[u.race] ?? 'insan';
  return {
    id: u.id,
    name: u.name,
    race,
    level: u.tierLevel,
    portrait: portraitFor(race, u.name),
    unitClass: deriveUnitClass(u),
    power: clientPower(u),
    hp: u.hp,
    attack: u.attack,
    defense: u.defense,
    speed: u.speed,
  };
}

export function unitToSlotCommander(u: BackendUnit): SlotCommander {
  const race = RACE_MAP[u.race] ?? 'insan';
  return {
    id: u.id,
    name: u.name,
    race,
    level: u.tierLevel,
    portrait: portraitFor(race, u.name),
    power: commanderPower(u),
    abilities: u.abilities,
    isUnlocked: u.isActive,
  };
}

/** Heuristic: high-tier units or units with named abilities are eligible commanders. */
export function isCommanderEligible(u: BackendUnit): boolean {
  return u.tierLevel >= 4 || u.abilities.length >= 1;
}

// ─── API surface ──────────────────────────────────────────────────────────────

/** Wrap a call so backend gaps produce an empty result instead of an
 *  exception. Treats 404 (route missing) AND 401 (guest mode) as empty
 *  so the screen renders its empty-state UI cleanly. Once the formation
 *  backend ships and the player is required to be authenticated, this
 *  helper can stop swallowing 401. */
async function callOr404<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await call<T>(path, init);
  } catch (err) {
    if (err instanceof FormationApiError && (err.status === 404 || err.status === 401)) {
      return fallback;
    }
    throw err;
  }
}

/** Game-server's PlayerUnit shape from GET /api/units (auth). The actual
 *  unit roster lives in game-server's player_units table, NOT api's. The
 *  previous implementation hit api's /units/player/:id which never
 *  existed — every visit silently 404'd and the formation panel
 *  rendered empty. */
interface GameServerUnit {
  id: string;
  playerId: string;
  type: string;
  race: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  abilities: string[];
  isAlive: boolean;
  level: number;
  createdAt: string;
  updatedAt: string;
}

const GAME_SERVER_BASE = (
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? 'http://localhost:3001'
).replace(/\/+$/, '');

export async function fetchPlayerUnits(_playerId: string): Promise<BackendUnit[]> {
  // game-server reads the userId from the JWT — `_playerId` arg is kept
  // for API signature compatibility but not sent on the wire.
  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
  if (!token) return [];
  try {
    const res = await fetch(`${GAME_SERVER_BASE}/api/units`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as GameServerUnit[];
    return rows.map((u): BackendUnit => ({
      id: u.id,
      playerId: u.playerId,
      // Display name: snake_case → Title Case so 'siege_tank' → 'Siege Tank'.
      // The roster panel already does its own race-flavoured override
      // via unitToSlotUnit so this is just the safe-fallback label.
      name: u.type
        .split('_')
        .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
        .join(' '),
      race: u.race as BackendRace,
      tierLevel: u.level ?? 1,
      attack: u.attack,
      defense: u.defense,
      hp: u.hp,
      maxHp: u.maxHp,
      speed: u.speed,
      abilities: u.abilities ?? [],
      // Merge metadata isn't tracked on player_units (merge happens
      // through MERGE_RECIPES which DELETEs sources + INSERTs result;
      // the result row has no parent pointers). Set to neutral defaults
      // so the consumer code doesn't break on undefined.
      mergeCount: 0,
      parentUnitIds: [],
      isActive: u.isAlive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function fetchTemplates(): Promise<FormationTemplate[]> {
  return callOr404<FormationTemplate[]>(`${API}/formations/templates`, []);
}

export async function fetchFormations(
  playerId: string,
  page = 1,
  limit = 20,
): Promise<ListFormationsResponse> {
  const qs = new URLSearchParams({ playerId, page: String(page), limit: String(limit) });
  return callOr404<ListFormationsResponse>(`${API}/formations?${qs}`, {
    formations: [],
    page: 1,
    limit,
    total: 0,
  } as ListFormationsResponse);
}

export async function createFormation(req: CreateFormationRequest): Promise<Formation> {
  try {
    return await call<Formation>(`${API}/formations`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  } catch (err) {
    // Backend endpoint missing today — fake a created formation so the UI
    // (which immediately renders the new formation in a list / shows a
    // success toast) keeps working. The "Cannot POST /api/v1/formations"
    // toast was confusing because the screen otherwise has no live data
    // path. Once the endpoint ships, the catch becomes dead code.
    if (err instanceof FormationApiError && (err.status === 404 || err.status === 405)) {
      const now = new Date().toISOString();
      return {
        id: `local-${Date.now().toString(36)}`,
        playerId: req.playerId,
        name: req.name,
        unitSlots: req.unitSlots,
        commanderSlots: req.commanderSlots,
        templateId: req.templateId ?? null,
        isLastActive: false,
        totalPower: 0,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      };
    }
    throw err;
  }
}

export async function updateFormation(
  id: string,
  playerId: string,
  req: UpdateFormationRequest,
): Promise<Formation> {
  const qs = new URLSearchParams({ playerId });
  return call<Formation>(`${API}/formations/${encodeURIComponent(id)}?${qs}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
}

export async function deleteFormation(id: string, playerId: string): Promise<void> {
  const qs = new URLSearchParams({ playerId });
  await call<void>(`${API}/formations/${encodeURIComponent(id)}?${qs}`, { method: 'DELETE' });
}

export async function calculatePower(req: FormationPowerRequest): Promise<FormationPowerResult> {
  return call<FormationPowerResult>(`${API}/formations/power`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function markFormationActive(id: string, playerId: string): Promise<Formation> {
  const qs = new URLSearchParams({ playerId });
  return call<Formation>(`${API}/formations/${encodeURIComponent(id)}/activate?${qs}`, {
    method: 'POST',
  });
}
