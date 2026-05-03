import { CHARACTER_ASSETS } from './assets';
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
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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

export type BackendRace = 'human' | 'zerg' | 'droid' | 'creature' | 'demon';

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

const RACE_MAP: Record<BackendRace, RaceKey> = {
  human:    'insan',
  zerg:     'zerg',
  droid:    'otomat',
  creature: 'canavar',
  demon:    'seytan',
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

export async function fetchPlayerUnits(playerId: string): Promise<BackendUnit[]> {
  return call<BackendUnit[]>(`${API}/units/player/${encodeURIComponent(playerId)}`);
}

export async function fetchTemplates(): Promise<FormationTemplate[]> {
  return call<FormationTemplate[]>(`${API}/formations/templates`);
}

export async function fetchFormations(
  playerId: string,
  page = 1,
  limit = 20,
): Promise<ListFormationsResponse> {
  const qs = new URLSearchParams({ playerId, page: String(page), limit: String(limit) });
  return call<ListFormationsResponse>(`${API}/formations?${qs}`);
}

export async function createFormation(req: CreateFormationRequest): Promise<Formation> {
  return call<Formation>(`${API}/formations`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
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
