'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CountdownTimer } from '@/components/events/CountdownTimer';
import { EventBadge, type EventType } from '@/components/events/EventBadge';
import { sanitizeColor, sanitizeGradient } from '@/lib/colorSanitizer';

/* ── Static demo data ─────────────────────────────────────────────── */

type EventStatus = 'active' | 'upcoming' | 'archive';

interface GameEvent {
  id: string;
  title: string;
  subtitle: string;
  type: EventType;
  status: EventStatus;
  raceColor: string;
  raceGradient: string;
  raceLabel: string;
  endDate: Date;
  startDate: Date;
  participants: number;
  maxParticipants?: number;
  topPrize: string;
  featured?: boolean;
}

const now = Date.now();
const EVENTS: GameEvent[] = [
  {
    id: 'zerg-domination-s1',
    title: 'ZERG HAKIMIYET',
    subtitle: 'Sezon I · Kovan Savaşları',
    type: 'tournament',
    status: 'active',
    raceColor: '#44ff44',
    raceGradient: 'linear-gradient(135deg, #003300 0%, #001800 40%, #07090f 100%)',
    raceLabel: 'Zerg',
    endDate: new Date(now + 2 * 86400000 + 14 * 3600000),
    startDate: new Date(now - 3 * 86400000),
    participants: 2847,
    topPrize: '10,000 Kristal',
    featured: true,
  },
  {
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
    participants: 1203,
    maxParticipants: 2000,
    topPrize: '5,000 Enerji',
  },
  {
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
    participants: 648,
    topPrize: '25,000 Kristal + Rozet',
  },
  {
    id: 'beast-rampage',
    title: 'CANAVAR İSTİLASI',
    subtitle: 'PvE Özel Etkinlik',
    type: 'special',
    status: 'upcoming',
    raceColor: '#ff6600',
    raceGradient: 'linear-gradient(135deg, #221000 0%, #150800 40%, #07090f 100%)',
    raceLabel: 'Canavar',
    endDate: new Date(now + 8 * 86400000),
    startDate: new Date(now + 3 * 86400000),
    participants: 0,
    topPrize: '7,500 Amber',
  },
  {
    id: 'human-tech-sprint',
    title: 'İNSAN TEKNOLOJİ',
    subtitle: 'Araştırma Yarışması',
    type: 'resource',
    status: 'upcoming',
    raceColor: '#4a9eff',
    raceGradient: 'linear-gradient(135deg, #001530 0%, #000c1e 40%, #07090f 100%)',
    raceLabel: 'İnsan',
    endDate: new Date(now + 12 * 86400000),
    startDate: new Date(now + 7 * 86400000),
    participants: 0,
    topPrize: '8,000 Kristal',
  },
  {
    id: 'ancient-war-s0',
    title: 'KADİM SAVAŞ',
    subtitle: 'Sezon 0 · Tamamlandı',
    type: 'tournament',
    status: 'archive',
    raceColor: '#888899',
    raceGradient: 'linear-gradient(135deg, #111118 0%, #0a0a10 100%)',
    raceLabel: 'Tüm Irklar',
    endDate: new Date(now - 5 * 86400000),
    startDate: new Date(now - 12 * 86400000),
    participants: 5122,
    topPrize: '50,000 Kristal',
  },
];

/* ── Speed-line background SVG ───────────────────────────────────── */
function SpeedLines({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {Array.from({ length: 18 }).map((_, i) => {
        const x = (i / 17) * 100;
        const angle = -20 + (i % 3) * 5;
        return (
          <line
            key={i}
            x1={`${x}%`} y1="0%"
            x2={`${x + 5}%`} y2="100%"
            stroke={color}
            strokeWidth={i % 4 === 0 ? '0.8' : '0.3'}
            strokeOpacity={i % 4 === 0 ? '0.12' : '0.05'}
            transform={`skewX(${angle})`}
          />
        );
      })}
    </svg>
  );
}

const SAFE_BG = 'linear-gradient(135deg, #0d1020 0%, #07090f 100%)';

