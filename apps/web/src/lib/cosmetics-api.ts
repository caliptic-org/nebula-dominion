import {
  CosmeticItem,
  CosmeticCategory,
  CosmeticRarity,
  DEMO_COSMETICS,
  RARITY_META,
} from '@/types/cosmetics';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface CosmeticDTO {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  price: number | null;
  isOwned: boolean;
  isEquipped: boolean;
  icon: string;
  description: string;
  previewImage?: string | null;
}

interface BalanceDTO {
  gems: number;
}

interface PurchaseResponseDTO {
  newBalance: number;
}

function dtoToItem(dto: CosmeticDTO): CosmeticItem {
  const meta = RARITY_META[dto.rarity];
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    rarity: dto.rarity,
    price: dto.price ?? undefined,
    isOwned: dto.isOwned,
    isEquipped: dto.isEquipped,
    icon: dto.icon,
    description: dto.description,
    previewImage: dto.previewImage ?? undefined,
    rarityColor: meta.color,
    rarityGlow: meta.glow,
  };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `İstek başarısız: ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) msg = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Mock state (used only when NEXT_PUBLIC_USE_MOCK_API !== 'false') ─────────
let mockCosmetics: CosmeticItem[] | null = null;
let mockBalance = 1240;

function getMockInventory(): CosmeticItem[] {
  if (!mockCosmetics) mockCosmetics = DEMO_COSMETICS.map((c) => ({ ...c }));
  return mockCosmetics;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchCosmetics(): Promise<CosmeticItem[]> {
  if (USE_MOCK) {
    await delay(350);
    return getMockInventory().map((c) => ({ ...c }));
  }
  const data = await call<CosmeticDTO[]>('/api/cosmetics');
  return data.map(dtoToItem);
}

export async function fetchBalance(): Promise<number> {
  if (USE_MOCK) {
    await delay(250);
    return mockBalance;
  }
  const data = await call<BalanceDTO>('/api/user/balance');
  return data.gems;
}

export async function equipCosmetic(id: string): Promise<void> {
  if (USE_MOCK) {
    await delay(500);
    const inv = getMockInventory();
    const target = inv.find((c) => c.id === id);
    if (!target) throw new Error('Kozmetik bulunamadı');
    if (!target.isOwned) throw new Error('Bu öğeye sahip değilsiniz');
    for (const c of inv) {
      if (c.category === target.category) c.isEquipped = c.id === id;
    }
    return;
  }
  await call<void>(`/api/cosmetics/${encodeURIComponent(id)}/equip`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function purchaseCosmetic(
  id: string,
  idempotencyKey: string,
): Promise<{ newBalance: number }> {
  if (USE_MOCK) {
    await delay(700);
    const inv = getMockInventory();
    const target = inv.find((c) => c.id === id);
    if (!target) throw new Error('Kozmetik bulunamadı');
    if (target.isOwned) throw new Error('Bu öğeye zaten sahipsiniz');
    if (typeof target.price !== 'number') throw new Error('Bu öğe satın alınamaz');
    if (mockBalance < target.price) throw new Error('Yetersiz gem bakiyesi');
    mockBalance -= target.price;
    target.isOwned = true;
    return { newBalance: mockBalance };
  }
  return call<PurchaseResponseDTO>(
    `/api/cosmetics/${encodeURIComponent(id)}/purchase`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({}),
    },
  );
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
