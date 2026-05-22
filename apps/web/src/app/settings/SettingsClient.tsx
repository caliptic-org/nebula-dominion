'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { SegmentedControl, SegmentedOption } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { BottomNav } from '@/components/ui/BottomNav';
import { clearTokens } from '@/lib/session';
import { useRaceTheme } from '@/hooks/useRaceTheme';

type GraphicsQuality = 'low' | 'mid' | 'high';
type Language = 'tr' | 'en';

interface SettingsState {
  audio: {
    musicVolume: number;
    sfxVolume: number;
    masterVolume: number;
    muted: boolean;
  };
  graphics: {
    quality: GraphicsQuality;
  };
  language: Language;
  notifications: {
    push: boolean;
    sound: boolean;
    battleAlerts: boolean;
    guildAlerts: boolean;
  };
}

const STORAGE_KEY = 'nebula:settings:v1';

const DEFAULT_SETTINGS: SettingsState = {
  audio: { musicVolume: 70, sfxVolume: 80, masterVolume: 100, muted: false },
  graphics: { quality: 'mid' },
  language: 'tr',
  notifications: { push: true, sound: true, battleAlerts: true, guildAlerts: true },
};

const SECTIONS = [
  { id: 'audio',         label: 'Ses',          icon: '◈', sublabel: 'Müzik & Efektler' },
  { id: 'graphics',      label: 'Grafik',       icon: '⬡', sublabel: 'Performans' },
  { id: 'language',      label: 'Dil',          icon: '◉', sublabel: 'Arayüz Dili' },
  { id: 'notifications', label: 'Bildirim',     icon: '◆', sublabel: 'Uyarılar' },
  { id: 'account',       label: 'Hesap',        icon: '◎', sublabel: 'Profil & Güvenlik' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const QUALITY_OPTIONS: SegmentedOption<GraphicsQuality>[] = [
  { value: 'low',  label: 'Düşük', icon: '⚙️',  description: '60+ FPS' },
  { value: 'mid',  label: 'Orta',  icon: '⚡', description: 'Dengeli' },
  { value: 'high', label: 'Yüksek',icon: '✨',  description: 'Görsel' },
];

const LANGUAGE_OPTIONS: SegmentedOption<Language>[] = [
  { value: 'tr', label: 'Türkçe',  icon: '🇹🇷' },
  { value: 'en', label: 'English', icon: '🇬🇧' },
];

function loadSettings(): SettingsState {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      audio:         { ...DEFAULT_SETTINGS.audio,         ...(parsed.audio ?? {}) },
      graphics:      { ...DEFAULT_SETTINGS.graphics,      ...(parsed.graphics ?? {}) },
      language:      parsed.language ?? DEFAULT_SETTINGS.language,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsClient() {
  const { raceColor, raceDim, raceGlow } = useRaceTheme();
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<SectionId>('audio');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1800);
      return () => clearTimeout(t);
    } catch {
      /* storage unavailable */
    }
  }, [settings, hydrated]);

  function patchAudio(patch: Partial<SettingsState['audio']>) {
    setSettings((s) => ({ ...s, audio: { ...s.audio, ...patch } }));
  }
  function patchNotifications(patch: Partial<SettingsState['notifications']>) {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, ...patch } }));
  }

  function resetDefaults() {
    setSettings(DEFAULT_SETTINGS);
  }

  function scrollToSection(id: SectionId) {
    setActiveSection(id);
    if (typeof document !== 'undefined') {
      document.getElementById(`section-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  return (
    <div
      className="min-h-dvh overflow-y-auto pb-28 lg:pb-12"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* ── Cinematic Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'rgba(8,10,16,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${raceColor}30`,
          boxShadow: `0 1px 0 ${raceColor}18, 0 4px 24px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Scan beam */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '60%',
              height: '100%',
              background: `linear-gradient(90deg, transparent 0%, ${raceColor}08 50%, transparent 100%)`,
              transform: 'translateX(-170%)',
              animation: 'settings-scan 5s ease-in-out infinite',
            }}
          />
          {/* Bottom accent line */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, transparent 0%, ${raceColor}60 30%, ${raceColor} 50%, ${raceColor}60 70%, transparent 100%)`,
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button — double-bezel */}
            <Link
              href="/"
              aria-label="Ana sayfaya dön"
              className="shrink-0 relative inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300"
              style={{
                background: raceDim,
                border: `1px solid ${raceColor}35`,
                color: raceColor,
                boxShadow: `inset 0 1px 0 ${raceColor}20`,
              }}
            >
              <span aria-hidden className="text-sm font-bold leading-none" style={{ marginTop: '-1px' }}>←</span>
            </Link>

            <div className="min-w-0">
              {/* Eyebrow tag */}
              <p
                className="text-[9px] font-display font-bold uppercase tracking-[0.25em] mb-0.5 hidden sm:block"
                style={{ color: `${raceColor}80` }}
              >
                Sistem Konfigürasyonu
              </p>
              <h1 className="font-display text-lg sm:text-2xl font-black tracking-[0.08em] uppercase truncate" style={{ color: 'var(--color-text-primary)', lineHeight: 1 }}>
                Ayarlar
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Save confirmation badge */}
            <div
              aria-live="polite"
              className="flex items-center gap-1.5 transition-all duration-500"
              style={{
                opacity: savedFlash ? 1 : 0,
                transform: savedFlash ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.95)',
              }}
            >
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-widest"
                style={{
                  background: 'rgba(68,255,136,0.10)',
                  border: '1px solid rgba(68,255,136,0.35)',
                  color: 'var(--color-success)',
                  boxShadow: '0 0 10px rgba(68,255,136,0.2)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block', boxShadow: '0 0 6px var(--color-success)' }} />
                Kaydedildi
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={resetDefaults}>
              Sıfırla
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 lg:pt-8">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">

          {/* ── Section Nav (HUD Tab Bar) ───────────────────────────── */}
          <nav aria-label="Ayar bölümleri" className="lg:sticky lg:top-[72px] lg:self-start">
            {/* Desktop: vertical list with double-bezel outer shell */}
            <div
              className="hidden lg:block rounded-2xl p-1.5"
              style={{
                background: 'rgba(8,10,16,0.7)',
                border: `1px solid ${raceColor}20`,
                boxShadow: `inset 0 1px 0 ${raceColor}12`,
              }}
            >
              <ul className="flex flex-col gap-0.5">
                {SECTIONS.map((s, i) => {
                  const active = activeSection === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(s.id)}
                        aria-current={active ? 'true' : undefined}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-300"
                        style={{
                          background: active ? raceDim : 'transparent',
                          border: `1px solid ${active ? raceColor + '40' : 'transparent'}`,
                          color: active ? raceColor : 'var(--color-text-secondary)',
                          boxShadow: active ? `inset 0 1px 0 ${raceColor}20, 0 0 12px ${raceColor}10` : 'none',
                          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                          animationDelay: `${i * 60}ms`,
                        }}
                      >
                        {/* Icon container — double-bezel */}
                        <span
                          className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold transition-all duration-300"
                          style={{
                            background: active ? `${raceColor}20` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${active ? raceColor + '35' : 'rgba(255,255,255,0.08)'}`,
                            color: active ? raceColor : 'var(--color-text-muted)',
                            boxShadow: active ? `0 0 8px ${raceColor}30` : 'none',
                            fontFamily: 'monospace',
                            fontSize: 13,
                          }}
                        >
                          {s.icon}
                        </span>
                        <div className="min-w-0 text-left">
                          <p className="font-display text-xs font-bold uppercase tracking-wide leading-none">{s.label}</p>
                          <p className="text-[10px] leading-none mt-0.5 opacity-60">{s.sublabel}</p>
                        </div>
                        {active && (
                          <span
                            className="ml-auto shrink-0"
                            style={{ color: raceColor, fontSize: 10, opacity: 0.8 }}
                            aria-hidden
                          >
                            ▶
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Mobile: horizontal scroll pill tabs */}
            <div
              className="lg:hidden rounded-xl p-1"
              style={{
                background: 'rgba(8,10,16,0.70)',
                border: `1px solid ${raceColor}20`,
              }}
            >
              <ul
                className="flex gap-1 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                {SECTIONS.map((s) => {
                  const active = activeSection === s.id;
                  return (
                    <li key={s.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => scrollToSection(s.id)}
                        aria-current={active ? 'true' : undefined}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap"
                        style={{
                          background: active ? raceDim : 'transparent',
                          border: `1px solid ${active ? raceColor + '40' : 'transparent'}`,
                          color: active ? raceColor : 'var(--color-text-muted)',
                          fontSize: 11,
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }} aria-hidden>{s.icon}</span>
                        {s.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* ── Content Sections ───────────────────────────────────── */}
          <div className="flex flex-col gap-5">

            {/* Audio */}
            <SettingsSection
              id="audio"
              title="Ses"
              icon="◈"
              description="Müzik, ses efektleri ve seviye kontrolü"
              raceColor={raceColor}
              raceDim={raceDim}
              raceGlow={raceGlow}
            >
              <div className="flex flex-col gap-5">
                <Toggle
                  label="Sessiz Mod"
                  description="Tüm oyun seslerini kapatır."
                  checked={settings.audio.muted}
                  onChange={(v) => patchAudio({ muted: v })}
                />

                {/* Visual divider with scan line */}
                <ScanDivider raceColor={raceColor} />

                <Slider
                  label="Ana Ses"
                  icon="🎚️"
                  value={settings.audio.masterVolume}
                  onChange={(v) => patchAudio({ masterVolume: v })}
                  disabled={settings.audio.muted}
                  formatValue={(v) => `${v}%`}
                />
                <Slider
                  label="Müzik"
                  icon="🎵"
                  value={settings.audio.musicVolume}
                  onChange={(v) => patchAudio({ musicVolume: v })}
                  disabled={settings.audio.muted}
                  formatValue={(v) => `${v}%`}
                />
                <Slider
                  label="Ses Efektleri"
                  icon="💥"
                  value={settings.audio.sfxVolume}
                  onChange={(v) => patchAudio({ sfxVolume: v })}
                  disabled={settings.audio.muted}
                  formatValue={(v) => `${v}%`}
                />

                {/* Audio visualizer — decorative */}
                <AudioVisualizer
                  active={!settings.audio.muted}
                  raceColor={raceColor}
                  raceGlow={raceGlow}
                />
              </div>
            </SettingsSection>

            {/* Graphics */}
            <SettingsSection
              id="graphics"
              title="Grafik"
              icon="⬡"
              description="Performans ve görsel kalite tercihi"
              raceColor={raceColor}
              raceDim={raceDim}
              raceGlow={raceGlow}
            >
              <SegmentedControl
                ariaLabel="Grafik kalitesi"
                value={settings.graphics.quality}
                options={QUALITY_OPTIONS}
                onChange={(quality) => setSettings((s) => ({ ...s, graphics: { ...s.graphics, quality } }))}
              />
              <div
                className="mt-4 px-3 py-2.5 rounded-lg text-xs leading-relaxed"
                style={{
                  background: raceDim,
                  border: `1px solid ${raceColor}25`,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {settings.graphics.quality === 'low' &&
                  '⚙️  Düşük kalite — mobil ve eski donanım için optimize, partikül efektleri minimumda.'}
                {settings.graphics.quality === 'mid' &&
                  '⚡  Orta kalite — çoğu cihaz için dengeli ayar. Önerilen.'}
                {settings.graphics.quality === 'high' &&
                  '✨  Yüksek kalite — gelişmiş partiküller, tam çözünürlük dokular ve dinamik aydınlatma.'}
              </div>
            </SettingsSection>

            {/* Language */}
            <SettingsSection
              id="language"
              title="Dil"
              icon="◉"
              description="Arayüz dilini seç"
              raceColor={raceColor}
              raceDim={raceDim}
              raceGlow={raceGlow}
            >
              <SegmentedControl
                ariaLabel="Dil seçimi"
                value={settings.language}
                options={LANGUAGE_OPTIONS}
                onChange={(language) => setSettings((s) => ({ ...s, language }))}
              />
            </SettingsSection>

            {/* Notifications */}
            <SettingsSection
              id="notifications"
              title="Bildirimler"
              icon="◆"
              description="Hangi olaylar için uyarı alacağını belirle"
              raceColor={raceColor}
              raceDim={raceDim}
              raceGlow={raceGlow}
            >
              <div className="flex flex-col gap-5">
                <Toggle
                  label="Push Bildirimleri"
                  description="Tarayıcı bildirimi olarak gönderilir."
                  checked={settings.notifications.push}
                  onChange={(v) => patchNotifications({ push: v })}
                />
                <ScanDivider raceColor={raceColor} />
                <Toggle
                  label="Bildirim Sesi"
                  description="Yeni bildirimde kısa bir uyarı sesi çal."
                  checked={settings.notifications.sound}
                  onChange={(v) => patchNotifications({ sound: v })}
                  disabled={!settings.notifications.push}
                />
                <Toggle
                  label="Savaş Uyarıları"
                  description="Saldırı altındayken veya filo döndüğünde bildirim al."
                  checked={settings.notifications.battleAlerts}
                  onChange={(v) => patchNotifications({ battleAlerts: v })}
                  disabled={!settings.notifications.push}
                />
                <Toggle
                  label="Lonca Etkinlikleri"
                  description="Lonca savaşları, etkinlikler ve mesajlar."
                  checked={settings.notifications.guildAlerts}
                  onChange={(v) => patchNotifications({ guildAlerts: v })}
                  disabled={!settings.notifications.push}
                />
              </div>
            </SettingsSection>

            {/* Account */}
            <SettingsSection
              id="account"
              title="Hesap"
              icon="◎"
              description="Profil bilgilerin ve oturum yönetimi"
              raceColor={raceColor}
              raceDim={raceDim}
              raceGlow={raceGlow}
            >
              <AccountSection raceColor={raceColor} raceDim={raceDim} raceGlow={raceGlow} />
            </SettingsSection>

            {/* Version footer */}
            <p
              className="text-center text-[10px] font-display uppercase tracking-widest pb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Nebula Dominion · v0.1.0 · Alpha
            </p>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Global animation keyframes */}
      <style>{`
        @keyframes settings-scan {
          0%   { transform: translateX(-170%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(280%); opacity: 0; }
        }
        @keyframes settings-bar-1 { 0%,100%{transform:scaleY(0.30)} 50%{transform:scaleY(0.90)} }
        @keyframes settings-bar-2 { 0%,100%{transform:scaleY(0.60)} 33%{transform:scaleY(0.20)} 66%{transform:scaleY(1.0)} }
        @keyframes settings-bar-3 { 0%,100%{transform:scaleY(0.80)} 40%{transform:scaleY(0.30)} }
        @keyframes settings-bar-4 { 0%,100%{transform:scaleY(0.40)} 60%{transform:scaleY(0.85)} }
        @keyframes settings-bar-5 { 0%,100%{transform:scaleY(0.70)} 25%{transform:scaleY(1.0)} 75%{transform:scaleY(0.20)} }
        @keyframes settings-bar-6 { 0%,100%{transform:scaleY(0.50)} 50%{transform:scaleY(0.75)} }
        @keyframes settings-bar-7 { 0%,100%{transform:scaleY(0.35)} 45%{transform:scaleY(0.95)} }
        @keyframes settings-bar-8 { 0%,100%{transform:scaleY(0.65)} 30%{transform:scaleY(0.25)} 70%{transform:scaleY(0.90)} }
        @keyframes settings-slide-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── SettingsSection ─────────────────────────────────────────────────────── */

interface SettingsSectionProps {
  id: SectionId;
  title: string;
  icon: string;
  description?: string;
  children: React.ReactNode;
  raceColor: string;
  raceDim: string;
  raceGlow: string;
}

function SettingsSection({ id, title, icon, description, children, raceColor, raceDim, raceGlow }: SettingsSectionProps) {
  return (
    <section
      id={`section-${id}`}
      aria-labelledby={`heading-${id}`}
      className="scroll-mt-24"
      style={{
        animation: 'settings-slide-in 0.5s cubic-bezier(0.32,0.72,0,1) both',
      }}
    >
      {/* Double-bezel outer shell */}
      <div
        className="rounded-2xl p-[3px]"
        style={{
          background: `linear-gradient(135deg, ${raceColor}18 0%, transparent 60%, ${raceColor}08 100%)`,
          boxShadow: `0 0 0 1px ${raceColor}18, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Inner core */}
        <div
          className="rounded-[calc(1rem-3px)] overflow-hidden"
          style={{
            background: 'rgba(10,13,20,0.92)',
            boxShadow: `inset 0 1px 0 ${raceColor}12`,
          }}
        >
          {/* Section header strip */}
          <div
            className="px-5 py-4 flex items-center gap-3"
            style={{
              borderBottom: `1px solid ${raceColor}15`,
              background: `linear-gradient(90deg, ${raceDim} 0%, transparent 100%)`,
            }}
          >
            {/* Icon — nested double-bezel */}
            <div
              className="relative shrink-0 rounded-xl p-[2px]"
              style={{
                background: `linear-gradient(135deg, ${raceColor}30, ${raceColor}10)`,
              }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-[calc(0.75rem-2px)]"
                style={{
                  background: raceDim,
                  color: raceColor,
                  fontSize: 16,
                  fontFamily: 'monospace',
                  boxShadow: `inset 0 1px 0 ${raceColor}20, 0 0 12px ${raceColor}25`,
                  textShadow: `0 0 8px ${raceGlow}`,
                }}
                aria-hidden
              >
                {icon}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id={`heading-${id}`}
                className="font-display text-base font-black uppercase tracking-[0.08em] leading-none"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h2>
              {description && (
                <p className="text-[11px] mt-1 leading-none" style={{ color: 'var(--color-text-muted)' }}>
                  {description}
                </p>
              )}
            </div>

            {/* Section ID badge */}
            <span
              className="shrink-0 font-display text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md"
              style={{
                background: raceDim,
                border: `1px solid ${raceColor}25`,
                color: `${raceColor}80`,
              }}
              aria-hidden
            >
              {id.slice(0, 3).toUpperCase()}
            </span>
          </div>

          {/* Content */}
          <div className="px-5 py-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Divider with scan line accent ──────────────────────────────────────── */

function ScanDivider({ raceColor }: { raceColor: string }) {
  return (
    <div className="relative flex items-center gap-3" aria-hidden>
      <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      <span
        className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest"
        style={{ color: `${raceColor}50` }}
      >
        ···
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
    </div>
  );
}

/* ── Audio Visualizer ────────────────────────────────────────────────────── */

function AudioVisualizer({ active, raceColor, raceGlow }: { active: boolean; raceColor: string; raceGlow: string }) {
  const bars = [
    { anim: 'settings-bar-1', delay: '0ms' },
    { anim: 'settings-bar-2', delay: '150ms' },
    { anim: 'settings-bar-3', delay: '80ms' },
    { anim: 'settings-bar-4', delay: '220ms' },
    { anim: 'settings-bar-5', delay: '50ms' },
    { anim: 'settings-bar-6', delay: '310ms' },
    { anim: 'settings-bar-7', delay: '130ms' },
    { anim: 'settings-bar-8', delay: '260ms' },
  ];

  return (
    <div
      className="flex items-end justify-center gap-[3px] h-8 px-4 rounded-lg transition-opacity duration-500"
      style={{
        opacity: active ? 0.7 : 0.2,
        background: `${raceColor}06`,
        border: `1px solid ${raceColor}15`,
      }}
      aria-hidden
    >
      {bars.map((b, i) => (
        <div
          key={i}
          className="rounded-sm"
          style={{
            width: 3,
            height: '100%',
            background: raceColor,
            boxShadow: active ? `0 0 4px ${raceGlow}` : 'none',
            transformOrigin: 'bottom',
            transform: 'scaleY(0.5)',
            animation: active ? `${b.anim} ${1.2 + i * 0.15}s ease-in-out ${b.delay} infinite` : 'none',
            transition: 'opacity 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ── Account Section ─────────────────────────────────────────────────────── */

interface ProfileForm {
  displayName: string;
  email: string;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

const PROFILE_STORAGE_KEY = 'nebula:profile:v1';

function AccountSection({
  raceColor,
  raceDim,
  raceGlow,
}: {
  raceColor: string;
  raceDim: string;
  raceGlow: string;
}) {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileForm>({ displayName: 'Komutan', email: '' });
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProfileForm>;
        setProfile((p) => ({
          displayName: parsed.displayName ?? p.displayName,
          email:       parsed.email       ?? p.email,
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const passwordValidationError = useMemo(() => {
    if (!pw.current && !pw.next && !pw.confirm) return null;
    if (pw.next.length > 0 && pw.next.length < 8) return 'Yeni şifre en az 8 karakter olmalı.';
    if (pw.next !== pw.confirm) return 'Yeni şifreler birbiriyle eşleşmiyor.';
    return null;
  }, [pw]);

  function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMessage(null);
    if (!profile.displayName.trim()) {
      setProfileMessage({ type: 'error', text: 'Görünen ad boş olamaz.' });
      return;
    }
    setSavingProfile(true);
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      setProfileMessage({ type: 'success', text: 'Profil güncellendi.' });
    } catch {
      setProfileMessage({ type: 'error', text: 'Profil kaydedilemedi.' });
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwMessage(null);

    if (!pw.current || !pw.next || !pw.confirm) {
      setPwMessage({ type: 'error', text: 'Tüm alanları doldur.' });
      return;
    }
    if (passwordValidationError) {
      setPwMessage({ type: 'error', text: passwordValidationError });
      return;
    }

    setChangingPw(true);
    setTimeout(() => {
      setPw({ current: '', next: '', confirm: '' });
      setPwMessage({ type: 'success', text: 'Şifre değiştirildi.' });
      setChangingPw(false);
    }, 600);
  }

  function handleLogout() {
    setLoggingOut(true);
    clearTokens();
    router.push('/login');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile */}
      <div>
        <SubHeading label="Profil" raceColor={raceColor} />
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 mt-3" noValidate>
          {profileMessage && (
            <Alert kind={profileMessage.type}>{profileMessage.text}</Alert>
          )}
          <div>
            <label htmlFor="acc-name" className="form-label">Görünen Ad</label>
            <input
              id="acc-name"
              type="text"
              className="form-input"
              autoComplete="nickname"
              required
              maxLength={32}
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              disabled={savingProfile}
            />
          </div>
          <div>
            <label htmlFor="acc-email" className="form-label">E-posta</label>
            <input
              id="acc-email"
              type="email"
              className="form-input"
              autoComplete="email"
              placeholder="komutan@galaksi.com"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              disabled={savingProfile}
            />
          </div>
          <div>
            <Button type="submit" variant="primary" loading={savingProfile} glow>
              Profili Güncelle
            </Button>
          </div>
        </form>
      </div>

      <ScanDivider raceColor={raceColor} />

      {/* Password */}
      <div>
        <SubHeading label="Şifre Değiştir" raceColor={raceColor} />
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 mt-3" noValidate>
          {pwMessage && <Alert kind={pwMessage.type}>{pwMessage.text}</Alert>}
          <div>
            <label htmlFor="pw-current" className="form-label">Mevcut Şifre</label>
            <input
              id="pw-current"
              type="password"
              className="form-input"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              disabled={changingPw}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pw-new" className="form-label">Yeni Şifre</label>
              <input
                id="pw-new"
                type="password"
                className="form-input"
                autoComplete="new-password"
                minLength={8}
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                disabled={changingPw}
                aria-describedby="pw-help"
              />
              <p id="pw-help" className="text-[11px] text-text-muted mt-1">En az 8 karakter</p>
            </div>
            <div>
              <label htmlFor="pw-confirm" className="form-label">Yeni Şifre (Tekrar)</label>
              <input
                id="pw-confirm"
                type="password"
                className="form-input"
                autoComplete="new-password"
                minLength={8}
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                disabled={changingPw}
              />
            </div>
          </div>
          {passwordValidationError && (
            <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
              ⚠ {passwordValidationError}
            </p>
          )}
          <div>
            <Button type="submit" variant="secondary" loading={changingPw}>
              Şifreyi Değiştir
            </Button>
          </div>
        </form>
      </div>

      <ScanDivider raceColor={raceColor} />

      {/* Danger zone */}
      <div>
        <SubHeading label="Oturum" raceColor={raceColor} />
        <div
          className="mt-3 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{
            background: 'rgba(255,51,85,0.05)',
            border: '1px solid rgba(255,51,85,0.20)',
            boxShadow: 'inset 0 1px 0 rgba(255,51,85,0.08)',
          }}
        >
          <div className="min-w-0">
            <p className="font-display text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Çıkış Yap
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Bu cihazdaki oturumun sonlanır. Tekrar giriş yapman gerekir.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {confirmingLogout ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingLogout(false)} disabled={loggingOut}>
                  Vazgeç
                </Button>
                <Button variant="danger" size="sm" onClick={handleLogout} loading={loggingOut}>
                  Onayla
                </Button>
              </>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmingLogout(true)}>
                Çıkış Yap
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-heading ────────────────────────────────────────────────────────── */

function SubHeading({ label, raceColor }: { label: string; raceColor: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-3 rounded-full" style={{ background: raceColor, boxShadow: `0 0 6px ${raceColor}` }} aria-hidden />
      <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: `${raceColor}90` }}>
        {label}
      </h3>
    </div>
  );
}

/* ── Alert ──────────────────────────────────────────────────────────────── */

function Alert({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  const isErr = kind === 'error';
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      className="rounded-lg px-3 py-2.5 text-xs font-semibold flex items-center gap-2"
      style={{
        background: isErr ? 'rgba(255,51,85,0.08)' : 'rgba(68,255,136,0.08)',
        border: `1px solid ${isErr ? 'rgba(255,51,85,0.30)' : 'rgba(68,255,136,0.30)'}`,
        color: isErr ? 'var(--color-danger)' : 'var(--color-success)',
        boxShadow: `inset 0 1px 0 ${isErr ? 'rgba(255,51,85,0.10)' : 'rgba(68,255,136,0.10)'}`,
      }}
    >
      <span aria-hidden className="shrink-0">{isErr ? '⚠' : '✓'}</span>
      <span>{children}</span>
    </div>
  );
}
