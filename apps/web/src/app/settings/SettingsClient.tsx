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
  { id: 'audio',         label: 'Ses',          icon: '🔊' },
  { id: 'graphics',      label: 'Grafik',       icon: '🎮' },
  { id: 'language',      label: 'Dil',          icon: '🌐' },
  { id: 'notifications', label: 'Bildirim',     icon: '🔔' },
  { id: 'account',       label: 'Hesap',        icon: '👤' },
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
      const t = setTimeout(() => setSavedFlash(false), 1200);
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

  return (
    <div
      className="min-h-screen pb-28 lg:pb-12"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          background: 'var(--color-bg-overlay)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              aria-label="Ana sayfaya dön"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden className="text-lg">←</span>
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-black tracking-wider uppercase truncate">
                Ayarlar
              </h1>
              <p className="text-xs text-text-muted hidden sm:block">
                Tercihlerin tarayıcına otomatik kaydedilir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              aria-live="polite"
              className="text-xs font-display tracking-widest uppercase transition-opacity duration-300"
              style={{
                color: 'var(--color-success)',
                opacity: savedFlash ? 1 : 0,
              }}
            >
              ✓ Kaydedildi
            </span>
            <Button variant="ghost" size="sm" onClick={resetDefaults}>
              Sıfırla
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 lg:pt-10">
        <div className="grid lg:grid-cols-[240px_1fr] gap-6 lg:gap-10">
          {/* Section nav (sidebar on desktop, horizontal scroll on mobile) */}
          <nav aria-label="Ayar bölümleri" className="lg:sticky lg:top-24 lg:self-start">
            <ul
              className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0"
              style={{ scrollbarWidth: 'thin' }}
            >
              {SECTIONS.map((s) => {
                const active = activeSection === s.id;
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection(s.id);
                        if (typeof document !== 'undefined') {
                          document.getElementById(`section-${s.id}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                        }
                      }}
                      aria-current={active ? 'true' : undefined}
                      className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg font-display text-sm font-semibold tracking-wide transition-all duration-200 ease-spring"
                      style={{
                        background: active ? 'var(--color-race-dim)' : 'transparent',
                        color: active ? 'var(--color-race)' : 'var(--color-text-secondary)',
                        border: `1px solid ${active ? 'var(--color-race-glow)' : 'transparent'}`,
                        boxShadow: active ? 'inset 2px 0 0 var(--color-race)' : undefined,
                      }}
                    >
                      <span aria-hidden className="text-base">{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sections */}
          <div className="flex flex-col gap-6">
            <Section id="audio" title="Ses" icon="🔊" description="Müzik ve efekt seviyelerini ayarla">
              <div className="flex flex-col gap-5">
                <Toggle
                  label="Sessiz Mod"
                  description="Tüm oyun seslerini kapatır."
                  checked={settings.audio.muted}
                  onChange={(v) => patchAudio({ muted: v })}
                />

                <Divider />

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
              </div>
            </Section>

            <Section id="graphics" title="Grafik" icon="🎮" description="Performans ve kalite tercihi">
              <SegmentedControl
                ariaLabel="Grafik kalitesi"
                value={settings.graphics.quality}
                options={QUALITY_OPTIONS}
                onChange={(quality) => setSettings((s) => ({ ...s, graphics: { ...s.graphics, quality } }))}
              />
              <p className="mt-4 text-xs text-text-muted leading-relaxed">
                {settings.graphics.quality === 'low' &&
                  'Düşük kalite — mobil ve eski donanım için optimize, partikül efektleri minimumda.'}
                {settings.graphics.quality === 'mid' &&
                  'Orta kalite — çoğu cihaz için dengeli ayar. Önerilen.'}
                {settings.graphics.quality === 'high' &&
                  'Yüksek kalite — gelişmiş partiküller, tam çözünürlük dokular ve dinamik aydınlatma.'}
              </p>
            </Section>

            <Section id="language" title="Dil" icon="🌐" description="Arayüz dilini seç">
              <SegmentedControl
                ariaLabel="Dil seçimi"
                value={settings.language}
                options={LANGUAGE_OPTIONS}
                onChange={(language) => setSettings((s) => ({ ...s, language }))}
              />
            </Section>

            <Section id="notifications" title="Bildirimler" icon="🔔" description="Hangi olaylar için bildirim alacağını seç">
              <div className="flex flex-col gap-5">
                <Toggle
                  label="Push Bildirimleri"
                  description="Tarayıcı bildirimi olarak gönderilir."
                  checked={settings.notifications.push}
                  onChange={(v) => patchNotifications({ push: v })}
                />
                <Divider />
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
            </Section>

            <Section id="account" title="Hesap" icon="👤" description="Profil bilgilerin ve oturum yönetimi">
              <AccountSection />
            </Section>

            <p className="text-center text-xs text-text-muted pt-2">
              Nebula Dominion · Sürüm 0.1.0 · Yapım aşamasında
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

interface SectionProps {
  id: SectionId;
  title: string;
  icon: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ id, title, icon, description, children }: SectionProps) {
  return (
    <section id={`section-${id}`} aria-labelledby={`heading-${id}`} className="scroll-mt-28">
      <GlassPanel padding="lg" className="animate-slide-up">
        <header className="mb-5 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-lg"
              style={{
                background: 'var(--color-race-dim)',
                border: '1px solid var(--color-race-glow)',
                color: 'var(--color-race)',
              }}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h2
                id={`heading-${id}`}
                className="font-display text-lg font-bold uppercase tracking-wider text-text-primary"
              >
                {title}
              </h2>
              {description && (
                <p className="text-xs text-text-muted mt-0.5">{description}</p>
              )}
            </div>
          </div>
        </header>
        {children}
      </GlassPanel>
    </section>
  );
}

function Divider() {
  return <div className="h-px" style={{ background: 'var(--color-border)' }} aria-hidden />;
}

/* ── Account ───────────────────────────────────────────────────────────── */

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

function AccountSection() {
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
    try {
      window.localStorage.removeItem('accessToken');
    } catch {
      /* ignore */
    }
    router.push('/login');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile */}
      <div>
        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
          Profil
        </h3>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" noValidate>
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

      <Divider />

      {/* Password */}
      <div>
        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
          Şifre Değiştir
        </h3>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4" noValidate>
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
              ⚠️ {passwordValidationError}
            </p>
          )}
          <div>
            <Button type="submit" variant="secondary" loading={changingPw}>
              Şifreyi Değiştir
            </Button>
          </div>
        </form>
      </div>

      <Divider />

      {/* Danger zone */}
      <div>
        <h3 className="font-display text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
          Oturum
        </h3>
        <div
          className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{
            background: 'rgba(255,51,85,0.06)',
            border: '1px solid rgba(255,51,85,0.25)',
          }}
        >
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-text-primary">Çıkış Yap</p>
            <p className="text-xs text-text-muted mt-0.5">
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

function Alert({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  const isErr = kind === 'error';
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      className="rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2"
      style={{
        background: isErr ? 'rgba(255,51,85,0.10)' : 'rgba(68,255,136,0.10)',
        border: `1px solid ${isErr ? 'rgba(255,51,85,0.35)' : 'rgba(68,255,136,0.35)'}`,
        color: isErr ? 'var(--color-danger)' : 'var(--color-success)',
      }}
    >
      <span aria-hidden>{isErr ? '⚠️' : '✓'}</span>
      <span>{children}</span>
    </div>
  );
}
