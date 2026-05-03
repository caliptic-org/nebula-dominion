'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CountdownTimer } from '@/components/events/CountdownTimer';
import { EventBadge, type EventType } from '@/components/events/EventBadge';
import { RewardTable, type Reward } from '@/components/events/RewardTable';

/* ── Types & data ──────────────────────────────────────────────── */

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  race: string;
  raceColor: string;
  isPlayer?: boolean;
}

interface EventRule {
  icon: string;
  title: string;
  desc: string;
}

interface EventDetail {
  id: string;
  title: string;
  subtitle: string;
  type: EventType;
  status: 'active' | 'upcoming' | 'archive';
  raceColor: string;
  raceGradient: string;
  raceLabel: string;
  endDate: Date;
  startDate: Date;
  description: string;
  rules: EventRule[];
  rewards: Reward[];
  leaderboard: LeaderboardEntry[];
}

const now = Date.now();

const EVENTS_MAP: Record<string, EventDetail> = {
  'zerg-domination-s1': {
    id: 'zerg-domination-s1',
    title: 'ZERG HAKİMİYET',
    subtitle: 'Sezon I · Kovan Savaşları',
    type: 'tournament',
    status: 'active',
    raceColor: '#44ff44',
    raceGradient: 'linear-gradient(135deg, #003300 0%, #001800 40%, #07090f 100%)',
    raceLabel: 'Zerg',
    endDate: new Date(now + 2 * 86400000 + 14 * 3600000),
    startDate: new Date(now - 3 * 86400000),
    description:
      'Zerg ırkının en güçlü komutanları bu sezon başlığı için çarpışıyor. Kovan zihni rehberliğinde her savaş kazanımın seni daha güçlü yapıyor. Biyolüminesan enerjini kullan, rakiplerine geçit verme.',
    rules: [
      {
        icon: '⚔️',
        title: 'Savaş Koşulları',
        desc: 'Yalnızca Zerg ırkı katılabilir. Her kazanılan PvP maçı puan verir. Gece yarısı başlayan sürpriz baskınlar 2x puan sunar.',
      },
      {
        icon: '⏱️',
        title: 'Süre',
        desc: 'Etkinlik 7 gün sürer. Son 24 saatte puan çarpanı x3\'e yükselir.',
      },
      {
        icon: '🧬',
        title: 'Mutasyon Bonusu',
        desc: 'Mutasyon yapısı seviye 5+ ise her savaştan %20 ekstra puan kazanırsın.',
      },
      {
        icon: '🚫',
        title: 'Yasaklar',
        desc: 'Koordineli attack botları, exploit kullanımı veya hesap paylaşımı tespit edilirse diskalifiye edilirsin.',
      },
    ],
    rewards: [
      { rank: 1, prize: '10,000 Kristal', prizeDetail: '+ Efsanevi Zerg Kahraman Skin' },
      { rank: 2, prize: '6,000 Kristal', prizeDetail: '+ Nadir Mutasyon Çekirdeği x3' },
      { rank: 3, prize: '3,500 Kristal', prizeDetail: '+ Nadir Çekirdek x1' },
      { rank: 4, prize: '2,000 Kristal' },
      { rank: 5, prize: '1,200 Kristal' },
      { rank: 6, prize: '800 Kristal' },
      { rank: 7, prize: '500 Kristal' },
      { rank: 8, prize: '300 Kristal' },
      { rank: 9, prize: '200 Kristal' },
      { rank: 10, prize: '100 Kristal' },
    ],
    leaderboard: [
      { rank: 1, name: 'VexThara_GG', score: 48720, race: 'Zerg', raceColor: '#44ff44' },
      { rank: 2, name: 'MorgathPrime', score: 44190, race: 'Zerg', raceColor: '#44ff44' },
      { rank: 3, name: 'ThrenixVoid', score: 41350, race: 'Zerg', raceColor: '#44ff44' },
      { rank: 4, name: 'HiveQueen_X', score: 38800, race: 'Zerg', raceColor: '#44ff44' },
      { rank: 5, name: 'BioLumine', score: 35420, race: 'Zerg', raceColor: '#44ff44', isPlayer: true },
      { rank: 6, name: 'SynapseHive', score: 31110, race: 'Zerg', raceColor: '#44ff44' },
      { rank: 7, name: 'NexusSpore', score: 28750, race: 'Zerg', raceColor: '#44ff44' },
    ],
  },
  'automat-grid-race': {
    id: 'automat-grid-race',
    title: 'OTOMATİK IZGARA',
    subtitle: 'Kaynak Toplanması · Sprint Modu',
    type: 'resource',
    status: 'active',
    raceColor: '#00cfff',
    raceGradient: 'linear-gradient(135deg, #001a22 0%, #000d18 40%, #07090f 100%)',
    raceLabel: 'Otomat',
    endDate: new Date(now + 18 * 3600000),
    startDate: new Date(now - 6 * 3600000),
    description:
      'Elektrik maviyle parlayan otomat devleri galaksi genelinde kaynak hasat yarışında. Holografik HUD\'un sana en verimli toplama rotasını gösteriyor. Analitik zekânla rakiplerini geç.',
    rules: [
      {
        icon: '💎',
        title: 'Kaynak Takibi',
        desc: 'Toplanan her 100 birim enerji 1 puan verir. Kritik kaynak nodları 5x çarpan sunar.',
      },
      {
        icon: '🤖',
        title: 'Otomat Kısıtlaması',
        desc: 'Yalnızca Otomat ırkı Sprint Modu\'na katılabilir. Grid Lock teknolojisi aktif.',
      },
      {
        icon: '⚡',
        title: 'Enerji Yükü',
        desc: 'Enerji kapasiteni aştığında bonus puan biriktirilir. Taşıma birimi seviyesi puanı etkiler.',
      },
      {
        icon: '📡',
        title: 'İletişim Protokolü',
        desc: 'Grup koordinasyonu 1.5x takım çarpanı açar. 3+ kişilik ekipler ekstra ödül kazanır.',
      },
    ],
    rewards: [
      { rank: 1, prize: '5,000 Enerji', prizeDetail: '+ Efsanevi Grid Core Modülü' },
      { rank: 2, prize: '3,000 Enerji', prizeDetail: '+ Hologram Paketi x2' },
      { rank: 3, prize: '1,800 Enerji', prizeDetail: '+ Gelişmiş Çip x3' },
      { rank: 4, prize: '1,000 Enerji' },
      { rank: 5, prize: '600 Enerji' },
    ],
    leaderboard: [
      { rank: 1, name: 'DemiurgePrime', score: 22500, race: 'Otomat', raceColor: '#00cfff' },
      { rank: 2, name: 'AureliusCore', score: 20880, race: 'Otomat', raceColor: '#00cfff' },
      { rank: 3, name: 'CrucibleAI', score: 19340, race: 'Otomat', raceColor: '#00cfff' },
      { rank: 4, name: 'GridNode_7', score: 17200, race: 'Otomat', raceColor: '#00cfff', isPlayer: true },
      { rank: 5, name: 'NanoForge', score: 14800, race: 'Otomat', raceColor: '#00cfff' },
    ],
  },
  'guild-nebula-clash': {
    id: 'guild-nebula-clash',
    title: 'NEBULA ÇATIŞMASI',
    subtitle: 'Lonca Ligası · Grup Aşaması',
    type: 'guild',
    status: 'active',
    raceColor: '#cc00ff',
    raceGradient: 'linear-gradient(135deg, #1a0022 0%, #0d0015 40%, #07090f 100%)',
    raceLabel: 'Şeytan',
    endDate: new Date(now + 5 * 86400000),
    startDate: new Date(now - 1 * 86400000),
    description:
      'Gotik rün sembolleriyle bezeli Şeytan loncaları, nebula kıyısında güç için savaşıyor. Duman parçacıkları arasında süzülen komutanların kader savaşı başladı. Loncanı zafere taşı.',
    rules: [
      { icon: '🤝', title: 'Lonca Katılımı', desc: 'En az 5 üyeli lonca katılabilir. Her üyenin katkısı lonca puanına eklenir.' },
      { icon: '🏆', title: 'Lig Sistemi', desc: 'Grup aşaması → çeyrek final → yarı final → final. Her aşama 24 saattir.' },
      { icon: '💀', title: 'Ceza Sistemi', desc: 'Süre dolmadan ayrılan oyuncular loncaya puan cezası yaşatır.' },
      { icon: '🌌', title: 'Nebula Bonusu', desc: 'Nebula bölgesinde kazanılan savaşlar 2x lonca puanı verir.' },
    ],
    rewards: [
      { rank: 1, prize: '25,000 Kristal', prizeDetail: '+ Lonca Rozeti + Efsanevi Banner' },
      { rank: 2, prize: '15,000 Kristal', prizeDetail: '+ Nadir Lonca Rozeti' },
      { rank: 3, prize: '8,000 Kristal', prizeDetail: '+ Bronz Lonca Rozeti' },
      { rank: 4, prize: '4,000 Kristal' },
      { rank: 5, prize: '2,000 Kristal' },
    ],
    leaderboard: [
      { rank: 1, name: 'KaranlıkSipahi', score: 98400, race: 'Şeytan', raceColor: '#cc00ff' },
      { rank: 2, name: 'VorhaalLegion', score: 91200, race: 'Şeytan', raceColor: '#cc00ff' },
      { rank: 3, name: 'AzurathCult', score: 84700, race: 'Şeytan', raceColor: '#cc00ff' },
      { rank: 4, name: 'MalphasGuild', score: 78900, race: 'Şeytan', raceColor: '#cc00ff', isPlayer: true },
      { rank: 5, name: 'LilithraSect', score: 65300, race: 'Şeytan', raceColor: '#cc00ff' },
    ],
  },
};

