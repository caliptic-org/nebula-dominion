'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { MangaPanel } from '@/components/ui/MangaPanel';
import { GlowButton } from '@/components/ui/GlowButton';
import clsx from 'clsx';

// ── Types ───────────────────────────────────────────────────────────────────
type ShopTab = 'genel' | 'vip' | 'lonca' | 'etkinlik' | 'gecis';
type Currency = 'gem' | 'gold';

interface BattlePassTier {
  level: number;
  free?: BattlePassReward;
  premium: BattlePassReward;
  milestone?: boolean;
}

interface BattlePassReward {
  icon: string;
  label: string;
  color?: string;
}

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ShopTab;
  gemPrice?: number;
  goldPrice?: number;
  originalGemPrice?: number;
  originalGoldPrice?: number;
  discount?: number;
  stock?: number;
  tag?: 'new' | 'best' | 'limited' | 'hot';
  raceExclusive?: Race;
  bundleContents: string[];
  featured?: boolean;
}

// ── Data ────────────────────────────────────────────────────────────────────
const SHOP_PRODUCTS: ShopProduct[] = [
  // ── Genel ──────────────────────────────────────────────
  { id: 'gem-small',    name: 'Kristal Paketi',   description: '100 Nebula Kristali',           icon: '💎', category: 'genel', goldPrice: 800,                                       bundleContents: ['100 💎 Nebula Kristali'] },
  { id: 'gem-medium',   name: 'Kristal Demeti',   description: '550 Kristal (+50 bonus)',        icon: '💎', category: 'genel', goldPrice: 4000, originalGoldPrice: 4500, discount: 10, tag: 'hot',     bundleContents: ['500 💎 Nebula Kristali', '+50 💎 Bonus'] },
  { id: 'gem-large',    name: 'Kristal Hazinesi', description: '1440 Kristal (+240 bonus)',      icon: '💎', category: 'genel', goldPrice: 9000, originalGoldPrice: 12000, discount: 25, tag: 'best',   bundleContents: ['1200 💎 Nebula Kristali', '+240 💎 Bonus', '🎁 Özel Çerçeve'] },
  { id: 'xp-booster',   name: 'XP Uyarıcı',       description: '2× XP kazanımı 24 saat',        icon: '⚡', category: 'genel', gemPrice: 200, goldPrice: 1600, tag: 'hot', bundleContents: ['2× XP × 24 saat', 'Anlık aktifleşme'] },
  { id: 'resource-pack',name: 'Kaynak Paketi',    description: 'Mineral, Gas ve Energy dolumu', icon: '⛏️', category: 'genel', gemPrice: 150, goldPrice: 1200,            bundleContents: ['1.000 Mineral', '500 Gas', '300 Energy'] },
  { id: 'shield-8h',    name: 'Savaş Kalkanı',    description: '8 saatlik saldırı koruması',    icon: '🛡️', category: 'genel', gemPrice: 80,  goldPrice: 640,             bundleContents: ['8 Saat Koruma', 'PvP Saldırı Engeli'] },
  { id: 'speed-boost',  name: 'Hız Katalizörü',   description: 'Tüm üretimler 1 saat anında',  icon: '🚀', category: 'genel', gemPrice: 50,  goldPrice: 400,             bundleContents: ['1 Saat Anında Üretim', 'Yapı & Birim'] },
  { id: 'vip-trial',    name: 'VIP Deneme',        description: '3 günlük VIP üyelik deneme',   icon: '👑', category: 'genel', gemPrice: 300, tag: 'new',                 bundleContents: ['3 Gün VIP Üyelik', 'Tüm VIP Ayrıcalıkları', '+1 İnşaat Kuyruğu'] },
  // Race exclusive bundles
  { id: 'race-bundle-zerg',   name: 'Kovan Paket',       description: 'Zerg ırkına özel güç paketi',    icon: '🧬', category: 'genel', gemPrice: 500, originalGemPrice: 750, discount: 33, tag: 'limited', raceExclusive: Race.ZERG,    stock: 50, bundleContents: ['Vex Thara Komutan Çerçevesi', '5× Mutasyon Hızlandırıcı', '2× Kovan Kalkanı', '500 Mineral', '300 Gas'] },
  { id: 'race-bundle-otomat',  name: 'Grid Protokolü',    description: 'Otomat ırkına özel şematik paket', icon: '⚡', category: 'genel', gemPrice: 500, originalGemPrice: 750, discount: 33, tag: 'limited', raceExclusive: Race.OTOMAT,  stock: 50, bundleContents: ['Demiurge Prime Çerçevesi', '5× Hologram Booster', '2× Enerji Kalkanı', '400 Gas', '200 Energy'] },
  { id: 'race-bundle-canavar', name: 'Kadim Kudret',      description: 'Canavar ırkına özel güç paketi', icon: '🔥', category: 'genel', gemPrice: 500, originalGemPrice: 750, discount: 33, tag: 'limited', raceExclusive: Race.CANAVAR, stock: 50, bundleContents: ['Khorvash Savaş Maskesi', '5× Öfke Güçlendirmesi', '2× Taş Zırhı', '800 Mineral', '200 Gas'] },
  { id: 'race-bundle-insan',   name: 'Genetik Savaşçı',  description: 'İnsan ırkına özel teknoloji paketi', icon: '🧪', category: 'genel', gemPrice: 500, originalGemPrice: 750, discount: 33, tag: 'limited', raceExclusive: Race.INSAN,   stock: 50, bundleContents: ['Voss Askeri Çerçevesi', '5× Eğitim Hızlandırıcı', '2× Savunma Mevzii', '300 Mineral', '500 Energy'] },
  { id: 'race-bundle-seytan',  name: 'Lanet Paketi',      description: 'Şeytan ırkına özel büyü paketi', icon: '💀', category: 'genel', gemPrice: 500, originalGemPrice: 750, discount: 33, tag: 'limited', raceExclusive: Race.SEYTAN,  stock: 50, bundleContents: ['Malphas Lanet Maskesi', '5× Rune Güçlendirici', '2× Gotik Kalkan', '300 Mineral', '400 Gas'] },
  // ── VIP ────────────────────────────────────────────────
  { id: 'vip-monthly',  name: 'VIP Aylık',    description: '30 gün tam VIP deneyimi',            icon: '👑', category: 'vip', gemPrice: 1000,                                         bundleContents: ['+1 İnşaat Kuyruğu', '10% Kaynak Üretimi', '2× Günlük Ödül', 'Özel VIP Profil Çerçevesi', 'Savaş Alanı Özel Giriş Efekti'] },
  { id: 'vip-quarterly',name: 'VIP 3 Aylık',  description: '90 gün VIP + bonus kristal',         icon: '💎', category: 'vip', gemPrice: 2500, originalGemPrice: 3000, discount: 17, tag: 'hot',   bundleContents: ['+1 İnşaat Kuyruğu', '10% Kaynak Üretimi', '2× Günlük Ödül', 'VIP Profil Çerçevesi', '+200 💎 Bonus Kristal', 'Komutan XP Kartı × 3'] },
  { id: 'vip-annual',   name: 'VIP Yıllık',   description: '365 gün VIP + eşsiz ödüller',        icon: '🌟', category: 'vip', gemPrice: 8000, originalGemPrice: 12000, discount: 33, tag: 'best', featured: true, bundleContents: ['+2 İnşaat Kuyruğu', '15% Kaynak Üretimi', '3× Günlük Ödül', 'Eşsiz VIP Altın Çerçeve', '+1000 💎 Bonus', 'Tüm Irk Kostümleri', 'Yıllık Özel Komutan Skin'] },
  { id: 'vip-starter',  name: 'VIP Başlangıç',description: 'Yeni oyuncular için özel fırsat',    icon: '🎯', category: 'vip', gemPrice: 499,  originalGemPrice: 800, discount: 38, tag: 'new', stock: 1, bundleContents: ['7 Gün VIP', '+50 💎 Kristal', '2× XP Kartı', '5× Hız Katalizörü', 'Başlangıç Çerçevesi'] },
  // ── Lonca ──────────────────────────────────────────────
  { id: 'lonca-kaynak',   name: 'Lonca Kaynağı',        description: 'Lonca ambarı için büyük kaynak dolumu',     icon: '⚓', category: 'lonca', gemPrice: 300, goldPrice: 2400,            bundleContents: ['5.000 Lonca Minerali', '2.500 Lonca Gazı', '1.000 Lonca Enerjisi'] },
  { id: 'lonca-gelistirme',name: 'Geliştirme Paketi',   description: 'Lonca binası yükseltme hızlandırıcı',      icon: '🏗️', category: 'lonca', gemPrice: 500, tag: 'hot',               bundleContents: ['Lonca Ar-Ge × 2', 'Bina Seviye Atlama × 1', 'Lonca Puanı × 1000'] },
  { id: 'lonca-tech',      name: 'Teknoloji Hızlandırıcı',description: 'Lonca araştırmalarını hızlandır',         icon: '🔬', category: 'lonca', gemPrice: 200, goldPrice: 1600,            bundleContents: ['Araştırma Hızlandırıcı × 5', 'Lonca Puanı × 300'] },
  { id: 'lonca-kalkan',    name: 'Lonca Kalkan Paketi',  description: 'Lonca üyelerini düşman saldırılarından koru', icon: '⚔️', category: 'lonca', gemPrice: 400,                   bundleContents: ['24h Lonca Kalkanı', 'Üye Koruması × 10', 'Kalkan Parçacık Efekti'] },
  // ── Etkinlik ───────────────────────────────────────────
  { id: 'event-frame',       name: 'Galaksi Çerçevesi', description: 'Sınırlı sürüm kozmik profil çerçevesi',  icon: '🌌', category: 'etkinlik', gemPrice: 100, tag: 'limited', stock: 200,             bundleContents: ['Galaksi Profil Çerçevesi', 'Animasyonlu Yıldız Efekti'] },
  { id: 'event-explorer',    name: 'Kaşif Paketi',       description: 'Etkinlik özel keşif paketi',             icon: '🔭', category: 'etkinlik', gemPrice: 250, originalGemPrice: 400, discount: 37, tag: 'hot', stock: 100, bundleContents: ['Harita Kaşif Çerçevesi', 'Özel Hareket İzi Efekti', '3× XP Booster', '200 💎 Kristal'] },
  { id: 'event-galaxy-bundle',name: 'Galaksi Fatihi',    description: 'Etkinlik mega paketi',                  icon: '🌠', category: 'etkinlik', gemPrice: 800, originalGemPrice: 1400, discount: 43, tag: 'limited', stock: 25, featured: true, bundleContents: ['Özel Galaksi Komutan Skin', 'Galaksi Harita Teması', '5× Tüm Irk Paketi', '1000 💎 Kristal', 'Animasyonlu Giriş Sahnesi'] },
];

