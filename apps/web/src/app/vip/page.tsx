'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import {
  useVipStatus,
  useVipPlans,
  claimDailyVip,
  purchaseVip,
  type VipPlan,
  type DailyClaimReward,
} from '@/hooks/useVip';

interface VipLevel {
  level: number;
  label: string;
  xpRequired: number;
  icon: string;
  benefits: VipBenefit[];
}

interface VipBenefit {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocksAt: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
}

const ALL_BENEFITS: VipBenefit[] = [
  { id: 'daily-coins',    icon: '💎', title: 'Günlük +50 Kristal',     description: 'Her gün otomatik 50 Nebula Kristali',    unlocksAt: 1,  tier: 'bronze'    },
  { id: 'xp-boost',      icon: '⚡', title: '2× XP Kazanımı',          description: 'Tüm görevlerden 2 kat deneyim puanı',    unlocksAt: 1,  tier: 'bronze'    },
  { id: 'ad-free',       icon: '🚫', title: 'Reklamsız Deneyim',        description: 'Oyun içi reklamlar tamamen devre dışı',  unlocksAt: 1,  tier: 'bronze'    },
  { id: 'build-queue',   icon: '🏗️', title: '+1 İnşaat Kuyruğu',       description: 'Aynı anda 2 yapı inşa et',               unlocksAt: 2,  tier: 'silver'    },
  { id: 'resource-10',   icon: '⛏️', title: '+10% Kaynak Üretimi',     description: 'Tüm kaynak birimlerinden bonus üretim',  unlocksAt: 2,  tier: 'silver'    },
  { id: 'daily-reward',  icon: '🎁', title: '2× Günlük Ödül',          description: 'Günlük ödül kutusundan 2 kat içerik',    unlocksAt: 3,  tier: 'silver'    },
  { id: 'vip-frame',     icon: '🖼️', title: 'VIP Profil Çerçevesi',    description: 'Animasyonlu altın profil çerçevesi',     unlocksAt: 3,  tier: 'silver'    },
  { id: 'build-queue2',  icon: '🏰', title: '+2 İnşaat Kuyruğu',       description: 'Aynı anda 3 yapı birden inşa et',        unlocksAt: 4,  tier: 'gold'      },
  { id: 'resource-15',   icon: '⚗️', title: '+15% Kaynak Üretimi',     description: 'Gelişmiş kaynak çıkarma teknolojisi',    unlocksAt: 4,  tier: 'gold'      },
  { id: 'battle-entry',  icon: '⚔️', title: 'Özel Savaş Alanı Girişi', description: 'Manga-animasyonlu savaş giriş sekansı',  unlocksAt: 5,  tier: 'gold'      },
  { id: 'daily-coins2',  icon: '💰', title: 'Günlük +100 Kristal',     description: 'Her gün 100 Nebula Kristali (kümülatif)', unlocksAt: 5,  tier: 'gold'      },
  { id: 'commander-xp',  icon: '⭐', title: 'Komutan XP ×3',           description: 'Komutanlar 3 kat hızlı seviye atlar',    unlocksAt: 6,  tier: 'platinum'  },
  { id: 'alliance-shop', icon: '🤝', title: 'Lonca Mağazası İndirimi', description: 'Lonca mağazasında %25 indirim',          unlocksAt: 6,  tier: 'platinum'  },
  { id: 'exclusive-skin',icon: '🎭', title: 'Özel VIP Komutan Skini',  description: 'Sadece VIP üyelere özel kostüm',         unlocksAt: 7,  tier: 'platinum'  },
  { id: 'resource-20',   icon: '🔮', title: '+20% Kaynak Üretimi',     description: 'Maksimum kaynak çıkarma verimliliği',    unlocksAt: 8,  tier: 'platinum'  },
  { id: 'guild-wars',    icon: '🌌', title: 'Lonca Savaşı Önceliği',   description: 'Lonca savaşlarında öncelikli slot',      unlocksAt: 8,  tier: 'platinum'  },
  { id: 'all-skins',     icon: '👑', title: 'Tüm Irk Kostümleri',      description: 'Her ırk için özel kostüm seti açılır',   unlocksAt: 9,  tier: 'legendary' },
  { id: 'annual-skin',   icon: '🌟', title: 'Eşsiz Yıllık Skin',       description: 'Hiç kimsenin sahip olmadığı özel skin',  unlocksAt: 10, tier: 'legendary' },
];