/* ── Speed lines ────────────────────────────────────────────────── */
function SpeedLines({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={i}
          x1={`${(i / 19) * 100}%`} y1="0%"
          x2={`${(i / 19) * 100 + 8}%`} y2="100%"
          stroke={color}
          strokeWidth={i % 5 === 0 ? '1' : '0.4'}
          strokeOpacity={i % 5 === 0 ? '0.15' : '0.06'}
        />
      ))}
    </svg>
  );
}

/* ── Manga panel wrapper ─────────────────────────────────────────── */
function MangaPanel({
  children,
  color,
  title,
  className = '',
}: {
  children: React.ReactNode;
  color: string;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{
        border: `1px solid ${color}25`,
        background: 'rgba(0,0,0,0.5)',
        boxShadow: `inset 0 1px 0 ${color}15`,
      }}
    >
      {title && (
        <div
          className="px-5 py-3 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${color}20`, background: `${color}0a` }}
        >
          <div className="w-1 h-4 rounded-full" style={{ background: color }} aria-hidden />
          <h3 className="font-display font-black text-xs tracking-widest uppercase" style={{ color }}>
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Leaderboard ─────────────────────────────────────────────────── */
function Leaderboard({ entries, accentColor }: { entries: LeaderboardEntry[]; accentColor: string }) {
  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div
          key={entry.rank}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300"
          style={{
            background: entry.isPlayer
              ? `${accentColor}12`
              : entry.rank <= 3
              ? 'rgba(255,255,255,0.03)'
              : 'transparent',
            border: entry.isPlayer
              ? `1px solid ${accentColor}35`
              : '1px solid transparent',
            boxShadow: entry.isPlayer ? `0 0 12px ${accentColor}15` : 'none',
          }}
        >
          {/* Rank badge */}
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
            style={{
              background: entry.rank === 1 ? '#ffc83222' : entry.rank === 2 ? '#c0c0c022' : entry.rank === 3 ? '#cd7f3222' : 'rgba(255,255,255,0.05)',
              color: entry.rank === 1 ? '#ffc832' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : 'var(--color-text-muted)',
              border: `1px solid ${entry.rank <= 3 ? 'currentColor' : 'transparent'}20`,
            }}
          >
            {entry.rank}
          </span>

          {/* Name + Race */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{ color: entry.isPlayer ? accentColor : 'var(--color-text-primary)' }}
            >
              {entry.name}
              {entry.isPlayer && (
                <span
                  className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${accentColor}20`, color: accentColor }}
                >
                  SEN
                </span>
              )}
            </p>
            <p className="text-[10px] text-text-muted">{entry.race}</p>
          </div>

          {/* Score */}
          <span
            className="font-display font-black text-sm shrink-0"
            style={{ color: entry.rank <= 3 ? (entry.rank === 1 ? '#ffc832' : entry.rank === 2 ? '#c0c0c0' : '#cd7f32') : 'var(--color-text-secondary)' }}
          >
            {entry.score.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const event = EVENTS_MAP[params.id];
  if (!event) notFound();

  const isActive = event.status === 'active';
  const isArchive = event.status === 'archive';
  const c = event.raceColor;

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--color-bg)' }}>

      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: event.raceGradient, minHeight: '340px' }}
      >
        <SpeedLines color={c} />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 80% 50%, ${c}12 0%, transparent 65%)` }}
          aria-hidden
        />

        {/* Manga panel border top */}
        <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${c}80, transparent)` }} aria-hidden />

        {/* Content */}
        <div className="relative z-10 px-4 md:px-8 pt-6 pb-10 max-w-6xl mx-auto">
          {/* Back nav */}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm transition-all duration-300 mb-8 hover:-translate-x-1"
            style={{ color: `${c}99`, transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
            aria-label="Etkinliklere dön"
          >
            ← Etkinlikler
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            {/* Left: title */}
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <EventBadge type={event.type} />
                <span
                  className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}
                >
                  {event.raceLabel}
                </span>
                {isActive && (
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                    ● CANLI
                  </span>
                )}
                {isArchive && (
                  <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/5 text-text-muted border border-white/10">
                    TAMAMLANDI
                  </span>
                )}
              </div>

              <h1
                className="font-display font-black text-4xl md:text-6xl leading-none tracking-tight mb-2"
                style={{ color: c, textShadow: `0 0 60px ${c}55` }}
              >
                {event.title}
              </h1>
              <p className="text-text-secondary text-sm">{event.subtitle}</p>
            </div>

            {/* Right: countdown + CTA */}
            {isActive && (
              <div className="flex flex-col gap-4 items-start md:items-end">
                <div>
                  <p className="text-[9px] font-bold tracking-widest uppercase text-text-muted mb-2 md:text-right">
                    KALAN SÜRE
                  </p>
                  <CountdownTimer targetDate={event.endDate} raceColor={c} size="lg" />
                </div>
                <button
                  className="flex items-center gap-3 rounded-full font-black text-sm px-7 py-3.5 active:scale-95 transition-all duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${c}, ${c}cc)`,
                    color: '#000',
                    boxShadow: `0 0 40px ${c}55`,
                    transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                  }}
                >
                  ETKİNLİĞE KATIL
                  <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }} aria-hidden>
                    ↗
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <main className="px-4 md:px-8 py-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column (2/3) ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description */}
            <MangaPanel color={c} title="ETKİNLİK HAKKINDA">
              <p className="text-text-secondary text-sm leading-relaxed">{event.description}</p>
            </MangaPanel>

            {/* Rules */}
            <MangaPanel color={c} title="ETKİNLİK KURALLARI">
              <div className="space-y-4">
                {event.rules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-lg"
                    style={{ background: `${c}06`, border: `1px solid ${c}12` }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                      style={{ background: `${c}12`, border: `1px solid ${c}25` }}
                      aria-hidden
                    >
                      {rule.icon}
                    </div>
                    <div>
                      <h4
                        className="font-display font-bold text-sm mb-1"
                        style={{ color: c }}
                      >
                        {rule.title}
                      </h4>
                      <p className="text-text-muted text-xs leading-relaxed">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MangaPanel>

            {/* Leaderboard */}
            <MangaPanel color={c} title="CANLI SIRALAMA">
              <Leaderboard entries={event.leaderboard} accentColor={c} />
              <p className="text-center text-text-muted text-[10px] mt-4">
                Tüm sıralamayı gör →
              </p>
            </MangaPanel>
          </div>

          {/* ── Right column (1/3) ─────────────────────────────── */}
          <div className="space-y-6">

            {/* Reward table */}
            <MangaPanel color={c} title="ÖDÜL TABLOSU">
              <RewardTable rewards={event.rewards} accentColor={c} />
            </MangaPanel>

            {/* Event meta */}
            <MangaPanel color={c} title="ETKİNLİK BİLGİSİ">
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Başlangıç', value: event.startDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: 'Bitiş', value: event.endDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: 'Irk Kısıtı', value: event.raceLabel },
                  { label: 'Durum', value: isActive ? 'Aktif' : isArchive ? 'Tamamlandı' : 'Yakında' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-text-muted text-xs">{label}</dt>
                    <dd className="font-semibold text-text-primary text-xs text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </MangaPanel>

            {/* Share / Info */}
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: `${c}08`,
                border: `1px dashed ${c}25`,
              }}
            >
              <p className="text-[10px] text-text-muted mb-2">Bu etkinliği arkadaşlarınla paylaş</p>
              <button
                className="text-xs font-bold px-4 py-2 rounded-full transition-all duration-300"
                style={{
                  color: c,
                  border: `1px solid ${c}30`,
                  background: `${c}10`,
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                Linki Kopyala
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
