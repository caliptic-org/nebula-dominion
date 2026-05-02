'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface VipStatus {
  vipLevel: number;
  currentXp: number;
  nextLevelXp: number;
  dailyClaimedAt: string | null;
}

export interface VipPlan {
  id: string;
  label: string;
  price: string;
  usd: string;
  duration: number;
  gems: number;
  tag: string | null;
  popular: boolean;
}

export interface DailyClaimReward {
  icon: string;
  label: string;
  color: string;
}

export interface DailyClaimResponse {
  rewards: DailyClaimReward[];
  dailyClaimedAt: string;
}

export interface PurchaseResponse {
  checkoutUrl: string;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
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

export function useVipStatus() {
  const [state, setState] = useState<AsyncState<VipStatus>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get<VipStatus>('/api/vip/status');
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'VIP durumu yüklenemedi',
      });
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
      const data = await api.get<VipPlan[]>('/api/vip/plans');
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Planlar yüklenemedi',
      });
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

export async function claimDailyVip(): Promise<DailyClaimResponse> {
  return api.post<DailyClaimResponse>('/api/vip/claim-daily');
}

export async function purchaseVip(planId: string): Promise<PurchaseResponse> {
  return api.post<PurchaseResponse>('/api/vip/purchase', { planId });
}