const VIP_LEVELS: VipLevel[] = Array.from({ length: 10 }, (_, i) => {
  const level = i + 1;
  const icons = ['🥉','🥉','🥈','🥈','🥇','🥇','💠','💠','💎','👑'];
  return {
    level,
    label: `VIP ${level}`,
    xpRequired: level === 1 ? 0 : [0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000][level - 1],
    icon: icons[i],
    benefits: ALL_BENEFITS.filter(b => b.unlocksAt === level),
  };
});

const TIER_STYLES: Record<VipBenefit['tier'], { color: string; glow: string; badge: string }> = {
  bronze:   { color: '#cd7f32', glow: 'rgba(205,127,50,0.30)',  badge: 'rgba(205,127,50,0.12)'  },
  silver:   { color: '#c0c0c0', glow: 'rgba(192,192,192,0.25)', badge: 'rgba(192,192,192,0.10)' },
  gold:     { color: '#FFD700', glow: 'rgba(255,215,0,0.35)',   badge: 'rgba(255,215,0,0.12)'   },
  platinum: { color: '#e5e4e2', glow: 'rgba(229,228,226,0.30)', badge: 'rgba(0,207,255,0.10)'   },
  legendary:{ color: '#cc00ff', glow: 'rgba(204,0,255,0.40)',   badge: 'rgba(204,0,255,0.12)'   },
};

const DAILY_REWARDS = [
  { icon: '💎', label: '+50 Kristal',  color: '#00cfff' },
  { icon: '⚡', label: '2× XP',       color: '#FFD700' },
  { icon: '🛡️', label: '4h Kalkan',   color: '#44ff88' },
  { icon: '⛏️', label: 'Kaynak ×1.2', color: '#ff6600' },
  { icon: '⭐', label: 'Bonus Görev', color: '#cc00ff' },
  { icon: '🎁', label: 'Sürpriz Ödül',color: '#FFD700' },
  { icon: '🔮', label: 'Void Crystal', color: '#44d9c8' },
];

const GOLD = '#FFD700';
const GOLD_DIM = 'rgba(255,215,0,0.12)';
const GOLD_GLOW = 'rgba(255,215,0,0.35)';

