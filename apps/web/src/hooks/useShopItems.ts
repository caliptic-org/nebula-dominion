'use client';

import { useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';

/* Shop catalog client — GET /api/v1/shop (JWT).
 *
 * Returns backend-seeded shop items so the /shop screen can show a "live"
 * section alongside its rich race-flavoured mock catalog. The mock catalog
 * stays in place because the backend table only carries a small demo seed;
 * once a full catalog is seeded, the page can switch to live-only. */

export interface ShopItemDto {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  rarity: string;
  priceNebulaCoins: number | null;
  priceVoidCrystals: number | null;
  pricePremiumGems: number | null;
  priceRealUsd: number | null;
  priceRealTry: number | null;
  content: Record<string, unknown>;
  previewAsset: string | null;
  isLimited: boolean;
  limitedStock: number | null;
  stockRemaining: number | null;
  isActive: boolean;
  sortOrder: number;
  tags: string[];
  [key: string]: unknown;
}

interface UseShopItemsResult {
  items: ShopItemDto[];
  loading: boolean;
  error: string | null;
  authenticated: boolean;
}

export function useShopItems(): UseShopItemsResult {
  const [items, setItems] = useState<ShopItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ShopItemDto[]>('/shop')
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof FetchError && err.status === 401) {
          setAuthenticated(false);
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error, authenticated };
}