/* ── Featured banner ─────────────────────────────────────────────── */
function FeaturedBanner({ event }: { event: GameEvent }) {
  // FIX: sanitize colors from data before placing in inline styles (CSS injection)
  const c = sanitizeColor(event.raceColor);
  const bg = sanitizeGradient(event.raceGradient, SAFE_BG);
  return (
    <Link href={`/events/${event.id}`} className="block group" aria-label={`${event.title} etkinliğine git`}>
      {/* Outer double-bezel shell */}
      <div
        className="relative rounded-2xl p-0.5 overflow-hidden transition-all duration-700"
        style={{
          background: `linear-gradient(135deg, ${c}40, ${c}10, transparent)`,
          boxShadow: `0 0 60px ${c}20, 0 0 120px ${c}08`,
        }}
      >
        {/* Inner core */}
        <div
          className="relative rounded-[calc(1rem-2px)] overflow-hidden"
          style={{ background: bg, minHeight: '280px' }}
        >
          <SpeedLines color={c} />

          {/* Manga halftone corner */}
          <div
            className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
            style={{ background: `radial-gradient(circle at 100% 100%, ${c}18 0%, transparent 70%)` }}
            aria-hidden
          />

          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 min-h-[280px]">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <EventBadge type={event.type} />
                <span
                  className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}
                >
                  {event.raceLabel}
                </span>
                <span
                  className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464', border: '1px solid rgba(255,100,100,0.3)' }}
                >
                  ● AKTİF
                </span>
              </div>

              <h2
                className="font-display font-black text-3xl md:text-5xl leading-none mb-2 tracking-tight"
                style={{ color: c, textShadow: `0 0 40px ${c}66` }}
              >
                {event.title}
              </h2>
              <p className="text-text-secondary text-sm mb-6">{event.subtitle}</p>

              <div>
                <p className="text-[9px] font-bold tracking-widest uppercase text-text-muted mb-2">
                  KALAN SÜRE
                </p>
                <CountdownTimer targetDate={event.endDate} raceColor={c} size="md" />
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-4">
              <div className="text-right">
                <p className="text-[9px] tracking-widest uppercase text-text-muted">Katılımcı</p>
                <p className="font-display font-black text-2xl" style={{ color: c }}>
                  {event.participants.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-widest uppercase text-text-muted">Birinci Ödül</p>
                <p className="font-display font-bold text-sm text-text-primary">{event.topPrize}</p>
              </div>

              {/* Join CTA — Button-in-button pattern */}
              <button
                className="flex items-center gap-3 rounded-full font-bold text-sm px-5 py-3 transition-all duration-500 group-hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${c}, ${c}bb)`,
                  color: '#000',
                  boxShadow: `0 0 30px ${c}55`,
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
                aria-label={`${event.title} etkinliğine katıl`}
              >
                KATIL
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                  aria-hidden
                >
                  ↗
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Event card (compact list/grid) ─────────────────────────────── */
function EventCard({ event }: { event: GameEvent }) {
  const isArchive = event.status === 'archive';
  const isUpcoming = event.status === 'upcoming';
  // FIX: sanitize colors from data before placing in inline styles (CSS injection)
  const c = sanitizeColor(event.raceColor);
  const bg = sanitizeGradient(event.raceGradient, SAFE_BG);

  return (
    <Link
      href={`/events/${event.id}`}
      className="block group"
      aria-label={`${event.title} etkinliği`}
    >
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-500 hover-glow"
        style={{
          border: `1px solid ${isArchive ? '#333344' : c + '30'}`,
          background: isArchive ? 'rgba(10,10,18,0.8)' : bg,
          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
          opacity: isArchive ? 0.65 : 1,
        }}
      >
        {!isArchive && <SpeedLines color={c} />}

        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <EventBadge type={event.type} size="sm" />
              {isArchive && (
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/5 text-text-muted border border-white/10">
                  TAMAMLANDI
                </span>
              )}
              {isUpcoming && (
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full text-status-warning border border-status-warning/30 bg-status-warning/10">
                  YAKINDA
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold shrink-0" style={{ color: c }}>
              {event.raceLabel}
            </span>
          </div>

          <h3
            className="font-display font-black text-lg leading-tight mb-1 tracking-tight"
            style={{
              color: isArchive ? 'var(--color-text-secondary)' : c,
              textShadow: isArchive ? 'none' : `0 0 20px ${c}55`,
            }}
          >
            {event.title}
          </h3>
          <p className="text-text-muted text-xs mb-4">{event.subtitle}</p>

          {event.status === 'active' && (
            <CountdownTimer targetDate={event.endDate} raceColor={c} size="sm" />
          )}
          {isUpcoming && (
            <p className="text-xs text-text-secondary">
              Başlangıç: {event.startDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
            </p>
          )}
          {isArchive && (
            <p className="text-xs text-text-muted">
              {event.participants.toLocaleString()} katılımcı · {event.topPrize}
            </p>
          )}

          {/* Bottom bar */}
          {!isArchive && (
            <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: `1px solid ${c}15` }}>
              <span className="text-[10px] text-text-muted">
                {event.participants.toLocaleString()} oyuncu
              </span>
              <span
                className="text-[10px] font-bold transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: c }}
              >
                Detay →
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Tab filter ──────────────────────────────────────────────────── */
type Tab = 'active' | 'upcoming' | 'archive';

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: 'active',   label: 'Aktif',   count: EVENTS.filter(e => e.status === 'active').length },
  { id: 'upcoming', label: 'Yakında', count: EVENTS.filter(e => e.status === 'upcoming').length },
  { id: 'archive',  label: 'Arşiv',  count: EVENTS.filter(e => e.status === 'archive').length },
];

/* ── Page ────────────────────────────────────────────────────────── */
export default function EventsPage() {
  const [tab, setTab] = useState<Tab>('active');
  const featured = EVENTS.find(e => e.featured && e.status === 'active');
  const filtered = EVENTS.filter(e => e.status === tab && !e.featured);

  return (
    <div
      className="h-dvh overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-4 border-b border-border"
        style={{ background: 'rgba(7, 9, 15, 0.85)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-text-muted hover:text-text-primary transition-colors text-sm flex items-center gap-2"
            aria-label="Dashboard'a dön"
          >
            ← Geri
          </Link>
          <div className="w-px h-5 bg-border" aria-hidden />
          <h1 className="font-display font-black text-lg tracking-wider text-text-primary">
            ETKİNLİKLER
          </h1>
        </div>
        <span
          className="text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-full"
          style={{ background: 'rgba(255,100,100,0.12)', color: '#ff6464', border: '1px solid rgba(255,100,100,0.25)' }}
        >
          ● {EVENTS.filter(e => e.status === 'active').length} AKTİF
        </span>
      </header>

      <main className="px-4 md:px-8 py-8 max-w-6xl mx-auto space-y-10">

        {/* ── Featured banner ──────────────────────────────────── */}
        {tab === 'active' && featured && (
          <section aria-labelledby="featured-heading">
            <p id="featured-heading" className="text-[9px] font-bold tracking-widest uppercase text-text-muted mb-3">
              ÖNE ÇIKAN ETKİNLİK
            </p>
            <FeaturedBanner event={featured} />
          </section>
        )}

        {/* ── Filter tabs ──────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-400"
              style={{
                background: tab === t.id ? 'var(--color-bg-elevated)' : 'transparent',
                color: tab === t.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: tab === t.id ? '0 0 12px rgba(123,140,222,0.15), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
              }}
              aria-pressed={tab === t.id}
            >
              {t.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: tab === t.id ? 'var(--color-brand-dim)' : 'rgba(255,255,255,0.06)',
                  color: tab === t.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Event grid ───────────────────────────────────────── */}
        <section aria-label={`${tab} etkinlikler`}>
          {filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center text-center py-24 rounded-xl"
              style={{ border: '1px dashed var(--color-border)', background: 'rgba(255,255,255,0.01)' }}
            >
              <span className="text-5xl mb-4" aria-hidden>🌌</span>
              <p className="text-text-muted text-sm">Bu kategoride etkinlik yok.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ev => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
