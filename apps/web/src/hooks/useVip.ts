'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';

// ── Wire-format types (snake_case, matching backend) ─────────────────────────

interface VipStatusWire {
  vip_level: number;
  current_xp: number;
  next_level_xp: number;
  expiry_date: string | null;
  is_active: boolean;
  daily_claimed_at: string | null;
}

interface VipPlanWire {
  id: string;
  label: string;
  price_try: number;
  price_usd: number;
  duration_days: number;
  bonus_gems: number;
}

interface VipRewardWire {
  type: 'gems' | 'xp' | string;
  amount: number;
  label: string;
}

interface ClaimDailyWire {
  rewards: VipRewardWire[];
  already_claimed: boolean;
  next_claim_at: string;
}

interface PurchaseWire {
  checkout_url: string;
}

// ── App-facing types (camelCase + UI-derived fields) ─────────────────────────

export interface VipStatus {
  vipLevel: number;
  currentXp: number;
  nextLevelXp: number;
  expiryDate: string | null;
  isActive: boolean;
  dailyClaimedAt: string | null;
}

export interface VipPlan {
  id: string;
  label: string;
  priceTry: number;
  priceUsd: number;
  durationDays: number;
  bonusGems: number;
  /** Pre-formatted "₺179,99" for display */
  priceTryFormatted: string;
  /** Pre-formatted "$4.99" for display */
  priceUsdFormatted: string;
  /** UI-only badge ("POPÜLER", "EN İYİ DEĞER", null) — derived client-side */
  tag: string | null;
  popular: boolean;
}

export interface VipReward {
  type: string;
  amount: number;
  label: string;
  /** UI emoji derived from reward type */
  icon: string;
  /** UI accent color derived from reward type */
  color: string;
}

export interface ClaimDailyResult {
  rewards: VipReward[];
  alreadyClaimed: boolean;
  nextClaimAt: string;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PLAN_TAGS: Record<string, { tag: string; popular: boolean }> = {
  quarterly: { tag: 'POPÜLER', popular: true },
  annual: { tag: 'EN İYİ DEĞER', popular: false },
};

const REWARD_DISPLAY: Record<string, { icon: string; color: string }> = {
  gems: { icon: '💎', color: '#00cfff' },
  xp: { icon: '⚡', color: '#FFD700' },
};

const REWARD_FALLBACK = { icon: '🎁', color: '#FFD700' };

function mapStatus(w: VipStatusWire): VipStatus {
  return {
    vipLevel: w.vip_level,
    currentXp: w.current_xp,
    nextLevelXp: w.next_level_xp,
    expiryDate: w.expiry_date,
    isActive: w.is_active,
    dailyClaimedAt: w.daily_claimed_at,
  };
}

function mapPlan(w: VipPlanWire): VipPlan {
  const meta = PLAN_TAGS[w.id] ?? { tag: null, popular: false };
  return {
    id: w.id,
    label: w.label,
    priceTry: w.price_try,
    priceUsd: w.price_usd,
    durationDays: w.duration_days,
    bonusGems: w.bonus_gems,
    priceTryFormatted: TRY_FORMATTER.format(w.price_try),
    priceUsdFormatted: USD_FORMATTER.format(w.price_usd),
    tag: meta.tag,
    popular: meta.popular,
  };
}

function mapReward(w: VipRewardWire): VipReward {
  const display = REWARD_DISPLAY[w.type] ?? REWARD_FALLBACK;
  return { ...w, ...display };
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useVipStatus() {
  const [state, setState] = useState<AsyncState<VipStatus>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const wire = await api.get<VipStatusWire>('/api/vip/status');
      setState({ data: mapStatus(wire), loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: errorMessage(err, 'VIP durumu yüklenemedi') });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const setStatus = useCallback((updater: (prev: VipStatus) => VipStatus) => {
    setState((s) => (s.data ? { ...s, data: updater(s.data) } : s));
  }, []);

  return {
    status: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchStatus,
    setStatus,
    claimedToday: isToday(state.data?.dailyClaimedAt ?? null),
  };
}

export function useVipPlans() {
  const [state, setState] = useState<AsyncState<VipPlan[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchPlans = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const wire = await api.get<VipPlanWire[]>('/api/vip/plans');
      setState({ data: wire.map(mapPlan), loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: errorMessage(err, 'Planlar yüklenemedi') });
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchPlans,
  };
}

export async function claimDailyVip(): Promise<ClaimDailyResult> {
  const wire = await api.post<ClaimDailyWire>('/api/vip/claim-daily');
  return {
    rewards: wire.rewards.map(mapReward),
    alreadyClaimed: wire.already_claimed,
    nextClaimAt: wire.next_claim_at,
  };
}

export async function purchaseVip(planId: string): Promise<{ checkoutUrl: string }> {
  const wire = await api.post<PurchaseWire>('/api/vip/purchase', { plan_id: planId });
  return { checkoutUrl: wire.checkout_url };
}

export { FetchError };
