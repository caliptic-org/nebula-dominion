'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ND,
  Sigil,
  Screen,
  Panel,
  NotchPanel,
  Bar,
  Eyebrow,
  H2,
  H3,
  Caption,
  Chip,
  Code,
  NDButton,
  ResPill,
  BottomNav,
  useNDRace,
  type NDRace,
} from '@/components/handoff';

type Tab = 'genel' | 'vip' | 'lonca' | 'etkinlik' | 'gecis';
type Currency = 'gem' | 'gold';
type Tag = 'new' | 'best' | 'limited' | 'hot';

interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: Tab;
  gemPrice?: number;
  goldPrice?: number;
  originalGemPrice?: number;
  originalGoldPrice?: number;
  discount?: number;
  stock?: number;
  tag?: Tag;
  bundleContents: string[];
  raceTinted?: boolean;
  featured?: boolean;
}

interface VipTier {
  level: number;
  label: string;
  xp: number;
  benefits: string[];
}

interface VipPlan {
  id: string;
  label: string;
  days: number;
  gemPrice: number;
  bonusGems: number;
  tag?: 'POPÜLER' | 'EN İYİ DEĞER';
}

const PRODUCTS: ShopProduct[] = [
  // Genel
  { id: 'gem-small',  name: 'Kristal Paketi',   description: '100 Nebula Kristali',           category: 'genel', goldPrice: 800,                                                       bundleContents: ['100 Kristal'] },
  { id: 'gem-medium', name: 'Kristal Demeti',   description: '550 Kristal (+50 bonus)',        category: 'genel', goldPrice: 4000, originalGoldPrice: 4500, discount: 10, tag: 'hot',    bundleContents: ['500 Kristal', '+50 Bonus'] },
  { id: 'gem-large',  name: 'Kristal Hazinesi', description: '1440 Kristal (+240 bonus)',      category: 'genel', goldPrice: 9000, originalGoldPrice: 12000, discount: 25, tag: 'best',  bundleContents: ['1200 Kristal', '+240 Bonus', 'Özel Çerçeve'] },
  { id: 'xp-booster', name: 'XP Uyarıcı',       description: '2× XP kazanımı 24 saat',         category: 'genel', gemPrice: 200, goldPrice: 1600, tag: 'hot',                            bundleContents: ['2× XP × 24 saat'] },
  { id: 'resource-pack', name: 'Kaynak Paketi', description: 'Mineral, Gas ve Energy dolumu', category: 'genel', gemPrice: 150, goldPrice: 1200,                                          bundleContents: ['1.000 Mineral', '500 Gas', '300 Energy'] },
  { id: 'shield-8h',  name: 'Savaş Kalkanı',    description: '8 saatlik saldırı koruması',    category: 'genel', gemPrice: 80,  goldPrice: 640,                                           bundleContents: ['8 Saat Koruma'] },
  { id: 'speed-boost', name: 'Hız Katalizörü',  description: 'Tüm üretimler 1 saat anında',  category: 'genel', gemPrice: 50,  goldPrice: 400,                                            bundleContents: ['1 Saat Anında Üretim'] },
  // Race exclusive
  { id: 'race-bundle', name: 'Irk Paketi',      description: 'Aktif ırka özel güç paketi',    category: 'genel', gemPrice: 500, originalGemPrice: 750, discount: 33, tag: 'limited', stock: 50, raceTinted: true, bundleContents: ['Özel komutan çerçevesi', '5× Hızlandırıcı', '2× Kalkan', '500 Mineral', '300 Gas'] },
  // VIP plans (rendered via VIP section)
  // Lonca
  { id: 'lonca-kaynak',     name: 'Lonca Kaynağı',         description: 'Lonca ambarı için kaynak',            category: 'lonca', gemPrice: 300, goldPrice: 2400, bundleContents: ['5.000 Lonca Minerali', '2.500 Lonca Gazı'] },
  { id: 'lonca-gelistirme', name: 'Geliştirme Paketi',     description: 'Lonca binası hızlandırıcı',           category: 'lonca', gemPrice: 500, tag: 'hot',     bundleContents: ['Lonca Ar-Ge × 2', 'Lonca Puanı × 1000'] },
  { id: 'lonca-tech',       name: 'Teknoloji Hızlandırıcı',description: 'Lonca araştırmasını hızlandır',       category: 'lonca', gemPrice: 200, goldPrice: 1600, bundleContents: ['Araştırma Hızlandırıcı × 5'] },
  // Etkinlik
  { id: 'event-frame',    name: 'Galaksi Çerçevesi', description: 'Sınırlı kozmik profil çerçevesi',  category: 'etkinlik', gemPrice: 100, tag: 'limited', stock: 200, bundleContents: ['Galaksi Profil Çerçevesi', 'Yıldız Efekti'] },
  { id: 'event-explorer', name: 'Kaşif Paketi',      description: 'Etkinlik özel keşif paketi',       category: 'etkinlik', gemPrice: 250, originalGemPrice: 400, discount: 37, tag: 'hot', stock: 100, bundleContents: ['Kaşif Çerçevesi', '3× XP Booster'] },
  { id: 'event-galaxy',   name: 'Galaksi Fatihi',    description: 'Etkinlik mega paketi',             category: 'etkinlik', gemPrice: 800, originalGemPrice: 1400, discount: 43, tag: 'limited', stock: 25, featured: true, bundleContents: ['Özel Komutan Skin', 'Galaksi Teması', '5× Tüm Irk Paketi'] },
];