export default function VipPage() {
  const { raceGlow } = useRaceTheme();
  const {
    status,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
    setStatus,
    claimedToday,
  } = useVipStatus();
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    refetch: refetchPlans,
  } = useVipPlans();

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimToast, setClaimToast] = useState<DailyClaimReward[] | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const ladderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Sync selected level to current VIP level once status loads
  useEffect(() => {
    if (status && selectedLevel === null) setSelectedLevel(status.vipLevel);
  }, [status, selectedLevel]);

  // Default selected plan (popular if available, otherwise first)
  useEffect(() => {
    if (plans && selectedPlanId === null && plans.length > 0) {
      const popular = plans.find((p) => p.popular) ?? plans[0];
      setSelectedPlanId(popular.id);
    }
  }, [plans, selectedPlanId]);

  // Scroll active level into view once status loaded
  useEffect(() => {
    if (!status || !ladderRef.current) return;
    const node = ladderRef.current.querySelector(
      `[data-level="${status.vipLevel}"]`,
    ) as HTMLElement | null;
    if (node) node.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [status]);

  const currentVipLevel = status?.vipLevel ?? 1;
  const currentXp = status?.currentXp ?? 0;
  const xpForCurrent = VIP_LEVELS[Math.max(0, currentVipLevel - 1)].xpRequired;
  const xpForNext = status?.nextLevelXp ?? VIP_LEVELS[Math.min(currentVipLevel, VIP_LEVELS.length - 1)].xpRequired;
  const hasNext = currentVipLevel < VIP_LEVELS.length;
  const progressPct = useMemo(() => {
    if (!hasNext) return 100;
    const span = xpForNext - xpForCurrent;
    if (span <= 0) return 100;
    return Math.max(0, Math.min(100, ((currentXp - xpForCurrent) / span) * 100));
  }, [hasNext, xpForNext, xpForCurrent, currentXp]);

  const effectiveSelectedLevel = selectedLevel ?? currentVipLevel;
  const benefitsForSelected = ALL_BENEFITS.filter((b) => b.unlocksAt <= effectiveSelectedLevel);
  const lockedBenefits = ALL_BENEFITS.filter(
    (b) => b.unlocksAt > effectiveSelectedLevel && b.unlocksAt <= effectiveSelectedLevel + 2,
  );

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId) ?? null;

  const handleClaim = async () => {
    if (claimLoading || claimedToday) return;
    setClaimLoading(true);
    setClaimError(null);
    try {
      const res = await claimDailyVip();
      setClaimToast(res.rewards);
      setStatus((prev) => ({ ...prev, dailyClaimedAt: res.dailyClaimedAt }));
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Ödül talep edilemedi.');
    } finally {
      setClaimLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (purchaseLoading || !selectedPlan) return;
    setPurchaseLoading(true);
    setPurchaseError(null);
    try {
      const res = await purchaseVip(selectedPlan.id);
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Satın alma başlatılamadı.');
      setPurchaseLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ background: 'linear-gradient(180deg, #080a10 0%, #0a0c14 60%, #080a10 100%)' }}
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{
        background: `
          radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,215,0,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 20% 80%, ${raceGlow.replace('0.30','0.06')} 0%, transparent 60%)
        `,
      }} />

      <header className="relative z-10 flex items-center justify-between px-4 pt-safe-top pt-4 pb-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-body transition-all duration-300"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>←</span>
          <span>Geri</span>
        </Link>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 9999,
          background: GOLD_DIM,
          border: `1px solid ${GOLD_GLOW}`,
          boxShadow: `0 0 16px ${GOLD_GLOW}`,
        }}>
          <span style={{ fontSize: 14 }}>👑</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.65rem',
            fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: GOLD,
          }}>VIP Üyelik</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 9999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: 13 }}>💎</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.7rem',
            fontWeight: 700, color: 'var(--color-text-secondary)',
          }}>1,250</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 pb-24 flex flex-col gap-5">
        {/* ── Hero: status / loading / error ───────────────────────────── */}
        <div
          className={clsx('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          {statusLoading && <HeroSkeleton />}
          {!statusLoading && statusError && (
            <ErrorCard
              message={statusError}
              onRetry={refetchStatus}
            />
          )}
          {!statusLoading && !statusError && status && (
            <HeroCard
              level={currentVipLevel}
              currentXp={currentXp}
              xpForNext={xpForNext}
              progressPct={progressPct}
              hasNext={hasNext}
            />
          )}
        </div>

        {/* ── VIP Level Ladder ─────────────────────────────────────────── */}
        <div
          className={clsx('transition-all duration-700 delay-100', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.6rem',
            fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--color-text-muted)', marginBottom: 10,
          }}>VIP Seviye Basamağı</div>

          <div
            ref={ladderRef}
            style={{
              overflowX: 'auto', scrollbarWidth: 'none',
              display: 'flex', alignItems: 'center', gap: 0,
              padding: '4px 0 8px',
              position: 'relative',
            }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {VIP_LEVELS.map((vl, idx) => {
              const isActive = vl.level === currentVipLevel;
              const isCompleted = vl.level < currentVipLevel;
              const isSelected = vl.level === effectiveSelectedLevel;
              const isLocked = vl.level > currentVipLevel;
              const tierStyle = TIER_STYLES[
                vl.level <= 2 ? 'bronze' : vl.level <= 4 ? 'silver' : vl.level <= 6 ? 'gold' : vl.level <= 8 ? 'platinum' : 'legendary'
              ];

              return (
                <div key={vl.level} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {idx > 0 && (
                    <div style={{
                      width: 20, height: 3, borderRadius: 9999,
                      background: isCompleted
                        ? `linear-gradient(90deg, ${TIER_STYLES['bronze'].color} 0%, ${tierStyle.color} 100%)`
                        : isActive
                          ? `linear-gradient(90deg, ${GOLD} 0%, rgba(255,215,0,0.3) 100%)`
                          : 'rgba(255,255,255,0.08)',
                      flexShrink: 0,
                    }} />
                  )}

                  <button
                    data-level={vl.level}
                    onClick={() => setSelectedLevel(vl.level)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      cursor: 'pointer', background: 'none', border: 'none', padding: '0 2px',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: isActive ? 52 : 40, height: isActive ? 52 : 40,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                      background: isActive
                        ? `linear-gradient(135deg, ${GOLD}33 0%, ${GOLD}22 100%)`
                        : isCompleted
                          ? `linear-gradient(135deg, ${tierStyle.badge} 0%, transparent 100%)`
                          : isSelected
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(255,255,255,0.03)',
                      border: isActive
                        ? `2px solid ${GOLD}`
                        : isCompleted
                          ? `1.5px solid ${tierStyle.color}`
                          : isSelected
                            ? '1.5px solid rgba(255,255,255,0.20)'
                            : '1.5px solid rgba(255,255,255,0.08)',
                      boxShadow: isActive
                        ? `0 0 24px ${GOLD_GLOW}, 0 0 48px ${GOLD_GLOW}`
                        : isCompleted
                          ? `0 0 10px ${tierStyle.glow}`
                          : 'none',
                      transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {isActive && (
                        <div aria-hidden style={{
                          position: 'absolute', inset: -4, borderRadius: '50%',
                          border: `1.5px solid ${GOLD}`,
                          opacity: 0.4,
                          animation: 'vip-ring-pulse 2s ease-in-out infinite',
                        }} />
                      )}
                      <span style={{ fontSize: isActive ? 20 : 16 }}>{vl.icon}</span>
                      {isLocked && (
                        <span style={{
                          position: 'absolute', bottom: 3, right: 3,
                          fontSize: 9, lineHeight: 1,
                        }}>🔒</span>
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '0.55rem',
                      fontWeight: isActive ? 800 : 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: isActive ? GOLD : isCompleted ? tierStyle.color : 'var(--color-text-muted)',
                    }}>
                      {vl.level === 10 ? 'MAX' : `V${vl.level}`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Selected Level Benefits ──────────────────────────────────── */}
        <div
          className={clsx('transition-all duration-700 delay-150', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '0.6rem',
              fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
            }}>
              {effectiveSelectedLevel === currentVipLevel
                ? 'Mevcut Avantajlar'
                : `VIP ${effectiveSelectedLevel} Avantajları`}
            </div>
            {effectiveSelectedLevel !== currentVipLevel && (
              <div style={{
                padding: '2px 8px', borderRadius: 9999,
                fontFamily: 'var(--font-display)', fontSize: '0.55rem',
                fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: effectiveSelectedLevel < currentVipLevel ? 'rgba(68,255,136,0.10)' : GOLD_DIM,
                color: effectiveSelectedLevel < currentVipLevel ? '#44ff88' : GOLD,
                border: `1px solid ${effectiveSelectedLevel < currentVipLevel ? 'rgba(68,255,136,0.25)' : GOLD_GLOW}`,
              }}>
                {effectiveSelectedLevel < currentVipLevel ? '✓ Aktif' : '🔒 Kilitli'}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {benefitsForSelected.slice(0, 6).map(b => {
              const ts = TIER_STYLES[b.tier];
              const isCurrentlyActive = b.unlocksAt <= currentVipLevel;
              return (
                <BenefitCard key={b.id} benefit={b} tierStyle={ts} isActive={isCurrentlyActive} />
              );
            })}
          </div>

          {lockedBenefits.length > 0 && effectiveSelectedLevel === currentVipLevel && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.55rem',
                fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--color-text-muted)', marginBottom: 8,
              }}>Yakında Açılacak</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {lockedBenefits.slice(0, 2).map(b => {
                  const ts = TIER_STYLES[b.tier];
                  return <BenefitCard key={b.id} benefit={b} tierStyle={ts} isActive={false} locked />;
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Daily VIP Rewards ────────────────────────────────────────── */}
        <div
          className={clsx('transition-all duration-700 delay-200', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '0.6rem',
              fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
            }}>Günlük VIP Ödülleri</div>
            {!claimedToday && !statusLoading && (
              <div style={{
                padding: '2px 8px', borderRadius: 9999,
                fontFamily: 'var(--font-display)', fontSize: '0.55rem',
                fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'rgba(255,68,68,0.12)', color: '#ff4444',
                border: '1px solid rgba(255,68,68,0.25)',
                animation: 'vip-blink 1.5s ease-in-out infinite',
              }}>Talep Et!</div>
            )}
          </div>

          <div style={{
            padding: 2,
            background: 'rgba(255,215,0,0.08)',
            borderRadius: '1rem',
            border: `1px solid ${GOLD_GLOW}`,
          }}>
            <div style={{
              background: 'rgba(8,10,16,0.95)',
              borderRadius: 'calc(1rem - 2px)',
              padding: '12px 14px',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}
                className="[&::-webkit-scrollbar]:hidden">
                {DAILY_REWARDS.map((r, i) => (
                  <DailyRewardToken key={i} reward={r} claimed={claimedToday} />
                ))}
              </div>
              <button
                onClick={handleClaim}
                disabled={claimedToday || claimLoading || statusLoading}
                style={{
                  width: '100%', marginTop: 12,
                  padding: '10px', borderRadius: 9999,
                  background: claimedToday || claimLoading
                    ? 'rgba(255,255,255,0.04)'
                    : `linear-gradient(135deg, ${GOLD} 0%, #fff8c0 100%)`,
                  color: claimedToday || claimLoading ? 'var(--color-text-muted)' : '#080a10',
                  fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  border: `1px solid ${claimedToday || claimLoading ? 'rgba(255,255,255,0.07)' : GOLD}`,
                  boxShadow: claimedToday || claimLoading ? 'none' : `0 0 20px ${GOLD_GLOW}`,
                  cursor: claimedToday || claimLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                {claimedToday
                  ? '✓ Bugün Alındı'
                  : claimLoading
                    ? 'Talep ediliyor…'
                    : '👑 Ödülleri Topla'}
              </button>
              {claimError && (
                <p style={{
                  marginTop: 8,
                  fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                  color: 'var(--color-danger)', textAlign: 'center',
                }}>{claimError}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Upgrade / Purchase ───────────────────────────────────────── */}
        <div
          className={clsx('transition-all duration-700 delay-300', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.6rem',
            fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--color-text-muted)', marginBottom: 10,
          }}>VIP Satın Al</div>

          {plansLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[0, 1, 2].map((i) => <PlanSkeleton key={i} />)}
            </div>
          )}

          {!plansLoading && plansError && (
            <ErrorCard message={plansError} onRetry={refetchPlans} compact />
          )}

          {!plansLoading && !plansError && plans && plans.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {plans.map(plan => (
                <PlanTile
                  key={plan.id}
                  plan={plan}
                  selected={plan.id === selectedPlanId}
                  onSelect={() => setSelectedPlanId(plan.id)}
                />
              ))}
            </div>
          )}

          <div style={{
            padding: 2,
            background: `linear-gradient(135deg, ${GOLD} 0%, #fff8c0 50%, ${GOLD} 100%)`,
            borderRadius: 9999,
            boxShadow: `0 0 32px ${GOLD_GLOW}, 0 8px 32px rgba(0,0,0,0.5)`,
            opacity: !selectedPlan || purchaseLoading ? 0.6 : 1,
          }}>
            <button
              onClick={handlePurchase}
              disabled={!selectedPlan || purchaseLoading}
              style={{
                width: '100%', padding: '14px 24px',
                borderRadius: 9999,
                background: 'linear-gradient(135deg, #1a1400 0%, #0f0e00 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: !selectedPlan || purchaseLoading ? 'not-allowed' : 'pointer',
                border: 'none',
                boxShadow: 'inset 0 1px 1px rgba(255,215,0,0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>👑</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.8rem',
                    fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: GOLD,
                  }}>
                    {purchaseLoading ? 'Yönlendiriliyor…' : 'VIP Aktifleştir'}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.7rem',
                    color: 'rgba(255,215,0,0.7)',
                  }}>
                    {selectedPlan
                      ? `${selectedPlan.price} · ${selectedPlan.label}`
                      : 'Plan seçiniz'}
                  </div>
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${GOLD}22`,
                border: `1px solid ${GOLD}`,
                fontSize: 16, color: GOLD,
                transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
              }}>↗</div>
            </button>
          </div>

          {purchaseError && (
            <p style={{
              marginTop: 8,
              fontFamily: 'var(--font-body)', fontSize: '0.7rem',
              color: 'var(--color-danger)', textAlign: 'center',
            }}>{purchaseError}</p>
          )}

          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.65rem',
            color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 8,
            lineHeight: 1.5,
          }}>
            Otomatik yenilemez · İstediğin zaman iptal et · KDV dahil
          </p>
        </div>

        {/* ── VIP Exclusive Content ────────────────────────────────────── */}
        <div
          className={clsx('transition-all duration-700 delay-[400ms]', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}
          style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.6rem',
            fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--color-text-muted)', marginBottom: 10,
          }}>Özel VIP İçerikleri</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { icon: '🎭', title: 'Özel Kostümler',     desc: 'VIP 7+ ile açılır', color: '#cc00ff' },
              { icon: '🌌', title: 'Galaksi Harita Tema', desc: 'VIP 5+ ile açılır', color: '#00cfff' },
              { icon: '⚔️', title: 'Savaş Giriş Animasyonu', desc: 'VIP 5+ ile açılır', color: '#FFD700' },
              { icon: '🏆', title: 'Lonca Önceliği',     desc: 'VIP 8+ ile açılır', color: '#e5e4e2' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '14px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 10,
                position: 'relative', overflow: 'hidden',
              }}>
                <div aria-hidden style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(8,10,16,0.5)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12,
                  }}>🔒</div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                    fontWeight: 700, color: 'var(--color-text-primary)',
                    marginBottom: 2,
                  }}>{item.title}</div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: '0.65rem',
                    color: item.color,
                  }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {claimToast && (
        <ClaimRewardToast rewards={claimToast} onClose={() => setClaimToast(null)} />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface HeroCardProps {
  level: number;
  currentXp: number;
  xpForNext: number;
  progressPct: number;
  hasNext: boolean;
}

function HeroCard({ level, currentXp, xpForNext, progressPct, hasNext }: HeroCardProps) {
  const remaining = Math.max(0, xpForNext - currentXp);
  return (
    <div style={{
      padding: 2,
      background: `linear-gradient(135deg, ${GOLD}33 0%, ${GOLD_GLOW} 50%, rgba(74,158,255,0.30) 100%)`,
      borderRadius: '1.25rem',
      boxShadow: `0 0 40px ${GOLD_GLOW}, 0 0 80px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #0f1220 0%, #080a10 100%)',
        borderRadius: 'calc(1.25rem - 2px)',
        padding: '20px 20px 16px',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,215,0,0.04) 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: 0, right: 0, width: 80, height: 80,
          pointerEvents: 'none',
          background: `radial-gradient(circle at top right, ${GOLD_GLOW} 0%, transparent 70%)`,
          opacity: 0.5,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: GOLD_DIM,
                border: `2px solid ${GOLD}`,
                boxShadow: `0 0 20px ${GOLD_GLOW}, 0 0 40px ${GOLD_GLOW}`,
                fontSize: 24,
                animation: 'vip-crown-pulse 2s ease-in-out infinite',
              }}>
                👑
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.6rem',
                  fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: GOLD, marginBottom: 2,
                }}>Mevcut Seviye</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.5rem',
                  fontWeight: 900, letterSpacing: '-0.02em',
                  background: `linear-gradient(135deg, ${GOLD} 0%, #fff 60%, ${GOLD} 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>VIP {level}</div>
              </div>
            </div>
            {hasNext && (
              <div style={{
                textAlign: 'right',
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.55rem',
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--color-text-muted)', marginBottom: 2,
                }}>Sonraki</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '1rem',
                  fontWeight: 800, color: 'var(--color-text-secondary)',
                }}>VIP {level + 1}</div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}>
                {hasNext
                  ? `${remaining.toLocaleString()} XP daha → VIP ${level + 1}`
                  : 'Maksimum seviyeye ulaştın'}
              </span>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                fontWeight: 700, color: GOLD,
              }}>{currentXp.toLocaleString()} / {xpForNext.toLocaleString()}</span>
            </div>
            <div style={{
              height: 8, borderRadius: 9999,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 9999,
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${GOLD} 0%, #fff8c0 100%)`,
                boxShadow: `0 0 12px ${GOLD_GLOW}, 0 0 24px ${GOLD_GLOW}`,
                transition: 'width 1.2s cubic-bezier(0.32,0.72,0,1)',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {ALL_BENEFITS.filter(b => b.unlocksAt <= level).slice(0, 4).map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 9999,
                background: GOLD_DIM,
                border: `1px solid ${GOLD_GLOW}`,
                fontSize: '0.65rem', color: GOLD,
                fontFamily: 'var(--font-body)', fontWeight: 600,
              }}>
                <span style={{ fontSize: 10 }}>{b.icon}</span>
                <span>{b.title.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            ))}
            {ALL_BENEFITS.filter(b => b.unlocksAt <= level).length > 4 && (
              <div style={{
                padding: '2px 8px', borderRadius: 9999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: '0.65rem', color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
              }}>
                +{ALL_BENEFITS.filter(b => b.unlocksAt <= level).length - 4} daha
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div
      role="status"
      aria-label="VIP durumu yükleniyor"
      style={{
        padding: 2,
        background: 'rgba(255,215,0,0.10)',
        borderRadius: '1.25rem',
      }}
    >
      <div style={{
        background: 'linear-gradient(160deg, #0f1220 0%, #080a10 100%)',
        borderRadius: 'calc(1.25rem - 2px)',
        padding: '20px',
        minHeight: 168,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SkeletonBlock width={48} height={48} radius="50%" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonBlock width={90} height={10} />
            <SkeletonBlock width={120} height={20} />
          </div>
        </div>
        <SkeletonBlock height={10} />
        <SkeletonBlock height={8} radius={9999} />
        <div style={{ display: 'flex', gap: 6 }}>
          <SkeletonBlock width={80} height={18} radius={9999} />
          <SkeletonBlock width={70} height={18} radius={9999} />
          <SkeletonBlock width={60} height={18} radius={9999} />
        </div>
      </div>
    </div>
  );
}

interface SkeletonBlockProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}

function SkeletonBlock({ width = '100%', height = 12, radius = 6 }: SkeletonBlockProps) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'vip-blink 1.5s ease-in-out infinite',
    }} />
  );
}

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}

