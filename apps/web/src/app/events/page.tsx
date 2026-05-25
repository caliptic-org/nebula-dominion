'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Caption,
  Chip,
  Code,
  Eyebrow,
  H2,
  H3,
  ND,
  NDButton,
  Panel,
  RACES,
  Screen,
  Sigil,
  useNDRace,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';

/* ── Domain types ─────────────────────────────────────────────────────── */

type EventType = 'tournament' | 'resource' | 'guild' | 'special';
type EventStatus = 'active' | 'upcoming' | 'archive';

interface GameEvent {
  id: string;
  title: string;
  subtitle: string;
  type: EventType;
  status: EventStatus;
  /** `null` reserves the slot for cross-race or archive events. */
  raceKey: NDRaceKey | null;
  raceLabel: string;
  endDate: Date;
  startDate: Date;
  participants: number;
  maxParticipants?: number;
  topPrize: string;
  featured?: boolean;
}

/* ── Static demo data (ND-shaped) ─────────────────────────────────────── */

/* Deterministic "demo now" so SSR + client hydration agree. The events
 * dataset is currently static mock copy — once the backend lands, dates
 * will arrive as ISO strings from the server and this constant goes away.
 * Picking a fixed point in 2026 keeps the "in 2 days" / "in 5 days"
 * relative offsets readable without re-rendering on the clock. */
const now = new Date('2026-05-24T12:00:00Z').getTime();

const EVENTS: GameEvent[] = [
  {
    id: 'zerg-domination-s1',
    title: 'ZERG HÂKİMİYET',
    subtitle: 'Sezon I · Kovan Savaşları',
    type: 'tournament',
    status: 'active',
    raceKey: 'zerg',
    raceLabel: RACES.zerg.name,
    endDate: new Date(now + 2 * 86400000 + 14 * 3600000),
    startDate: new Date(now - 3 * 86400000),
    participants: 2847,
    topPrize: '10.000 Kristal',
    featured: true,
  },
  {
    id: 'automat-grid-race',
    title: 'OTOMATİK IZGARA',
    subtitle: 'Kaynak Sprinti · Çoklu Faz',
    type: 'resource',
    status: 'active',
    raceKey: 'otomat',
    raceLabel: RACES.otomat.name,
    endDate: new Date(now + 18 * 3600000),
    startDate: new Date(now - 6 * 3600000),
    participants: 1203,
    maxParticipants: 2000,
    topPrize: '5.000 Enerji',
  },
  {
    id: 'guild-nebula-clash',
    title: 'NEBULA ÇATIŞMASI',
    subtitle: 'Lonca Ligi · Grup Aşaması',
    type: 'guild',
    status: 'active',
    raceKey: 'seytan',
    raceLabel: RACES.seytan.name,
    endDate: new Date(now + 5 * 86400000),
    startDate: new Date(now - 1 * 86400000),
    participants: 648,
    topPrize: '25.000 Kristal + Rozet',
  },
  {
    id: 'beast-rampage',
    title: 'CANAVAR İSTİLASI',
    subtitle: 'PvE Özel Etkinlik',
    type: 'special',
    status: 'upcoming',
    raceKey: 'canavar',
    raceLabel: RACES.canavar.name,
    endDate: new Date(now + 8 * 86400000),
    startDate: new Date(now + 3 * 86400000),
    participants: 0,
    topPrize: '7.500 Amber',
  },
  {
    id: 'human-tech-sprint',
    title: 'İNSAN TEKNOLOJİ',
    subtitle: 'Araştırma Yarışması',
    type: 'resource',
    status: 'upcoming',
    raceKey: 'insan',
    raceLabel: RACES.insan.name,
    endDate: new Date(now + 12 * 86400000),
    startDate: new Date(now + 7 * 86400000),
    participants: 0,
    topPrize: '8.000 Kristal',
  },
  {
    id: 'ancient-war-s0',
    title: 'KADİM SAVAŞ',
    subtitle: 'Sezon 0 · Tamamlandı',
    type: 'tournament',
    status: 'archive',
    raceKey: null,
    raceLabel: 'Tüm Irklar',
    endDate: new Date(now - 5 * 86400000),
    startDate: new Date(now - 12 * 86400000),
    participants: 5122,
    topPrize: '50.000 Kristal',
  },
];

/* ── Event type configuration (ND palette only) ──────────────────────── */