const VIP_TIERS: VipTier[] = [
  { level: 1, label: 'VIP I',   xp: 0,     benefits: ['Günlük +50 Kristal', '2× XP Kazanımı', 'Reklamsız Deneyim'] },
  { level: 2, label: 'VIP II',  xp: 500,   benefits: ['+1 İnşaat Kuyruğu', '+10% Kaynak Üretimi'] },
  { level: 3, label: 'VIP III', xp: 1_200, benefits: ['2× Günlük Ödül', 'VIP Profil Çerçevesi'] },
  { level: 4, label: 'VIP IV',  xp: 2_500, benefits: ['+2 İnşaat Kuyruğu', '+15% Kaynak Üretimi'] },
  { level: 5, label: 'VIP V',   xp: 4_500, benefits: ['Özel Savaş Alanı Girişi', 'Günlük +100 Kristal'] },
  { level: 6, label: 'VIP VI',  xp: 7_500, benefits: ['Komutan XP ×3', 'Lonca Mağazası %25 İndirim'] },
  { level: 7, label: 'VIP VII', xp: 12_000, benefits: ['Özel VIP Komutan Skini'] },
];

const VIP_PLANS: VipPlan[] = [
  { id: 'vip-monthly',  label: 'VIP Aylık',   days: 30,  gemPrice: 1000 },
  { id: 'vip-quarterly', label: 'VIP 3 Aylık', days: 90,  gemPrice: 2500, bonusGems: 200, tag: 'POPÜLER' },
  { id: 'vip-annual',   label: 'VIP Yıllık',  days: 365, gemPrice: 8000, bonusGems: 1000, tag: 'EN İYİ DEĞER' },
].map(p => ({ ...p, bonusGems: p.bonusGems ?? 0 } as VipPlan));

const TAB_LABEL: Record<Tab, string> = {
  genel: 'Genel',
  vip: 'VIP',
  lonca: 'Lonca',
  etkinlik: 'Etkinlik',
  gecis: 'Savaş Geçişi',
};

const TAG_COLOR: Record<Tag, string> = {
  new: ND.ok,
  best: ND.warn,
  limited: ND.danger,
  hot: 'oklch(0.72 0.18 50)',
};

const PLAYER_CURRENCY = { gem: 1250, gold: 8400 };
const PLAYER_VIP_LEVEL = 3;
const PLAYER_VIP_XP = 1_650;