function ErrorCard({ message, onRetry, compact }: ErrorCardProps) {
  return (
    <div style={{
      padding: compact ? '12px 14px' : '20px',
      borderRadius: '1rem',
      background: 'rgba(255,51,85,0.08)',
      border: '1px solid rgba(255,51,85,0.30)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.7rem',
            fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--color-danger)', marginBottom: 2,
          }}>Yüklenemedi</div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{message}</div>
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 14px', borderRadius: 9999,
          background: 'rgba(255,51,85,0.12)',
          border: '1px solid rgba(255,51,85,0.40)',
          color: 'var(--color-danger)',
          fontFamily: 'var(--font-display)', fontSize: '0.65rem',
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        Tekrar Dene
      </button>
    </div>
  );
}

interface PlanTileProps {
  plan: VipPlan;
  selected: boolean;
  onSelect: () => void;
}

function PlanTile({ plan, selected, onSelect }: PlanTileProps) {
  return (
    <button
      onClick={onSelect}
      style={{
        position: 'relative', padding: '12px 8px',
        borderRadius: 12, cursor: 'pointer',
        border: `1.5px solid ${selected ? GOLD : 'rgba(255,255,255,0.08)'}`,
        background: selected ? GOLD_DIM : 'rgba(255,255,255,0.02)',
        boxShadow: selected ? `0 0 16px ${GOLD_GLOW}` : 'none',
        transition: 'all 0.35s cubic-bezier(0.32,0.72,0,1)',
        textAlign: 'center',
      }}
    >
      {plan.tag && (
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          padding: '2px 8px', borderRadius: 9999,
          fontFamily: 'var(--font-display)', fontSize: '0.5rem',
          fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
          background: plan.popular ? GOLD : '#cc00ff',
          color: '#080a10', whiteSpace: 'nowrap',
        }}>{plan.tag}</div>
      )}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '0.65rem',
        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: selected ? GOLD : 'var(--color-text-secondary)',
        marginBottom: 4,
      }}>{plan.label}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '0.9rem',
        fontWeight: 900, color: selected ? GOLD : 'var(--color-text-primary)',
        lineHeight: 1.2,
      }}>{plan.price}</div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: '0.65rem',
        color: 'var(--color-text-muted)', marginTop: 2,
      }}>{plan.usd}</div>
      {plan.gems > 0 && (
        <div style={{
          marginTop: 6, padding: '2px 6px', borderRadius: 9999,
          background: 'rgba(0,207,255,0.10)', border: '1px solid rgba(0,207,255,0.20)',
          fontSize: '0.6rem', fontFamily: 'var(--font-display)',
          color: '#00cfff', fontWeight: 700,
        }}>+{plan.gems} 💎</div>
      )}
    </button>
  );
}