const EVENT_TYPE: Record<EventType, { label: string; tint: string }> = {
  tournament: { label: 'TURNUVA', tint: ND.danger },
  resource:   { label: 'KAYNAK',  tint: ND.ok },
  guild:      { label: 'LONCA',   tint: 'oklch(0.62 0.22 15)' },
  special:    { label: 'ÖZEL',    tint: ND.warn },
};

function eventAccent(event: GameEvent): { primary: string; primaryDim: string; glow: string; race: NDRace | null } {
  if (!event.raceKey) {
    return {
      primary: ND.textDim,
      primaryDim: ND.textMute,
      glow: ND.borderHi,
      race: null,
    };
  }
  const r = RACES[event.raceKey];
  return { primary: r.primary, primaryDim: r.primaryDim, glow: r.glow, race: r };
}

/* ── ND-styled countdown ──────────────────────────────────────────────── */

interface TimeLeft { d: number; h: number; m: number; s: number; total: number }

function computeTime(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

interface NDCountdownProps {
  targetDate: Date;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

// Use a stable placeholder for SSR + initial hydration so the server-rendered
// markup matches the first client render byte-for-byte. Real countdown digits
// land on the client only after mount. Without this the digits drift between
// SSR's Date.now() and the browser's, throwing React's hydration mismatch
// warning on every visit to /events.
const ZERO_TIME: TimeLeft = { d: 0, h: 0, m: 0, s: 0, total: 0 };

function NDCountdown({ targetDate, color, size = 'md' }: NDCountdownProps) {
  const [t, setT] = useState<TimeLeft>(ZERO_TIME);
  useEffect(() => {
    setT(computeTime(targetDate));
    const id = setInterval(() => setT(computeTime(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const dims = size === 'lg'
    ? { digit: 30, label: 10, pad: '6px 10px', sep: 20, gap: 8 }
    : size === 'sm'
      ? { digit: 16, label: 8, pad: '3px 6px', sep: 12, gap: 5 }
      : { digit: 22, label: 9, pad: '5px 8px', sep: 16, gap: 6 };

  const ended = t.total <= 0;

  const units: { v: number; label: string }[] = [
    { v: t.d, label: 'GÜN' },
    { v: t.h, label: 'SA' },
    { v: t.m, label: 'DK' },
    { v: t.s, label: 'SN' },
  ];

  return (
    <div
      role="timer"
      aria-label="Kalan süre"
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: dims.gap }}
    >
      {units.map((u, i) => (
        <div key={u.label} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: dims.gap }}>
          {i > 0 && (
            <span
              aria-hidden
              style={{
                fontFamily: ND.display,
                fontSize: dims.sep,
                lineHeight: 1,
                color: `${color}88`,
                paddingBottom: dims.label + 4,
                textShadow: `0 0 10px ${color}`,
              }}
            >
              :
            </span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                padding: dims.pad,
                background: ended ? 'rgba(20,8,8,0.7)' : 'rgba(8,12,26,0.78)',
                border: `1px solid ${ended ? `${ND.danger}55` : `${color}44`}`,
                clipPath:
                  'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                fontFamily: ND.mono,
                fontWeight: 700,
                fontSize: dims.digit,
                color: ended ? ND.danger : color,
                textShadow: ended ? 'none' : `0 0 12px ${color}99`,
                lineHeight: 1,
                letterSpacing: '0.02em',
                minWidth: dims.digit * 1.7,
                textAlign: 'center',
              }}
            >
              {String(u.v).padStart(2, '0')}
            </div>
            <span
              style={{
                marginTop: 4,
                fontFamily: ND.display,
                fontSize: dims.label,
                letterSpacing: '0.20em',
                color: `${color}aa`,
                textTransform: 'uppercase',
              }}
            >
              {u.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Status pill ──────────────────────────────────────────────────────── */

function StatusChip({ status }: { status: EventStatus }) {
  if (status === 'active') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 8px',
          fontFamily: ND.mono,
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: ND.danger,
          background: `${ND.danger}1a`,
          border: `1px solid ${ND.danger}55`,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ND.danger,
            boxShadow: `0 0 8px ${ND.danger}`,
            animation: 'nd-pulse 1.4s ease-in-out infinite',
          }}
        />
        CANLI
      </span>
    );
  }
  if (status === 'upcoming') {
    return <Chip color={ND.warn}>Yakında</Chip>;
  }
  return <Chip color={ND.textMute}>Arşiv</Chip>;
}

/* ── Featured banner ──────────────────────────────────────────────────── */

function FeaturedBanner({ event }: { event: GameEvent }) {
  const { primary, primaryDim, glow, race } = eventAccent(event);
  const type = EVENT_TYPE[event.type];

  return (
    <Link
      href={`/events/${event.id}`}
      aria-label={`${event.title} etkinliğini aç`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="nd-featured"
        style={{
          position: 'relative',
          padding: 1,
          background: `linear-gradient(135deg, ${primary}, ${primaryDim}66 60%, ${ND.border} 100%)`,
          clipPath:
            'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          boxShadow: `0 0 38px -8px ${glow}, 0 0 80px -32px ${glow}`,
          transition: 'box-shadow 400ms cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${primary}26 0%, rgba(8,12,26,0.85) 55%, ${ND.bgDeep} 100%)`,
            clipPath:
              'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
            minHeight: 280,
          }}
        >
          {/* Sigil watermark */}
          {race && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: '50%',
                right: -40,
                transform: 'translateY(-50%)',
                opacity: 0.18,
                filter: `drop-shadow(0 0 24px ${glow})`,
                pointerEvents: 'none',
              }}
            >
              <Sigil race={race} size={300} />
            </div>
          )}

          {/* Scanlines */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(0deg, transparent 0 2px, ${primary}08 2px 3px)`,
              pointerEvents: 'none',
            }}
          />

          {/* Corner glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -60,
              right: -60,
              width: 240,
              height: 240,
              background: `radial-gradient(circle, ${glow}33 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '28px 28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              minHeight: 280,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Chip color={primary}>Öne Çıkan</Chip>
              <Chip color={type.tint}>{type.label}</Chip>
              <Chip color={primary}>{event.raceLabel.toUpperCase()}</Chip>
              <StatusChip status={event.status} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', flex: 1 }}>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <Eyebrow color={primary}>Aktif Etkinlik</Eyebrow>
                <H2
                  style={{
                    marginTop: 6,
                    fontSize: 30,
                    color: ND.text,
                    textShadow: `0 0 28px ${glow}, 0 0 6px ${primary}aa`,
                  }}
                >
                  {event.title}
                </H2>
                <Caption style={{ marginTop: 4 }}>{event.subtitle}</Caption>

                <div style={{ marginTop: 16 }}>
                  <Eyebrow>Kalan Süre</Eyebrow>
                  <div style={{ marginTop: 6 }}>
                    <NDCountdown targetDate={event.endDate} color={primary} size="lg" />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 14,
                  minWidth: 200,
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <Eyebrow>Katılımcı</Eyebrow>
                  <div
                    style={{
                      fontFamily: ND.display,
                      fontSize: 26,
                      fontWeight: 700,
                      color: primary,
                      textShadow: `0 0 18px ${glow}`,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {event.participants.toLocaleString('tr-TR')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Eyebrow>Birinci Ödül</Eyebrow>
                  <div
                    style={{
                      fontFamily: ND.display,
                      fontSize: 14,
                      color: ND.text,
                      letterSpacing: '0.04em',
                      marginTop: 2,
                    }}
                  >
                    {event.topPrize}
                  </div>
                </div>
                {/* The button used to read "◈ Katıl" but had no onClick and
                  * was nested inside the outer <Link> that navigates to
                  * /events/[id]. Clicking it went to the detail page but
                  * never "joined" anything — there's no /events/:id/join
                  * endpoint yet. Re-label to match reality so we stop
                  * promising a feature that doesn't exist. The button just
                  * inherits navigation from the parent Link. */}
                <NDButton race={race ?? undefined} variant="primary" size="md">
                  ◈ Detayları Gör
                </NDButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Compact event card ───────────────────────────────────────────────── */

function EventCard({ event }: { event: GameEvent }) {
  const { primary, primaryDim, glow, race } = eventAccent(event);
  const type = EVENT_TYPE[event.type];
  const isArchive = event.status === 'archive';
  const isUpcoming = event.status === 'upcoming';

  const capacityPct = event.maxParticipants
    ? Math.min(100, Math.round((event.participants / event.maxParticipants) * 100))
    : null;

  return (
    <Link
      href={`/events/${event.id}`}
      aria-label={`${event.title} etkinliğini aç`}
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        className="nd-event-card"
        style={{
          position: 'relative',
          padding: 1,
          background: isArchive
            ? `linear-gradient(135deg, ${ND.border} 0%, transparent 100%)`
            : `linear-gradient(135deg, ${primary}aa 0%, ${primaryDim}55 50%, ${ND.border} 100%)`,
          clipPath:
            'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          boxShadow: isArchive ? 'none' : `0 0 22px -10px ${glow}`,
          transition: 'box-shadow 400ms cubic-bezier(0.32,0.72,0,1), transform 400ms cubic-bezier(0.32,0.72,0,1)',
          opacity: isArchive ? 0.7 : 1,
          height: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: isArchive
              ? 'rgba(10,12,22,0.85)'
              : `linear-gradient(160deg, ${primary}14 0%, rgba(8,12,26,0.86) 60%, ${ND.bgDeep} 100%)`,
            clipPath:
              'polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px)',
            padding: 16,
            minHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Sigil watermark */}
          {race && !isArchive && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: -20,
                right: -30,
                opacity: 0.12,
                filter: `drop-shadow(0 0 16px ${glow})`,
                pointerEvents: 'none',
              }}
            >
              <Sigil race={race} size={160} />
            </div>
          )}

          {/* Scanlines */}
          {!isArchive && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `repeating-linear-gradient(0deg, transparent 0 2px, ${primary}07 2px 3px)`,
                pointerEvents: 'none',
              }}
            />
          )}

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Chip color={type.tint}>{type.label}</Chip>
            <StatusChip status={event.status} />
          </div>

          <div style={{ position: 'relative' }}>
            <Eyebrow color={primary}>{event.raceLabel.toUpperCase()}</Eyebrow>
            <H3
              style={{
                marginTop: 4,
                color: isArchive ? ND.textDim : ND.text,
                textShadow: isArchive ? 'none' : `0 0 16px ${glow}80`,
                fontSize: 16,
                lineHeight: 1.15,
              }}
            >
              {event.title}
            </H3>
            <Caption style={{ marginTop: 4 }}>{event.subtitle}</Caption>
          </div>

          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
            {event.status === 'active' && (
              <NDCountdown targetDate={event.endDate} color={primary} size="sm" />
            )}
            {isUpcoming && (
              <Code style={{ color: primary }}>
                BAŞLANGIÇ ·{' '}
                {event.startDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              </Code>
            )}
            {isArchive && (
              <Caption>
                {event.participants.toLocaleString('tr-TR')} katılımcı · {event.topPrize}
              </Caption>
            )}

            {capacityPct !== null && !isArchive && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: ND.mono,
                    fontSize: 9,
                    color: ND.textDim,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  <span>Kapasite</span>
                  <span>
                    {event.participants.toLocaleString('tr-TR')} / {event.maxParticipants?.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${ND.border}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${capacityPct}%`,
                      background: `linear-gradient(90deg, ${primary}99, ${primary})`,
                      boxShadow: `0 0 8px ${glow}`,
                    }}
                  />
                </div>
              </div>
            )}

            {!isArchive && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 8,
                  borderTop: `1px solid ${primary}22`,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Eyebrow>Ödül</Eyebrow>
                  <span
                    style={{
                      fontFamily: ND.display,
                      fontSize: 12,
                      color: ND.text,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {event.topPrize}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: ND.display,
                    fontSize: 10,
                    color: primary,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  Detay →
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Tab filter ───────────────────────────────────────────────────────── */

type Tab = EventStatus;

interface TabConfig { id: Tab; label: string }

const TABS: TabConfig[] = [
  { id: 'active',   label: 'Aktif' },
  { id: 'upcoming', label: 'Yakında' },
  { id: 'archive',  label: 'Arşiv' },
];

function TabButton({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        fontFamily: ND.display,
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        border: `1px solid ${active ? color : ND.border}`,
        background: active ? `linear-gradient(180deg, ${color}22, ${color}08)` : 'transparent',
        color: active ? color : ND.textDim,
        clipPath:
          'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
        transition: 'all 220ms cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: ND.mono,
          fontSize: 10,
          padding: '1px 6px',
          background: active ? `${color}22` : 'rgba(255,255,255,0.06)',
          color: active ? color : ND.textMute,
          border: `1px solid ${active ? `${color}44` : ND.border}`,
        }}
      >
        {count}
      </span>
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function EventsPage() {
  const race = useNDRace();
  const [tab, setTab] = useState<Tab>('active');

  const counts = useMemo(() => ({
    active:   EVENTS.filter(e => e.status === 'active').length,
    upcoming: EVENTS.filter(e => e.status === 'upcoming').length,
    archive:  EVENTS.filter(e => e.status === 'archive').length,
  }), []);

  const featured = useMemo(
    () => EVENTS.find(e => e.featured && e.status === 'active') ?? null,
    [],
  );

  const filtered = useMemo(
    () => EVENTS.filter(e => e.status === tab && !e.featured),
    [tab],
  );

  const showFeatured = tab === 'active' && featured !== null;

  return (
    <Screen race={race} style={{ height: '100dvh', overflow: 'auto' }}>
      <style jsx global>{`
        @keyframes nd-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .nd-event-card:hover,
        .nd-featured:hover {
          transform: translateY(-2px);
        }
        @media (prefers-reduced-motion: reduce) {
          .nd-event-card:hover,
          .nd-featured:hover { transform: none; }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(6,8,15,0.92)',
          borderBottom: `1px solid ${ND.border}`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Link
            href="/dashboard"
            aria-label="Dashboard'a dön"
            style={{
              fontFamily: ND.display,
              fontSize: 11,
              letterSpacing: '0.10em',
              color: ND.textDim,
              textDecoration: 'none',
            }}
          >
            ← ANA ÜS
          </Link>
          <div style={{ width: 1, height: 14, background: ND.border }} aria-hidden />
          <Sigil race={race} size={22} glow />
          <Chip color={race.primary}>ETKİNLİKLER</Chip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code style={{ color: ND.danger }}>● {counts.active} CANLI</Code>
        </div>
      </header>

      <main
        style={{
          position: 'relative',
          flex: 1,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '24px 16px 64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Page title */}
        <div>
          <Eyebrow color={race.primary}>SEZON · GALAKTİK ETKİNLİKLER</Eyebrow>
          <H2 style={{ marginTop: 6, fontSize: 24 }}>SAVAŞ ÇAĞIRILARI</H2>
          <Caption style={{ marginTop: 4, maxWidth: 540 }}>
            Aktif turnuvalara katıl, yaklaşan etkinliklere kayıt ol, geçmiş zaferlere göz at.
          </Caption>
        </div>

        {/* Demo-data warning — the EVENTS array below is a fixed
         *  catalog from page-design time, not a live /api/events feed.
         *  Mark this prominently so players don't think a "Zerg
         *  Hâkimiyet · Sezon I" tournament is actually running today. */}
        <div
          role="note"
          style={{
            padding: '8px 12px',
            border: `1px dashed ${ND.warn}66`,
            borderRadius: 4,
            background: `${ND.warn}11`,
            fontFamily: ND.mono,
            fontSize: 10,
            letterSpacing: '0.04em',
            color: ND.textDim,
          }}
        >
          <strong style={{ color: ND.warn }}>ÖRNEK İÇERİK ·</strong>{' '}
          Etkinlik kataloğu henüz arka uça bağlı değil — bu listede
          gördüğün turnuva, sezon ve takvim örnek görünümdür. Canlı
          etkinlik akışı yakında.
        </div>

        {/* Featured banner */}
        {showFeatured && featured && (
          <section aria-labelledby="featured-heading">
            <div
              id="featured-heading"
              style={{
                fontFamily: ND.display,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: ND.textDim,
                marginBottom: 12,
              }}
            >
              ◈ Öne Çıkan
            </div>
            <FeaturedBanner event={featured} />
          </section>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Etkinlik filtresi" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TABS.map(t => (
            <TabButton
              key={t.id}
              active={tab === t.id}
              label={t.label}
              count={counts[t.id]}
              color={race.primary}
              onClick={() => setTab(t.id)}
            />
          ))}
        </div>

        {/* Event grid */}
        <section aria-label={`${tab} etkinlikler`}>
          {filtered.length === 0 ? (
            <Panel style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontFamily: ND.display, fontSize: 32, color: ND.textMute, marginBottom: 8 }}>
                ◇
              </div>
              <Caption>Bu kategoride etkinlik yok.</Caption>
            </Panel>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 14,
              }}
            >
              {filtered.map(ev => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </section>
      </main>
    </Screen>
  );
}