const TABS: { key: ShopTab; label: string; icon: string }[] = [
  { key: 'genel',    label: 'Genel',    icon: '🛒' },
  { key: 'gecis',    label: 'Savaş Geçişi', icon: '⚔️' },
  { key: 'vip',      label: 'VIP',      icon: '👑' },
  { key: 'lonca',    label: 'Lonca',    icon: '⚓' },
  { key: 'etkinlik', label: 'Etkinlik', icon: '🌟' },
];

// ── Battle Pass Data ─────────────────────────────────────────────────────────
const BATTLE_PASS_PLAYER_LEVEL = 12;
const BATTLE_PASS_PREMIUM_PRICE = 800;
const BATTLE_PASS_PREMIUM_PLUS_PRICE = 1200;
const BATTLE_PASS_IS_PREMIUM = false;

const BATTLE_PASS_TIERS: BattlePassTier[] = [
  { level: 1,  free: { icon: '⛏️', label: '500 Mineral' },         premium: { icon: '💎', label: '20 Kristal', color: '#00cfff' } },
  { level: 2,  free: { icon: '⚗️', label: '300 Gas' },             premium: { icon: '⚡', label: '2× XP 1 Saat' } },
  { level: 3,  free: { icon: '💎', label: '10 Kristal', color: '#00cfff' }, premium: { icon: '🎨', label: 'Irk Renk Paleti' } },
  { level: 4,  free: { icon: '🛡️', label: '4h Kalkan' },           premium: { icon: '💎', label: '30 Kristal', color: '#00cfff' } },
  { level: 5,  free: { icon: '🧬', label: 'Komutan XP ×2' },       premium: { icon: '🌟', label: 'Giriş Efekti', color: '#ffc832' }, milestone: true },
  { level: 6,  free: { icon: '⛏️', label: '1.000 Mineral' },       premium: { icon: '💎', label: '40 Kristal', color: '#00cfff' } },
  { level: 7,  free: { icon: '🚀', label: 'Hız Kartı ×3' },        premium: { icon: '🎭', label: 'Avatar Çerçevesi' } },
  { level: 8,  free: { icon: '⚗️', label: '600 Gas' },             premium: { icon: '💎', label: '50 Kristal', color: '#00cfff' } },
  { level: 9,  free: { icon: '💎', label: '20 Kristal', color: '#00cfff' }, premium: { icon: '🎖️', label: 'Savaşçı Rozeti' } },
  { level: 10, free: { icon: '⚡', label: '2× Üretim 2 Saat' },    premium: { icon: '🔥', label: 'Irk Özel Skin', color: '#ff6600' }, milestone: true },
  { level: 11, free: { icon: '⛏️', label: '2.000 Mineral' },       premium: { icon: '💎', label: '60 Kristal', color: '#00cfff' } },
  { level: 12, free: { icon: '🛡️', label: '8h Kalkan' },           premium: { icon: '✨', label: 'Parçacık İzi Efekti' } },
  { level: 13, free: { icon: '🧬', label: 'Komutan XP ×5' },       premium: { icon: '💎', label: '80 Kristal', color: '#00cfff' } },
  { level: 14, free: { icon: '⚗️', label: '1.000 Gas' },           premium: { icon: '🎮', label: 'HUD Renk Teması' } },
  { level: 15, free: { icon: '💎', label: '30 Kristal', color: '#00cfff' }, premium: { icon: '🏆', label: 'Efsanevi Komutan XP', color: '#ffc832' }, milestone: true },
  { level: 16, free: { icon: '⛏️', label: '3.000 Mineral' },       premium: { icon: '💎', label: '100 Kristal', color: '#00cfff' } },
  { level: 17, free: { icon: '🚀', label: 'Hız Kartı ×5' },        premium: { icon: '🌌', label: 'Galaksi Arka Plan' } },
  { level: 18, free: { icon: '⚗️', label: '1.500 Gas' },           premium: { icon: '💎', label: '120 Kristal', color: '#00cfff' } },
  { level: 19, free: { icon: '⚡', label: '2× Üretim 4 Saat' },    premium: { icon: '🦅', label: 'Savaş Kartalı Şekli' } },
  { level: 20, free: { icon: '💎', label: '50 Kristal', color: '#00cfff' }, premium: { icon: '⚔️', label: 'Irk Silah Efekti', color: '#ff3355' }, milestone: true },
  { level: 21, free: { icon: '⛏️', label: '5.000 Mineral' },       premium: { icon: '💎', label: '150 Kristal', color: '#00cfff' } },
  { level: 22, free: { icon: '🛡️', label: '12h Kalkan' },          premium: { icon: '🌟', label: 'VIP 3 Gün Denemesi' } },
  { level: 23, free: { icon: '🧬', label: 'Komutan XP ×10' },      premium: { icon: '💎', label: '180 Kristal', color: '#00cfff' } },
  { level: 24, free: { icon: '⚗️', label: '2.000 Gas' },           premium: { icon: '🎪', label: 'Animasyonlu Profil' } },
  { level: 25, free: { icon: '💎', label: '100 Kristal', color: '#00cfff' }, premium: { icon: '👑', label: 'Altın VIP Rozeti', color: '#ffc832' }, milestone: true },
  { level: 26, free: { icon: '⛏️', label: '8.000 Mineral' },       premium: { icon: '💎', label: '200 Kristal', color: '#00cfff' } },
  { level: 27, free: { icon: '🚀', label: 'Hız Kartı ×10' },       premium: { icon: '🌠', label: 'Komutan Portre Çerçevesi' } },
  { level: 28, free: { icon: '⚗️', label: '3.000 Gas' },           premium: { icon: '💎', label: '250 Kristal', color: '#00cfff' } },
  { level: 29, free: { icon: '⚡', label: '2× Üretim 8 Saat' },    premium: { icon: '🔮', label: 'Boyut Geçişi Efekti' } },
  { level: 30, free: { icon: '🏆', label: 'Sezon Kupası', color: '#ffc832' }, premium: { icon: '🌌', label: 'Galaksi Fatihi Skin', color: '#cc00ff' }, milestone: true },
];