function PlanSkeleton() {
  return (
    <div style={{
      padding: '12px 8px',
      borderRadius: 12,
      border: '1.5px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.02)',
      display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
      minHeight: 88,
    }}>
      <SkeletonBlock width={60} height={10} />
      <SkeletonBlock width={70} height={16} />
      <SkeletonBlock width={45} height={9} />
    </div>
  );
}

interface BenefitCardProps {
  benefit: VipBenefit;
  tierStyle: { color: string; glow: string; badge: string };
  isActive: boolean;
  locked?: boolean;
}

function BenefitCard({ benefit, tierStyle, isActive, locked }: BenefitCardProps) {
  return (
    <div style={{
      padding: 2,
      background: isActive
        ? `linear-gradient(135deg, ${tierStyle.color}44 0%, ${tierStyle.color}11 100%)`
        : 'rgba(255,255,255,0.04)',
      borderRadius: '0.875rem',
      opacity: locked ? 0.55 : 1,
    }}>
      <div style={{
        background: isActive ? `${tierStyle.badge}` : 'rgba(13,17,23,0.9)',
        borderRadius: 'calc(0.875rem - 2px)',
        padding: '12px 10px',
        boxShadow: isActive ? `inset 0 1px 1px rgba(255,255,255,0.08)` : 'none',
        height: '100%',
        display: 'flex', flexDirection: 'column', gap: 6,
        position: 'relative', overflow: 'hidden',
      }}>
        {locked && (
          <div aria-hidden style={{
            position: 'absolute', top: 6, right: 6,
            fontSize: 11,
          }}>🔒</div>
        )}
        {isActive && !locked && (
          <div aria-hidden style={{
            position: 'absolute', top: 6, right: 6,
            width: 16, height: 16, borderRadius: '50%',
            background: tierStyle.badge,
            border: `1px solid ${tierStyle.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: tierStyle.color, fontWeight: 700,
          }}>✓</div>
        )}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? `${tierStyle.color}20` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isActive ? tierStyle.color + '40' : 'rgba(255,255,255,0.07)'}`,
          fontSize: 18, flexShrink: 0,
        }}>
          {benefit.icon}
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.65rem',
            fontWeight: 700, letterSpacing: '0.04em',
            color: isActive ? tierStyle.color : 'var(--color-text-secondary)',
            marginBottom: 2, lineHeight: 1.3,
          }}>{benefit.title}</div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '0.6rem',
            color: 'var(--color-text-muted)', lineHeight: 1.4,
          }}>{benefit.description}</div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '1px 6px', borderRadius: 9999,
          background: isActive ? `${tierStyle.color}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isActive ? tierStyle.color + '30' : 'rgba(255,255,255,0.06)'}`,
          fontSize: '0.55rem', fontFamily: 'var(--font-display)', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: isActive ? tierStyle.color : 'var(--color-text-muted)',
          width: 'fit-content', marginTop: 'auto',
        }}>
          VIP {benefit.unlocksAt}+
        </div>
      </div>
    </div>
  );
}