function useCountdown(secs: number) {
  const [s, setS] = useState(secs);
  useEffect(() => {
    if (s <= 0) return;
    const id = setInterval(() => setS(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [s]);
  return {
    d: Math.floor(s / 86_400),
    h: Math.floor((s % 86_400) / 3_600),
    m: Math.floor((s % 3_600) / 60),
    done: s <= 0,
  };
}

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base: '/base',
  galaxy: '/map',
  cmd: '/commanders',
  story: '/story-gallery',
  more: '/settings',
};

export default function ShopPage() {
  const race = useNDRace();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('genel');
  const [currency, setCurrency] = useState<Currency>('gem');
  const promoTimer = useCountdown(2 * 86_400 + 4 * 3_600);

  const visible = useMemo(() => {
    if (tab === 'vip') return [] as ShopProduct[];
    if (tab === 'gecis') return [] as ShopProduct[];
    return PRODUCTS.filter(p => p.category === tab);
  }, [tab]);

  return (
    <Screen race={race} style={{ minHeight: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${race.primary}33`,
        }}
      >
        <Link href="/dashboard" aria-label="Geri" style={iconBtn()}>‹</Link>
        <Sigil race={race} size={28} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={race.primary}>MAĞAZA</Eyebrow>
          <H2 style={{ marginTop: 2 }}>NEBULA MARKET</H2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ResPill kind="crystal" value={PLAYER_CURRENCY.gem.toLocaleString('tr-TR')} accent={race.primary} />
          <ResPill kind="cred" value={PLAYER_CURRENCY.gold.toLocaleString('tr-TR')} accent={ND.warn} />
        </div>
      </header>

      {/* Promo strip */}
      <div style={{ padding: '12px 16px 0' }}>
        <NotchPanel race={race}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <Eyebrow color={race.primary}>SEZON FIRSATI</Eyebrow>
              <H3 style={{ color: ND.text, marginTop: 2 }}>{race.short} Irk Paketi · %33 İndirim</H3>
            </div>
            <Code style={{ color: ND.warn }}>
              ⏱ {promoTimer.d}g {String(promoTimer.h).padStart(2, '0')}s {String(promoTimer.m).padStart(2, '0')}d
            </Code>
          </div>
        </NotchPanel>
      </div>

      {/* Tabs */}
      <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, padding: '12px 16px 0' }}>
        {(Object.keys(TAB_LABEL) as Tab[]).map(t => {
          const on = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setTab(t)}
              style={tabStyle(on, race)}
            >
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </div>

      {/* Currency switch — only meaningful for non-VIP tabs */}
      {tab !== 'vip' && tab !== 'gecis' && (
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0' }}>
          {(['gem', 'gold'] as Currency[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              style={pillStyle(currency === c, race)}
              aria-pressed={currency === c}
            >
              {c === 'gem' ? '💎 Kristal' : '🪙 Altın'}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'vip' && <VipSection race={race} />}
        {tab === 'gecis' && <BattlePassSection race={race} />}
        {tab !== 'vip' && tab !== 'gecis' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {visible.map(p => (
                <ProductCard key={p.id} product={p} race={race} currency={currency} />
              ))}
            </div>
            {visible.length === 0 && (
              <Panel race={race} style={{ padding: 24, textAlign: 'center' }}>
                <Caption>Bu kategoride ürün yok.</Caption>
              </Panel>
            )}
          </>
        )}
      </div>

      <BottomNav
        race={race}
        active="more"
        onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/settings')}
      />
    </Screen>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function iconBtn(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 4,
    border: `1px solid ${ND.border}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: ND.text,
    fontFamily: ND.display,
    textDecoration: 'none',
  };
}

function tabStyle(on: boolean, race: NDRace): React.CSSProperties {
  return {
    padding: '10px 6px',
    fontFamily: ND.display,
    fontSize: 10,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    background: on ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)` : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    borderRadius: 3,
    cursor: 'pointer',
  };
}

function pillStyle(on: boolean, race: NDRace): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontFamily: ND.display,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: on ? `linear-gradient(180deg, ${race.primary}22, transparent)` : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    borderRadius: 4,
    cursor: 'pointer',
  };
}

function ProductCard({ product, race, currency }: { product: ShopProduct; race: NDRace; currency: Currency }) {
  const useGem = currency === 'gem' && product.gemPrice !== undefined;
  const price = useGem ? product.gemPrice : product.goldPrice;
  const originalPrice = useGem ? product.originalGemPrice : product.originalGoldPrice;
  const unitIcon = useGem ? '💎' : '🪙';
  return (
    <Panel
      race={race}
      glow={product.featured || product.raceTinted}
      style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderColor: product.raceTinted ? race.primary : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <H3 style={{ color: ND.text }}>{product.name}</H3>
          <Caption style={{ marginTop: 4 }}>{product.description}</Caption>
        </div>
        {product.tag && <Chip color={TAG_COLOR[product.tag]}>{product.tag.toUpperCase()}</Chip>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {product.bundleContents.map((line, idx) => (
          <Caption key={idx} style={{ fontSize: 10 }}>◆ {line}</Caption>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        <div>
          {price !== undefined ? (
            <>
              <div style={{ fontFamily: ND.display, fontSize: 16, color: race.primary }}>
                {unitIcon} {price.toLocaleString('tr-TR')}
              </div>
              {originalPrice !== undefined && (
                <Code style={{ textDecoration: 'line-through', color: ND.textMute, fontSize: 10 }}>
                  {unitIcon} {originalPrice.toLocaleString('tr-TR')}
                </Code>
              )}
            </>
          ) : (
            <Code style={{ color: ND.textDim }}>—</Code>
          )}
          {product.stock !== undefined && (
            <Caption style={{ fontSize: 9 }}>Kalan: {product.stock}</Caption>
          )}
        </div>
        <NDButton race={race} size="sm">Satın Al</NDButton>
      </div>
    </Panel>
  );
}

function VipSection({ race }: { race: NDRace }) {
  const currentTier = VIP_TIERS.find(t => t.level === PLAYER_VIP_LEVEL) ?? VIP_TIERS[0];
  const nextTier = VIP_TIERS.find(t => t.level === PLAYER_VIP_LEVEL + 1);
  const progressPct = nextTier
    ? Math.max(0, Math.min(100, ((PLAYER_VIP_XP - currentTier.xp) / (nextTier.xp - currentTier.xp)) * 100))
    : 100;

  return (
    <>
      <NotchPanel race={race}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(180deg, ${race.primary}, ${race.primaryDim})`,
              border: `2px solid ${race.glow}`,
              boxShadow: `0 0 24px -4px ${race.glow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-bg-elevated)',
              fontFamily: ND.display,
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {PLAYER_VIP_LEVEL}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow color={race.primary}>SEN · {currentTier.label}</Eyebrow>
            <H3 style={{ marginTop: 2, color: ND.text }}>
              {nextTier ? `${nextTier.label} için ${(nextTier.xp - PLAYER_VIP_XP).toLocaleString('tr-TR')} XP` : 'En yüksek seviye'}
            </H3>
            <div style={{ marginTop: 6 }}>
              <Bar value={progressPct} color={race.primary} />
            </div>
          </div>
        </div>
      </NotchPanel>

      {/* Daily claim */}
      <Panel race={race}>
        <div style={panelHeader()}>
          <Eyebrow color={race.primary}>GÜNLÜK ÖDÜL</Eyebrow>
          <Code>VIP {PLAYER_VIP_LEVEL}</Code>
        </div>
        <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Caption>
            Her gün <strong style={{ color: race.primary }}>+50 Kristal</strong> ve <strong style={{ color: ND.warn }}>+200 XP</strong>.
          </Caption>
          <NDButton race={race}>Bugün Al</NDButton>
        </div>
      </Panel>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {VIP_PLANS.map(p => (
          <Panel
            key={p.id}
            race={race}
            glow={p.tag === 'EN İYİ DEĞER'}
            style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <H3 style={{ color: ND.text }}>{p.label}</H3>
              {p.tag && <Chip color={ND.warn}>{p.tag}</Chip>}
            </div>
            <Caption>{p.days} gün VIP üyelik</Caption>
            <Caption style={{ fontSize: 10 }}>+{p.bonusGems.toLocaleString('tr-TR')} bonus kristal</Caption>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div style={{ fontFamily: ND.display, fontSize: 18, color: race.primary }}>💎 {p.gemPrice.toLocaleString('tr-TR')}</div>
              <NDButton race={race} size="sm">Yükselt</NDButton>
            </div>
          </Panel>
        ))}
      </div>

      {/* Tier ladder */}
      <Panel race={race}>
        <div style={panelHeader()}>
          <Eyebrow color={race.primary}>VIP MERDİVENİ</Eyebrow>
        </div>
        <div>
          {VIP_TIERS.map(t => {
            const owned = t.level <= PLAYER_VIP_LEVEL;
            return (
              <div
                key={t.level}
                style={{
                  padding: '10px 12px',
                  borderBottom: `1px solid ${ND.border}`,
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr',
                  gap: 10,
                  opacity: owned ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: `2px solid ${owned ? race.primary : ND.border}`,
                    background: owned ? `${race.primary}22` : 'transparent',
                    color: owned ? race.primary : ND.textDim,
                    fontFamily: ND.display,
                    fontWeight: 800,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {t.level}
                </div>
                <div>
                  <H3 style={{ color: owned ? race.primary : ND.text }}>{t.label}</H3>
                  <Caption style={{ fontSize: 11 }}>{t.benefits.join(' · ')}</Caption>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function BattlePassSection({ race }: { race: NDRace }) {
  const playerLevel = 12;
  const totalLevels = 30;
  return (
    <>
      <NotchPanel race={race}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <Eyebrow color={race.primary}>SEZON GEÇİŞİ</Eyebrow>
            <H3 style={{ marginTop: 2, color: ND.text }}>
              Seviye {playerLevel} / {totalLevels}
            </H3>
          </div>
          <Code style={{ color: ND.warn }}>⏱ 18g 4s</Code>
        </div>
        <div style={{ marginTop: 8 }}>
          <Bar value={(playerLevel / totalLevels) * 100} color={race.primary} />
        </div>
      </NotchPanel>

      <Panel race={race}>
        <div style={panelHeader()}>
          <Eyebrow color={race.primary}>SONRAKİ ÖDÜLLER</Eyebrow>
        </div>
        <div>
          {Array.from({ length: 5 }, (_, i) => {
            const lv = playerLevel + i;
            const milestone = lv % 5 === 0;
            return (
              <div
                key={lv}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr',
                  gap: 10,
                  padding: '10px 12px',
                  borderBottom: `1px solid ${ND.border}`,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    background: milestone ? race.primary : 'rgba(255,255,255,0.04)',
                    color: milestone ? 'var(--color-bg-elevated)' : ND.text,
                    border: milestone ? 'none' : `1px solid ${ND.border}`,
                    fontFamily: ND.display,
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {lv}
                </div>
                <div>
                  <Caption style={{ fontSize: 10 }}>ÜCRETSİZ</Caption>
                  <div style={{ fontFamily: ND.display, fontSize: 11, color: ND.text }}>+500 Mineral</div>
                </div>
                <div>
                  <Caption style={{ fontSize: 10, color: race.primary }}>PREMIUM</Caption>
                  <div style={{ fontFamily: ND.display, fontSize: 11, color: race.primary }}>
                    {milestone ? 'Komutan Skin' : `+${20 * (i + 1)} Kristal`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <NDButton race={race} full>Premium Geçiş Satın Al · 💎 800</NDButton>
    </>
  );
}

function panelHeader(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: `1px solid ${ND.border}`,
  };
}