const RACE_BUNDLE_IDS: Record<Race, string> = {
  [Race.ZERG]:    'race-bundle-zerg',
  [Race.OTOMAT]:  'race-bundle-otomat',
  [Race.CANAVAR]: 'race-bundle-canavar',
  [Race.INSAN]:   'race-bundle-insan',
  [Race.SEYTAN]:  'race-bundle-seytan',
};

const TAG_CONFIG = {
  new:     { label: 'YENİ',    color: '#44ff88', bg: 'rgba(68,255,136,0.15)',  border: 'rgba(68,255,136,0.35)' },
  best:    { label: 'EN İYİ',  color: '#ffc832', bg: 'rgba(255,200,50,0.15)',  border: 'rgba(255,200,50,0.35)' },
  limited: { label: 'SINIRLI', color: '#ff3355', bg: 'rgba(255,51,85,0.15)',   border: 'rgba(255,51,85,0.35)' },
  hot:     { label: 'POPÜLER', color: '#ff6600', bg: 'rgba(255,102,0,0.15)',   border: 'rgba(255,102,0,0.35)' },
};

const PLAYER_CURRENCY = { gem: 1250, gold: 8400 };

// ── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(totalSeconds: number) {
  const [secs, setSecs] = useState(totalSeconds);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs]);
  return {
    d: Math.floor(secs / 86400),
    h: Math.floor((secs % 86400) / 3600),
    m: Math.floor((secs % 3600) / 60),
    s: secs % 60,
    done: secs <= 0,
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: NonNullable<ShopProduct['tag']> }) {
  const cfg = TAG_CONFIG[tag];
  return (
    <span
      className="font-display text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-display text-xl font-black tabular-nums"
        style={{ color: '#ffc832', textShadow: '0 0 12px rgba(255,200,50,0.5)' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="font-display text-[8px] uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  );
}

function PriceDisplay({
  gem,
  gold,
  originalGem,
  originalGold,
  size = 'md',
}: {
  gem?: number;
  gold?: number;
  originalGem?: number;
  originalGold?: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
  const origSizes = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };
  return (
    <div className="flex flex-col gap-0.5">
      {gem !== undefined && (
        <div className="flex items-center gap-1">
          {originalGem && (
            <span className={clsx('line-through text-text-muted', origSizes[size])}>
              💎{originalGem.toLocaleString()}
            </span>
          )}
          <span className={clsx('font-display font-black', textSizes[size])} style={{ color: '#00cfff' }}>
            💎 {gem.toLocaleString()}
          </span>
        </div>
      )}
      {gold !== undefined && (
        <div className="flex items-center gap-1">
          {originalGold && (
            <span className={clsx('line-through text-text-muted', origSizes[size])}>
              🪙{originalGold.toLocaleString()}
            </span>
          )}
          <span className={clsx('font-display font-black', textSizes[size])} style={{ color: '#ffc832' }}>
            🪙 {gold.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  raceColor,
  raceGlow,
  playerRace,
  onBuy,
}: {
  product: ShopProduct;
  raceColor: string;
  raceGlow: string;
  playerRace: Race;
  onBuy: (p: ShopProduct) => void;
}) {
  const isRacePack = product.raceExclusive !== undefined;
  const isCurrentRace = product.raceExclusive === playerRace;
  const raceDesc = product.raceExclusive ? RACE_DESCRIPTIONS[product.raceExclusive] : null;
  const accentColor = isCurrentRace ? raceColor : raceDesc?.color ?? raceColor;
  const accentGlow  = isCurrentRace ? raceGlow  : (raceDesc?.glowColor ?? raceGlow);
  const isFeatured  = product.featured;

  return (
    <div
      className={clsx(
        'group relative rounded-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isFeatured && 'col-span-1 sm:col-span-2',
      )}
      style={{
        transform: 'translateY(0)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      {/* Outer shell — double bezel */}
      <div
        className="p-[2px] rounded-sm transition-all duration-500"
        style={{
          background: isCurrentRace
            ? `linear-gradient(135deg, ${accentColor}55 0%, ${accentColor}11 50%, transparent 100%)`
            : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          boxShadow: isCurrentRace
            ? `0 0 20px ${accentGlow}, inset 0 1px 1px rgba(255,255,255,0.08)`
            : 'inset 0 1px 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Inner core */}
        <div
          className="relative flex flex-col gap-3 p-4 rounded-sm overflow-hidden"
          style={{
            background: 'rgba(13,17,23,0.95)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Manga panel corner accents */}
          <div className="absolute top-0 left-0 w-5 h-5 pointer-events-none" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M0 0 L8 0" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              <path d="M0 0 L0 8" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none" style={{ transform: 'rotate(180deg)' }} aria-hidden>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M0 0 L8 0" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              <path d="M0 0 L0 8" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
            </svg>
          </div>

          {/* Glow layer for current race */}
          {isCurrentRace && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${accentGlow} 0%, transparent 70%)`,
              }}
              aria-hidden
            />
          )}

          {/* Race exclusive badge */}
          {isRacePack && (
            <div
              className="absolute top-2 right-2 font-display text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{
                background: `${accentColor}22`,
                color: accentColor,
                border: `1px solid ${accentColor}55`,
              }}
            >
              {raceDesc?.icon} {isCurrentRace ? 'Senin Irkın' : raceDesc?.name}
            </div>
          )}

          {/* Icon + tag row */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="w-12 h-12 rounded-sm flex items-center justify-center text-2xl shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}33`,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06)`,
              }}
            >
              {product.icon}
            </div>
            {product.tag && <TagBadge tag={product.tag} />}
          </div>

          {/* Name + desc */}
          <div className="relative z-10">
            <div className="font-display text-sm font-black text-text-primary leading-tight">{product.name}</div>
            <div className="font-body text-[11px] text-text-secondary mt-0.5 leading-snug">{product.description}</div>
          </div>

          {/* Discount banner */}
          {product.discount && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm w-fit"
              style={{ background: 'rgba(255,51,85,0.12)', border: '1px solid rgba(255,51,85,0.3)' }}
            >
              <span className="font-display text-[10px] font-black uppercase" style={{ color: '#ff3355' }}>
                ↓ %{product.discount} İNDİRİM
              </span>
            </div>
          )}

          {/* Bundle preview */}
          {product.bundleContents.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.bundleContents.slice(0, 3).map((item, i) => (
                <span
                  key={i}
                  className="font-body text-[10px] px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {item}
                </span>
              ))}
              {product.bundleContents.length > 3 && (
                <span
                  className="font-body text-[10px] px-1.5 py-0.5 rounded-sm"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  +{product.bundleContents.length - 3} daha
                </span>
              )}
            </div>
          )}

          {/* Stock bar */}
          {product.stock !== undefined && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-display text-[9px] uppercase tracking-widest text-text-muted">Stok</span>
                <span className="font-display text-[10px]" style={{ color: product.stock < 10 ? '#ff3355' : 'var(--color-text-secondary)' }}>
                  {product.stock} kaldı
                </span>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (product.stock / 200) * 100)}%`,
                    background: product.stock < 10 ? '#ff3355' : accentColor,
                    boxShadow: `0 0 6px ${product.stock < 10 ? 'rgba(255,51,85,0.5)' : accentGlow}`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Price + buy button */}
          <div className="flex items-end justify-between gap-2 mt-auto">
            <PriceDisplay
              gem={product.gemPrice}
              gold={product.goldPrice}
              originalGem={product.originalGemPrice}
              originalGold={product.originalGoldPrice}
            />
            <button
              onClick={() => onBuy(product)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-display text-xs font-black uppercase tracking-widest transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
              style={{
                background: isCurrentRace
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                  : 'linear-gradient(135deg, var(--color-brand), var(--color-accent))',
                color: '#080a10',
                boxShadow: `0 2px 12px ${isCurrentRace ? accentGlow : 'var(--color-brand-glow)'}`,
              }}
            >
              Satın Al
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              >
                →
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Featured Banner ───────────────────────────────────────────────────────────
function FeaturedBanner({
  tab,
  race,
  raceColor,
  raceGlow,
  countdown,
  raceBundleProduct,
  onBuy,
}: {
  tab: ShopTab;
  race: Race;
  raceColor: string;
  raceGlow: string;
  countdown: ReturnType<typeof useCountdown>;
  raceBundleProduct?: ShopProduct;
  onBuy: (p: ShopProduct) => void;
}) {
  const raceDesc = RACE_DESCRIPTIONS[race];
  const [imgErr, setImgErr] = useState(false);
  const primaryCommander = raceDesc.commanders[0];

  if (tab === 'vip') {
    const vipAnnual = SHOP_PRODUCTS.find(p => p.id === 'vip-annual')!;
    return (
      <MangaPanel className="relative overflow-hidden p-5 sm:p-6" glow>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 80% at 80% 50%, rgba(255,200,50,0.12) 0%, transparent 65%)` }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-race">VIP Öne Çıkan</span>
              <TagBadge tag="best" />
            </div>
            <h3 className="font-display text-xl font-black text-text-primary mb-1">
              👑 VIP Yıllık Üyelik
            </h3>
            <p className="font-body text-text-secondary text-sm mb-3 max-w-sm">
              Tüm ayrıcalıklar, 1000 bonus kristal ve eşsiz ırkıza özel skin dahil.
              En avantajlı VIP paketi.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display text-2xl font-black" style={{ color: '#ffc832' }}>💎 8.000</span>
              <span className="font-display text-sm line-through text-text-muted">12.000</span>
              <span className="font-display text-sm font-black px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,51,85,0.15)', color: '#ff3355' }}>%33 İNDİRİM</span>
            </div>
          </div>
          <GlowButton size="lg" onClick={() => onBuy(vipAnnual)} icon={<span>→</span>}>
            VIP'e Geç
          </GlowButton>
        </div>
      </MangaPanel>
    );
  }

  if (tab === 'etkinlik') {
    const galaxyBundle = SHOP_PRODUCTS.find(p => p.id === 'event-galaxy-bundle')!;
    return (
      <MangaPanel className="relative overflow-hidden p-5 sm:p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(204,0,255,0.15) 0%, rgba(74,158,255,0.08) 50%, transparent 80%)' }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge badge-race">Etkinlik Öne Çıkan</span>
              <TagBadge tag="limited" />
              <span className="font-display text-[10px] px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,200,50,0.12)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.3)' }}>
                🔥 Sınırlı Stok: {galaxyBundle.stock} kaldı
              </span>
            </div>
            <h3 className="font-display text-xl font-black text-text-primary mb-1">🌠 Galaksi Fatihi</h3>
            <p className="font-body text-text-secondary text-sm mb-3 max-w-sm">
              Eşsiz galaksi skin, 1000 kristal ve 5× tüm ırk paketi. Sadece bu etkinliğe özel!
            </p>
            {/* Countdown */}
            <div className="flex items-center gap-1 mb-4">
              <span className="font-display text-[10px] uppercase tracking-widest text-text-muted mr-2">Bitiş:</span>
              <div className="flex items-center gap-2">
                <CountdownBlock label="Gün" value={countdown.d} />
                <span className="font-display text-lg font-black text-text-muted mb-1">:</span>
                <CountdownBlock label="Saat" value={countdown.h} />
                <span className="font-display text-lg font-black text-text-muted mb-1">:</span>
                <CountdownBlock label="Dak" value={countdown.m} />
                <span className="font-display text-lg font-black text-text-muted mb-1">:</span>
                <CountdownBlock label="Sn" value={countdown.s} />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-display text-2xl font-black" style={{ color: '#00cfff' }}>💎 800</span>
              <span className="font-display text-sm line-through text-text-muted">1.400</span>
              <span className="font-display text-sm font-black px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,51,85,0.15)', color: '#ff3355' }}>%43 İNDİRİM</span>
              <GlowButton size="sm" onClick={() => onBuy(galaxyBundle)} icon={<span>→</span>}>
                Hemen Al
              </GlowButton>
            </div>
          </div>
          <div
            className="hidden sm:flex w-20 h-20 shrink-0 items-center justify-center text-5xl rounded-sm"
            style={{ background: 'rgba(204,0,255,0.12)', border: '1px solid rgba(204,0,255,0.25)', boxShadow: '0 0 20px rgba(204,0,255,0.2)' }}
          >
            🌠
          </div>
        </div>
      </MangaPanel>
    );
  }

  // Genel + Lonca: race bundle banner
  if (!raceBundleProduct) return null;

  return (
    <MangaPanel className="relative overflow-hidden p-5 sm:p-6" glow>
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 80% 70% at 85% 50%, ${raceGlow} 0%, transparent 65%)` }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="badge badge-race">Irka Özel</span>
            <span
              className="font-display text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: `${raceColor}22`, color: raceColor, border: `1px solid ${raceColor}44` }}
            >
              {raceDesc.icon} {raceDesc.name}
            </span>
            <TagBadge tag="limited" />
          </div>
          <h3 className="font-display text-xl font-black text-text-primary mb-1" style={{ textShadow: `0 0 20px ${raceGlow}` }}>
            {raceBundleProduct.icon} {raceBundleProduct.name}
          </h3>
          <p className="font-body text-text-secondary text-sm mb-3 max-w-md">{raceBundleProduct.description}</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {raceBundleProduct.bundleContents.map((item, i) => (
              <span
                key={i}
                className="font-body text-[10px] px-2 py-0.5 rounded-sm"
                style={{ background: `${raceColor}15`, color: raceColor, border: `1px solid ${raceColor}30` }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <PriceDisplay gem={raceBundleProduct.gemPrice} originalGem={raceBundleProduct.originalGemPrice} size="lg" />
            {raceBundleProduct.discount && (
              <span className="font-display text-sm font-black px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,51,85,0.15)', color: '#ff3355' }}>
                %{raceBundleProduct.discount} İNDİRİM
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 shrink-0">
          {!imgErr ? (
            <div
              className="relative w-20 h-24 rounded-sm overflow-hidden"
              style={{ border: `2px solid ${raceColor}66`, boxShadow: `0 0 20px ${raceGlow}` }}
            >
              <Image
                src={primaryCommander.portrait}
                alt={primaryCommander.name}
                fill
                className="object-cover object-top"
                style={{ filter: `drop-shadow(0 0 8px ${raceGlow})` }}
                onError={() => setImgErr(true)}
              />
            </div>
          ) : (
            <div
              className="w-20 h-24 rounded-sm flex items-center justify-center text-4xl"
              style={{ background: raceDesc.bgColor, border: `2px solid ${raceColor}55` }}
            >
              {raceDesc.icon}
            </div>
          )}
          <GlowButton size="sm" onClick={() => onBuy(raceBundleProduct)} icon={<span>→</span>}>
            Satın Al
          </GlowButton>
          {raceBundleProduct.stock !== undefined && (
            <span className="font-display text-[9px]" style={{ color: '#ff3355' }}>⚠ {raceBundleProduct.stock} adet kaldı</span>
          )}
        </div>
      </div>
    </MangaPanel>
  );
}

// ── Purchase Modal ────────────────────────────────────────────────────────────
function PurchaseModal({
  product,
  raceColor,
  raceGlow,
  onClose,
  onConfirm,
  success,
}: {
  product: ShopProduct;
  raceColor: string;
  raceGlow: string;
  onClose: () => void;
  onConfirm: () => void;
  success: boolean;
}) {
  const hasBoth = product.gemPrice !== undefined && product.goldPrice !== undefined;
  const defaultCurrency: Currency = product.gemPrice !== undefined ? 'gem' : 'gold';
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

  const price = currency === 'gem' ? product.gemPrice : product.goldPrice;
  const originalPrice = currency === 'gem' ? product.originalGemPrice : product.originalGoldPrice;
  const playerBalance = currency === 'gem' ? PLAYER_CURRENCY.gem : PLAYER_CURRENCY.gold;
  const canAfford = price !== undefined && playerBalance >= price;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(8,10,16,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          animation: 'slideUp 0.4s cubic-bezier(0.32,0.72,0,1) forwards',
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Outer shell */}
        <div
          className="p-[2px] rounded-sm"
          style={{
            background: `linear-gradient(135deg, ${raceColor}44 0%, ${raceColor}11 50%, transparent 100%)`,
            boxShadow: `0 0 40px ${raceGlow}, 0 20px 60px rgba(0,0,0,0.8)`,
          }}
        >
          {/* Inner core */}
          <div
            className="rounded-sm overflow-hidden"
            style={{ background: 'rgba(13,17,23,0.98)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <div className="font-display text-[10px] uppercase tracking-[0.2em] text-text-muted mb-0.5">Satın Al</div>
                <div className="font-display text-base font-black text-text-primary">{product.icon} {product.name}</div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-sm text-text-muted hover:text-text-primary transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(68,255,136,0.15)', boxShadow: '0 0 20px rgba(68,255,136,0.3)' }}
                >
                  ✓
                </div>
                <div className="font-display text-lg font-black" style={{ color: '#44ff88' }}>Satın Alındı!</div>
                <div className="font-body text-sm text-text-secondary">{product.name} envanterinize eklendi.</div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Bundle contents */}
                <div>
                  <div className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-2">İçerik</div>
                  <div className="space-y-1">
                    {product.bundleContents.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: raceColor }} />
                        <span className="font-body text-sm text-text-secondary">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Currency toggle */}
                {hasBoth && (
                  <div>
                    <div className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-2">Ödeme Yöntemi</div>
                    <div className="flex gap-2">
                      {(['gem', 'gold'] as Currency[]).map(c => (
                        <button
                          key={c}
                          onClick={() => setCurrency(c)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm font-display text-xs font-bold transition-all duration-300"
                          style={{
                            background: currency === c ? `${raceColor}22` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${currency === c ? raceColor + '55' : 'rgba(255,255,255,0.08)'}`,
                            color: currency === c ? raceColor : 'var(--color-text-secondary)',
                          }}
                        >
                          {c === 'gem' ? '💎 Kristal' : '🪙 Altın'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price summary */}
                <div
                  className="rounded-sm p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-body text-sm text-text-secondary">Fiyat</span>
                    <div className="flex items-center gap-2">
                      {originalPrice && (
                        <span className="font-display text-sm line-through text-text-muted">
                          {currency === 'gem' ? '💎' : '🪙'}{originalPrice.toLocaleString()}
                        </span>
                      )}
                      {product.discount && (
                        <span className="font-display text-xs px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(255,51,85,0.15)', color: '#ff3355' }}>
                          %{product.discount} OFF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-display text-base font-black text-text-primary">Toplam</span>
                    <span
                      className="font-display text-xl font-black"
                      style={{ color: currency === 'gem' ? '#00cfff' : '#ffc832' }}
                    >
                      {currency === 'gem' ? '💎' : '🪙'} {price?.toLocaleString() ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="font-body text-xs text-text-muted">Bakiyeniz</span>
                    <span className="font-display text-xs" style={{ color: canAfford ? 'var(--color-text-secondary)' : '#ff3355' }}>
                      {currency === 'gem' ? '💎' : '🪙'} {playerBalance.toLocaleString()}
                    </span>
                  </div>
                  {!canAfford && price !== undefined && (
                    <div className="mt-2 font-display text-[10px] text-center" style={{ color: '#ff3355' }}>
                      ⚠ Yetersiz bakiye · {(price - playerBalance).toLocaleString()} {currency === 'gem' ? 'kristal' : 'altın'} eksik
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-sm font-display text-sm font-bold text-text-secondary transition-all duration-300 hover:text-text-primary active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    İptal
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={!canAfford}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm font-display text-sm font-black uppercase tracking-widest transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: canAfford
                        ? `linear-gradient(135deg, ${raceColor}, ${raceColor}bb)`
                        : 'rgba(255,255,255,0.06)',
                      color: canAfford ? '#080a10' : 'var(--color-text-muted)',
                      boxShadow: canAfford ? `0 4px 20px ${raceGlow}` : 'none',
                    }}
                  >
                    Onayla
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-transform duration-300"
                      style={{ background: 'rgba(0,0,0,0.2)' }}
                    >
                      ✓
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Battle Pass Section ───────────────────────────────────────────────────────
function BattlePassSection({
  raceColor,
  raceGlow,
  onBuyPass,
}: {
  raceColor: string;
  raceGlow: string;
  onBuyPass: () => void;
}) {
  const [isPremium, setIsPremium] = useState(BATTLE_PASS_IS_PREMIUM);
  const currentLevel = BATTLE_PASS_PLAYER_LEVEL;
  const seasonProgress = (currentLevel / 30) * 100;

  return (
    <div className="space-y-5">
      {/* Season Header */}
      <MangaPanel className="relative overflow-hidden p-5 sm:p-6" glow>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 70% at 85% 30%, ${raceGlow} 0%, rgba(204,0,255,0.06) 50%, transparent 80%)` }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge badge-race">⚔️ Sezon 1</span>
              <span
                className="font-display text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,200,50,0.15)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.3)' }}
              >
                🔥 29 Gün Kaldı
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-black text-text-primary mb-1">
              Galaksi Fatihi Savaş Geçişi
            </h3>
            <p className="font-body text-text-secondary text-sm mb-4 max-w-md">
              30 seviye, 2 iz — Ücretsiz ödüller herkese açık. Premium geçiş ile galaksinin en güçlü skin'lerine ulaş.
            </p>

            {/* Progress bar */}
            <div className="max-w-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">Seviye {currentLevel} / 30</span>
                <span className="font-display text-[10px]" style={{ color: raceColor }}>{Math.round(seasonProgress)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{
                    width: `${seasonProgress}%`,
                    background: `linear-gradient(90deg, ${raceColor}, #00cfff)`,
                    boxShadow: `0 0 8px ${raceGlow}`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Premium CTA */}
          {!isPremium && (
            <div
              className="shrink-0 flex flex-col items-center gap-3 p-4 rounded-sm text-center"
              style={{ background: 'rgba(255,200,50,0.06)', border: '1px solid rgba(255,200,50,0.18)' }}
            >
              <span className="font-display text-[9px] uppercase tracking-widest" style={{ color: '#ffc832' }}>Premium Geçiş</span>
              <div className="flex items-end gap-1.5 justify-center">
                <span className="font-display text-2xl font-black" style={{ color: '#00cfff' }}>💎 {BATTLE_PASS_PREMIUM_PRICE.toLocaleString()}</span>
              </div>
              <GlowButton size="sm" onClick={() => { setIsPremium(true); onBuyPass(); }} icon={<span>→</span>}>
                Aktif Et
              </GlowButton>
              <span className="font-display text-[9px] text-text-muted">+ Plus: 💎 {BATTLE_PASS_PREMIUM_PLUS_PRICE.toLocaleString()}</span>
            </div>
          )}
          {isPremium && (
            <div
              className="shrink-0 flex flex-col items-center gap-2 p-4 rounded-sm text-center"
              style={{ background: 'rgba(68,255,136,0.06)', border: '1px solid rgba(68,255,136,0.2)' }}
            >
              <span className="font-display text-2xl">✓</span>
              <span className="font-display text-xs font-black" style={{ color: '#44ff88' }}>Premium Aktif</span>
              <span className="font-display text-[9px] text-text-muted">Sezon 1</span>
            </div>
          )}
        </div>
      </MangaPanel>

      {/* Track Toggle */}
      <div className="flex items-center gap-3">
        <span className="badge badge-race">İz Gösterimi</span>
        <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
        <div
          className="flex items-center gap-1 p-1 rounded-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="font-display text-[9px] px-2 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' }}>
            Ücretsiz + Premium
          </span>
        </div>
      </div>

      {/* Tier Grid */}
      <div className="space-y-2">
        {BATTLE_PASS_TIERS.map((tier) => {
          const isCompleted = tier.level <= currentLevel;
          const isCurrent   = tier.level === currentLevel + 1;
          const isPremiumTier = !isPremium;

          return (
            <div
              key={tier.level}
              className={clsx(
                'relative flex items-stretch gap-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                tier.milestone && 'scale-[1.01]',
              )}
            >
              {/* Level number */}
              <div
                className="shrink-0 w-9 flex flex-col items-center justify-center gap-0.5"
              >
                <span
                  className="font-display text-xs font-black"
                  style={{ color: isCompleted ? raceColor : 'var(--color-text-muted)' }}
                >
                  {tier.level}
                </span>
                {tier.milestone && (
                  <span className="font-display text-[6px] uppercase tracking-widest" style={{ color: '#ffc832' }}>
                    Kilit
                  </span>
                )}
              </div>

              {/* Connector line */}
              <div className="shrink-0 flex flex-col items-center py-1 gap-0.5">
                <div
                  className="w-0.5 flex-1 rounded-full transition-all duration-700"
                  style={{ background: isCompleted ? raceColor : 'rgba(255,255,255,0.06)', boxShadow: isCompleted ? `0 0 4px ${raceGlow}` : 'none' }}
                />
                <div
                  className={clsx('w-2.5 h-2.5 rounded-full border shrink-0 transition-all duration-500', isCurrent && 'animate-pulse')}
                  style={{
                    background: isCompleted ? raceColor : isCurrent ? `${raceColor}44` : 'rgba(255,255,255,0.06)',
                    borderColor: isCompleted ? raceColor : isCurrent ? raceColor : 'rgba(255,255,255,0.12)',
                    boxShadow: isCompleted ? `0 0 6px ${raceGlow}` : isCurrent ? `0 0 8px ${raceGlow}` : 'none',
                  }}
                />
                <div
                  className="w-0.5 flex-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              </div>

              {/* Free track card */}
              <div
                className={clsx(
                  'flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-sm transition-all duration-500',
                  tier.milestone && 'py-3',
                )}
                style={{
                  background: isCompleted ? `${raceColor}0e` : 'rgba(13,17,23,0.8)',
                  border: `1px solid ${isCompleted ? raceColor + '30' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {tier.free ? (
                  <>
                    <span
                      className="text-lg shrink-0 transition-transform duration-500"
                      style={{ filter: isCompleted ? `drop-shadow(0 0 6px ${raceColor})` : 'none', transform: isCompleted ? 'scale(1.1)' : 'scale(1)' }}
                    >
                      {tier.free.icon}
                    </span>
                    <span
                      className="font-display text-[11px] font-bold leading-tight"
                      style={{ color: isCompleted ? (tier.free.color ?? raceColor) : 'var(--color-text-secondary)' }}
                    >
                      {tier.free.label}
                    </span>
                    {isCompleted && (
                      <span className="ml-auto font-display text-[10px] font-black" style={{ color: '#44ff88' }}>✓</span>
                    )}
                  </>
                ) : (
                  <span className="font-display text-[10px] text-text-muted">—</span>
                )}
              </div>

              {/* Premium track card */}
              <div
                className={clsx(
                  'flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-sm transition-all duration-500',
                  tier.milestone && 'py-3',
                  isPremiumTier && 'opacity-60',
                )}
                style={{
                  background: isPremium && isCompleted
                    ? 'rgba(255,200,50,0.08)'
                    : isPremiumTier
                    ? 'rgba(13,17,23,0.5)'
                    : 'rgba(13,17,23,0.8)',
                  border: `1px solid ${
                    isPremium && isCompleted
                      ? 'rgba(255,200,50,0.25)'
                      : isPremiumTier
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,200,50,0.12)'
                  }`,
                }}
              >
                {isPremiumTier && (
                  <span className="text-sm shrink-0 opacity-50">🔒</span>
                )}
                <span className="text-lg shrink-0" style={{ filter: isPremium && isCompleted ? 'drop-shadow(0 0 6px rgba(255,200,50,0.5))' : 'none' }}>
                  {tier.premium.icon}
                </span>
                <span
                  className="font-display text-[11px] font-bold leading-tight"
                  style={{
                    color: isPremium && isCompleted
                      ? (tier.premium.color ?? '#ffc832')
                      : isPremiumTier
                      ? 'var(--color-text-muted)'
                      : (tier.premium.color ?? 'var(--color-text-secondary)'),
                  }}
                >
                  {tier.premium.label}
                </span>
                {isPremium && isCompleted && (
                  <span className="ml-auto font-display text-[10px] font-black" style={{ color: '#ffc832' }}>✓</span>
                )}
                {tier.milestone && !isPremiumTier && (
                  <span
                    className="ml-auto font-display text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(255,200,50,0.15)', color: '#ffc832', border: '1px solid rgba(255,200,50,0.3)' }}
                  >
                    Özel
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: `${raceColor}20`, border: `1px solid ${raceColor}40` }} />
          <span className="font-display text-[10px] text-text-muted">Ücretsiz İz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,200,50,0.15)', border: '1px solid rgba(255,200,50,0.3)' }} />
          <span className="font-display text-[10px] text-text-muted">Premium İz</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[10px] font-black" style={{ color: '#ffc832' }}>Özel</span>
          <span className="font-display text-[10px] text-text-muted">= Dönüm Noktası Ödülü</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { race, raceColor, raceGlow } = useRaceTheme();
  const [activeTab, setActiveTab] = useState<ShopTab>('genel');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const countdown = useCountdown(2 * 86400 + 5 * 3600 + 32 * 60 + 18);

  const raceDesc = RACE_DESCRIPTIONS[race];
  const raceBundleProduct = SHOP_PRODUCTS.find(p => p.id === RACE_BUNDLE_IDS[race]);

  const tabProducts = SHOP_PRODUCTS.filter(p => p.category === activeTab && !p.raceExclusive);

  function openModal(product: ShopProduct) {
    setSelectedProduct(product);
    setPurchaseSuccess(false);
  }

  function closeModal() {
    setSelectedProduct(null);
    setPurchaseSuccess(false);
  }

  function confirmPurchase() {
    setPurchaseSuccess(true);
    setTimeout(() => closeModal(), 1800);
  }

  return (
    <div className="h-dvh flex flex-col relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Background layers */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{ background: 'var(--gradient-nebula)', zIndex: 0 }}
        aria-hidden
      />
      <div className="fixed inset-0 halftone-bg pointer-events-none opacity-15" aria-hidden />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: 'rgba(8,10,16,0.92)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-text-muted text-xs hover:text-text-primary transition-colors flex items-center gap-1"
          >
            ← Ana Üs
          </Link>
          <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
          <div className="flex items-center gap-2">
            <span className="badge badge-race hidden sm:inline-flex">Mağaza</span>
            <span className="font-display text-sm font-black text-text-primary">💎 Nebula Mağazası</span>
          </div>
        </div>

        {/* Currency display */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
            style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.2)' }}
          >
            <span className="text-sm">💎</span>
            <span className="font-display text-xs font-black" style={{ color: '#00cfff' }}>
              {PLAYER_CURRENCY.gem.toLocaleString()}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
            style={{ background: 'rgba(255,200,50,0.08)', border: '1px solid rgba(255,200,50,0.2)' }}
          >
            <span className="text-sm">🪙</span>
            <span className="font-display text-xs font-black" style={{ color: '#ffc832' }}>
              {PLAYER_CURRENCY.gold.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col">

        {/* ── Tab Bar ─────────────────────────────────────────────────── */}
        <div
          className="sticky z-30 flex shrink-0"
          style={{
            top: '49px',
            background: 'rgba(8,10,16,0.90)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative flex-1 flex items-center justify-center gap-1.5 py-3 px-2 font-display text-xs font-bold uppercase tracking-widest transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{
                  color: isActive ? raceColor : 'var(--color-text-muted)',
                  background: isActive ? `${raceColor}08` : 'transparent',
                }}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full transition-all duration-500"
                    style={{ background: raceColor, boxShadow: `0 0 8px ${raceGlow}` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Scroll content ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-5 space-y-5 pb-8">

            {/* Battle Pass Section */}
            {activeTab === 'gecis' && (
              <BattlePassSection
                raceColor={raceColor}
                raceGlow={raceGlow}
                onBuyPass={() => {}}
              />
            )}

            {/* Featured Banner (non-battle-pass tabs) */}
            {activeTab !== 'gecis' && (
              <FeaturedBanner
                tab={activeTab}
                race={race}
                raceColor={raceColor}
                raceGlow={raceGlow}
                countdown={countdown}
                raceBundleProduct={activeTab === 'genel' ? raceBundleProduct : undefined}
                onBuy={openModal}
              />
            )}

            {/* Section header + Product Grid (non-battle-pass tabs only) */}
            {activeTab !== 'gecis' && (
              <>
                <div className="flex items-center gap-3">
                  <span className="badge badge-race">
                    {TABS.find(t => t.key === activeTab)?.icon} {TABS.find(t => t.key === activeTab)?.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
                  <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">
                    {tabProducts.length} ürün
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {tabProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      raceColor={raceColor}
                      raceGlow={raceGlow}
                      playerRace={race}
                      onBuy={openModal}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── All Race Bundles Showcase (Genel only) ───────────────── */}
            {activeTab !== 'gecis' && activeTab === 'genel' && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <span className="badge badge-race">🧬 Irk Paketleri</span>
                  <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SHOP_PRODUCTS.filter(p => p.raceExclusive !== undefined).map(product => {
                    const pRaceDesc = RACE_DESCRIPTIONS[product.raceExclusive!];
                    const isMyRace  = product.raceExclusive === race;
                    return (
                      <div
                        key={product.id}
                        className="group relative rounded-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
                        onClick={() => openModal(product)}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                      >
                        <div
                          className="p-[1.5px] rounded-sm"
                          style={{
                            background: isMyRace
                              ? `linear-gradient(135deg, ${pRaceDesc.color}88, ${pRaceDesc.color}22)`
                              : `linear-gradient(135deg, ${pRaceDesc.color}44, transparent)`,
                            boxShadow: isMyRace ? `0 0 16px ${pRaceDesc.glowColor}` : 'none',
                          }}
                        >
                          <div
                            className="flex items-center gap-3 p-3 rounded-sm"
                            style={{ background: 'rgba(13,17,23,0.96)' }}
                          >
                            <div
                              className="w-10 h-10 rounded-sm flex items-center justify-center text-xl shrink-0"
                              style={{ background: pRaceDesc.bgColor, border: `1px solid ${pRaceDesc.color}33` }}
                            >
                              {pRaceDesc.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-display text-xs font-black truncate" style={{ color: pRaceDesc.color }}>
                                  {product.name}
                                </span>
                                {isMyRace && (
                                  <span
                                    className="shrink-0 font-display text-[8px] uppercase px-1.5 py-0.5 rounded-full"
                                    style={{ background: `${pRaceDesc.color}22`, color: pRaceDesc.color, border: `1px solid ${pRaceDesc.color}44` }}
                                  >
                                    Sen
                                  </span>
                                )}
                              </div>
                              <div className="font-display text-[10px] text-text-muted">{pRaceDesc.name}</div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span className="font-display text-xs font-black" style={{ color: '#00cfff' }}>
                                💎 {product.gemPrice}
                              </span>
                              {product.discount && (
                                <span className="font-display text-[9px] px-1 py-0.5 rounded-sm" style={{ background: 'rgba(255,51,85,0.12)', color: '#ff3355' }}>
                                  %{product.discount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Special timed offers row (Etkinlik tab) ──────────────── */}
            {activeTab === 'etkinlik' && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="badge badge-race">⏱ Sınırlı Teklifler</span>
                  <div className="flex-1 h-px" style={{ background: `${raceColor}20` }} />
                  <div className="flex items-center gap-1 text-text-muted font-display text-[10px]">
                    <span className="animate-pulse" style={{ color: '#ff3355' }}>●</span>
                    <span>{String(countdown.d).padStart(2,'0')}:{String(countdown.h).padStart(2,'0')}:{String(countdown.m).padStart(2,'0')}</span>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                    { icon: '⚡', label: '2× Tüm Üretim', price: '50💎', ends: `${countdown.h}s${countdown.m}d`, color: '#ffc832' },
                    { icon: '🎯', label: 'PvP Giriş Tokeni', price: '30💎', ends: `${countdown.h}s${countdown.m}d`, color: '#44ff88' },
                    { icon: '🌀', label: 'Çağ Atlama Kartı', price: '200💎', ends: `${countdown.h}s${countdown.m}d`, color: '#cc00ff' },
                    { icon: '🔮', label: 'Komutan Kilidi Aç', price: '150💎', ends: `${countdown.h}s${countdown.m}d`, color: '#00cfff' },
                  ].map((offer, i) => (
                    <div
                      key={i}
                      className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-sm"
                      style={{
                        background: 'rgba(13,17,23,0.95)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        minWidth: '100px',
                      }}
                    >
                      <span className="text-2xl">{offer.icon}</span>
                      <span className="font-display text-[10px] text-center text-text-secondary leading-tight">{offer.label}</span>
                      <span className="font-display text-xs font-black" style={{ color: offer.color }}>{offer.price}</span>
                      <span className="font-display text-[9px] text-text-muted">{offer.ends}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </main>

      {/* ── Purchase Modal ───────────────────────────────────────────── */}
      {selectedProduct && (
        <PurchaseModal
          product={selectedProduct}
          raceColor={raceColor}
          raceGlow={raceGlow}
          onClose={closeModal}
          onConfirm={confirmPurchase}
          success={purchaseSuccess}
        />
      )}
    </div>
  );
}