interface DailyRewardTokenProps {
  reward: { icon: string; label: string; color: string };
  claimed: boolean;
}

function DailyRewardToken({ reward, claimed }: DailyRewardTokenProps) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '8px 10px', borderRadius: 10, minWidth: 64,
      background: claimed ? 'rgba(255,255,255,0.02)' : `${reward.color}10`,
      border: `1px solid ${claimed ? 'rgba(255,255,255,0.06)' : reward.color + '30'}`,
      opacity: claimed ? 0.5 : 1,
      filter: claimed ? 'grayscale(0.6)' : 'none',
      transition: 'all 0.3s cubic-bezier(0.32,0.72,0,1)',
    }}>
      <span style={{ fontSize: 20 }}>{reward.icon}</span>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '0.6rem', fontWeight: 600,
        color: claimed ? 'var(--color-text-muted)' : reward.color,
        textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap',
      }}>{reward.label}</span>
    </div>
  );
}

interface ClaimRewardToastProps {
  rewards: DailyClaimReward[];
  onClose: () => void;
}

function ClaimRewardToast({ rewards, onClose }: ClaimRewardToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        transform: 'translateX(-50%)',
        zIndex: 50,
        padding: 2,
        background: `linear-gradient(135deg, ${GOLD} 0%, #fff8c0 50%, ${GOLD} 100%)`,
        borderRadius: '1rem',
        boxShadow: `0 0 32px ${GOLD_GLOW}, 0 12px 40px rgba(0,0,0,0.6)`,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{
        background: 'linear-gradient(160deg, #1a1400 0%, #0f0e00 100%)',
        borderRadius: 'calc(1rem - 2px)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>🎁</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '0.7rem',
            fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: GOLD,
          }}>Ödüller Toplandı</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rewards.map((r, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 9999,
                  background: `${r.color}15`,
                  border: `1px solid ${r.color}40`,
                  fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600,
                  color: r.color,
                }}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Kapat"
          style={{
            marginLeft: 'auto',
            width: 28, height: 28, borderRadius: '50%',
            border: '1px solid rgba(255,215,0,0.30)',
            background: 'rgba(255,215,0,0.08)',
            color: GOLD, cursor: 'pointer',
            fontSize: 14, lineHeight: 1, flexShrink: 0,
          }}
        >×</button>
      </div>
    </div>
  );
}
