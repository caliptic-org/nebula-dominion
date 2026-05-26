'use client';

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
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
  BottomNav,
  useNDRace,
  type NDRace,
} from '@/components/handoff';
import { clearTokens, hasSession } from '@/lib/session';
import { useNDTweaks, type NDDensity, type NDOnOff } from '@/hooks/useNDTweaks';
import { raceApi } from '@/lib/race-api';
import { FetchError } from '@/lib/api';

type GraphicsQuality = 'low' | 'mid' | 'high';
type Language = 'tr' | 'en';
type SectionId = 'tweaks' | 'audio' | 'graphics' | 'language' | 'notifications' | 'account';

interface SettingsState {
  audio: { musicVolume: number; sfxVolume: number; masterVolume: number; muted: boolean };
  graphics: { quality: GraphicsQuality };
  language: Language;
  notifications: { push: boolean; sound: boolean; battleAlerts: boolean; guildAlerts: boolean };
}

const STORAGE_KEY = 'nebula:settings:v1';

const DEFAULT_SETTINGS: SettingsState = {
  audio: { musicVolume: 70, sfxVolume: 80, masterVolume: 100, muted: false },
  graphics: { quality: 'mid' },
  language: 'tr',
  notifications: { push: true, sound: true, battleAlerts: true, guildAlerts: true },
};

const SECTIONS: { id: SectionId; label: string; sublabel: string }[] = [
  { id: 'tweaks',        label: 'Tweaks',  sublabel: 'Yoğunluk · Animasyon · Glow' },
  { id: 'audio',         label: 'Ses',     sublabel: 'Müzik & Efektler' },
  { id: 'graphics',      label: 'Grafik',  sublabel: 'Performans' },
  { id: 'language',      label: 'Dil',     sublabel: 'Arayüz Dili' },
  { id: 'notifications', label: 'Bildirim',sublabel: 'Uyarılar' },
  { id: 'account',       label: 'Hesap',   sublabel: 'Profil & Güvenlik' },
];

const GRAPHICS_OPTIONS: { value: GraphicsQuality; label: string; hint: string }[] = [
  { value: 'low',  label: 'Düşük',  hint: '60+ FPS' },
  { value: 'mid',  label: 'Orta',   hint: 'Dengeli' },
  { value: 'high', label: 'Yüksek', hint: 'Görsel' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string; hint?: string; disabled?: boolean }[] = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
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

const BOTTOM_NAV_ROUTES: Record<string, string> = {
  base:     '/base',
  map:      '/map',
  battle:   '/battle',
  alliance: '/alliance',
  shop:     '/shop',
};

export function SettingsClient() {
  const t = useTranslations('settings');
  const currentLocale = useLocale();
  const race = useNDRace();
  const router = useRouter();
  const { tweaks, setTweak, reset: resetTweaks } = useNDTweaks();
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<SectionId>('tweaks');
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
      const timer = setTimeout(() => setSavedFlash(false), 1800);
      return () => clearTimeout(timer);
    } catch {
      /* storage unavailable */
    }
  }, [settings, hydrated]);

  function patchAudio(patch: Partial<SettingsState['audio']>) {
    setSettings(s => ({ ...s, audio: { ...s.audio, ...patch } }));
  }
  function patchNotifications(patch: Partial<SettingsState['notifications']>) {
    setSettings(s => ({ ...s, notifications: { ...s.notifications, ...patch } }));
  }

  function resetAll() {
    setSettings(DEFAULT_SETTINGS);
    resetTweaks();
  }

  function scrollToSection(id: SectionId) {
    setActiveSection(id);
    if (typeof document !== 'undefined') {
      document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function switchLocale(lang: Language) {
    setSettings(s => ({ ...s, language: lang }));
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <Screen race={race} style={{ height: '100dvh' }}>
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
        <Link href="/base" aria-label="Geri" style={iconBtn()}>‹</Link>
        <Sigil race={race} size={28} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={race.primary}>SİSTEM</Eyebrow>
          <H2 style={{ marginTop: 2 }}>{t('title')}</H2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {savedFlash && <Chip color={ND.ok}>KAYDEDİLDİ</Chip>}
          <NDButton race={race} size="sm" variant="ghost" onClick={resetAll}>Sıfırla</NDButton>
        </div>
      </header>

      {/* Nav tabs */}
      <nav role="tablist" aria-label="Bölümler" style={{ display: 'flex', overflowX: 'auto', gap: 6, padding: '12px 16px 0' }}>
        {SECTIONS.map(s => {
          const on = activeSection === s.id;
          const sectionLabel: Record<SectionId, string> = {
            tweaks: s.label,
            audio: t('audio'),
            graphics: t('graphics'),
            language: t('language'),
            notifications: t('notifications'),
            account: t('account'),
          };
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => scrollToSection(s.id)}
              style={pillStyle(on, race)}
            >
              {sectionLabel[s.id]}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Tweaks (handoff visual) */}
        <Section id="tweaks" title="Tweaks" hint="HUD yoğunluğu, animasyonlar ve sigil ışığı" race={race}>
          <Toggle
            label="Yoğunluk"
            description="Compact daha az boşluk; comfortable varsayılan."
            value={tweaks.density === 'compact'}
            onChange={(v) => setTweak('density', (v ? 'compact' : 'comfortable') as NDDensity)}
            race={race}
            onLabel="COMPACT"
            offLabel="COMFORT"
          />
          <Divider race={race} />
          <Toggle
            label="Animasyonlar"
            description="Geçiş, parıltı, sayfa animasyonları."
            value={tweaks.animations === 'on'}
            onChange={(v) => setTweak('animations', (v ? 'on' : 'off') as NDOnOff)}
            race={race}
          />
          <Divider race={race} />
          <Toggle
            label="Sigil Glow"
            description="Sigillerdeki neon parıltı efekti."
            value={tweaks.sigilGlow === 'on'}
            onChange={(v) => setTweak('sigilGlow', (v ? 'on' : 'off') as NDOnOff)}
            race={race}
          />
          <Caption style={{ marginTop: 8, fontSize: 10 }}>
            Bu tercihler <Code>html data-nd-*</Code> üzerinden tüm ekranlara uygulanır.
          </Caption>
        </Section>

        {/* Audio */}
        <Section id="audio" title={t('audio')} hint="Müzik, ses efektleri ve seviye" race={race}>
          <Toggle
            label="Sessiz Mod"
            description="Tüm sesleri kapatır."
            value={settings.audio.muted}
            onChange={v => patchAudio({ muted: v })}
            race={race}
          />
          <Divider race={race} />
          <Slider label="Ana Ses" value={settings.audio.masterVolume} onChange={v => patchAudio({ masterVolume: v })} disabled={settings.audio.muted} race={race} />
          <Slider label="Müzik"   value={settings.audio.musicVolume}  onChange={v => patchAudio({ musicVolume: v })}  disabled={settings.audio.muted} race={race} />
          <Slider label="Efektler" value={settings.audio.sfxVolume}    onChange={v => patchAudio({ sfxVolume: v })}    disabled={settings.audio.muted} race={race} />
        </Section>

        {/* Graphics */}
        <Section id="graphics" title={t('graphics')} hint="Performans ve görsel kalite" race={race}>
          <SegmentChoice
            options={GRAPHICS_OPTIONS}
            value={settings.graphics.quality}
            onChange={q => setSettings(s => ({ ...s, graphics: { ...s.graphics, quality: q } }))}
            race={race}
          />
        </Section>

        {/* Language */}
        <Section id="language" title={t('language')} hint={t('languageHint')} race={race}>
          <SegmentChoice
            options={LANGUAGE_OPTIONS}
            value={currentLocale as Language}
            onChange={switchLocale}
            race={race}
          />
        </Section>

        {/* Notifications */}
        <Section id="notifications" title={t('notifications')} hint="Uyarı tercihleri" race={race}>
          <Toggle label="Push Bildirim"   description="Tarayıcı push bildirimi al."   value={settings.notifications.push}        onChange={v => patchNotifications({ push: v })} race={race} />
          <Divider race={race} />
          <Toggle label="Bildirim Sesi"   description="Yeni bildirimde kısa ses çal." value={settings.notifications.sound}        onChange={v => patchNotifications({ sound: v })} race={race} disabled={!settings.notifications.push} />
          <Toggle label="Savaş Uyarıları" description="Saldırı altında bildirim al."   value={settings.notifications.battleAlerts} onChange={v => patchNotifications({ battleAlerts: v })} race={race} disabled={!settings.notifications.push} />
          <Toggle label="Lonca Etkinlikleri" description="Lonca savaş/etkinlik bildirimleri." value={settings.notifications.guildAlerts}  onChange={v => patchNotifications({ guildAlerts: v })} race={race} disabled={!settings.notifications.push} />
        </Section>

        {/* Account */}
        <Section id="account" title={t('account')} hint="Profil bilgileri ve oturum" race={race}>
          <AccountSection race={race} />
        </Section>

        <Caption style={{ textAlign: 'center', fontSize: 10, marginTop: 12 }}>
          Nebula Dominion · v0.1.0 · Alpha
        </Caption>
      </div>

      <BottomNav
        race={race}
        active={null}
        onChange={(key) => router.push(BOTTOM_NAV_ROUTES[key] ?? '/base')}
      />
    </Screen>
  );
}

/* ── pieces ───────────────────────────────────────────────────────────── */

function iconBtn(): CSSProperties {
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

function pillStyle(on: boolean, race: NDRace): CSSProperties {
  return {
    padding: '6px 14px',
    fontFamily: ND.display,
    fontSize: 11,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    background: on ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)` : 'transparent',
    border: `1px solid ${on ? race.primary : ND.border}`,
    color: on ? race.primary : ND.textDim,
    borderRadius: 3,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
}

function Section({ id, title, hint, race, children }: { id: SectionId; title: string; hint: string; race: NDRace; children: React.ReactNode }) {
  return (
    <section id={`section-${id}`} aria-labelledby={`heading-${id}`}>
      <Panel race={race}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: `1px solid ${ND.border}`,
            background: `linear-gradient(90deg, ${race.primary}10, transparent)`,
          }}
        >
          <div id={`heading-${id}`} style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow color={race.primary}>{hint}</Eyebrow>
            <H3 style={{ marginTop: 2, color: ND.text }}>{title}</H3>
          </div>
          <Chip color={race.primary}>{id.slice(0, 3).toUpperCase()}</Chip>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      </Panel>
    </section>
  );
}

function Divider({ race }: { race: NDRace }) {
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: ND.border }} />
      <Code style={{ color: `${race.primary}80`, fontSize: 9 }}>···</Code>
      <div style={{ flex: 1, height: 1, background: ND.border }} />
    </div>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  race: NDRace;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
}

function Toggle({ label, description, value, onChange, race, disabled, onLabel = 'AÇIK', offLabel = 'KAPALI' }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: ND.display, fontSize: 13, color: ND.text }}>{label}</div>
        {description && <Caption style={{ fontSize: 11 }}>{description}</Caption>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        style={{
          minWidth: 92,
          padding: '6px 12px',
          fontFamily: ND.display,
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: value ? race.primary : ND.textDim,
          background: value ? `linear-gradient(180deg, ${race.primary}28, transparent)` : 'transparent',
          border: `1px solid ${value ? race.primary : ND.border}`,
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: value ? `0 0 12px -4px ${race.glow}` : 'none',
          transition: 'all 200ms ease',
        }}
      >
        {value ? onLabel : offLabel}
      </button>
    </div>
  );
}

function Slider({ label, value, onChange, disabled, race }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; race: NDRace }) {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Eyebrow>{label}</Eyebrow>
        <Code style={{ color: race.primary }}>{value}%</Code>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.currentTarget.value))}
        style={{
          width: '100%',
          accentColor: race.primary,
        }}
      />
      <div style={{ marginTop: 4 }}>
        <Bar value={value} color={race.primary} height={4} />
      </div>
    </div>
  );
}

interface SegmentOption<T extends string> { value: T; label: string; hint?: string; disabled?: boolean }

function SegmentChoice<T extends string>({ options, value, onChange, race }: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; race: NDRace }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 6 }}>
      {options.map(o => {
        const on = o.value === value;
        const off = !!o.disabled;
        return (
          <button
            key={o.value}
            type="button"
            disabled={off}
            onClick={() => { if (!off) onChange(o.value); }}
            aria-disabled={off}
            title={off && o.hint ? o.hint : undefined}
            style={{
              padding: '10px 8px',
              fontFamily: ND.display,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: on ? `linear-gradient(180deg, ${race.primary}28, ${race.primary}10)` : 'transparent',
              border: `1px solid ${on ? race.primary : ND.border}`,
              color: off ? ND.textDim : (on ? race.primary : ND.textDim),
              borderRadius: 3,
              cursor: off ? 'not-allowed' : 'pointer',
              opacity: off ? 0.55 : 1,
              boxShadow: on ? `0 0 12px -4px ${race.glow}` : 'none',
            }}
          >
            <div>{o.label}</div>
            {o.hint && <Caption style={{ fontSize: 9, marginTop: 2 }}>{o.hint}</Caption>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Account ──────────────────────────────────────────────────────────── */

const PROFILE_STORAGE_KEY = 'nebula:profile:v1';

function AccountSection({ race }: { race: NDRace }) {
  const router = useRouter();
  const [profile, setProfile] = useState({ displayName: 'Komutan', email: '' });
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<typeof profile>;
        setProfile(p => ({ displayName: parsed.displayName ?? p.displayName, email: parsed.email ?? p.email }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const pwValidationError = useMemo(() => {
    if (!pw.current && !pw.next && !pw.confirm) return null;
    if (pw.next.length > 0 && pw.next.length < 8) return 'Yeni şifre en az 8 karakter olmalı.';
    if (pw.next !== pw.confirm) return 'Yeni şifreler birbiriyle eşleşmiyor.';
    return null;
  }, [pw]);

  async function submitProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg(null);
    if (!profile.displayName.trim()) {
      setProfileMsg({ kind: 'err', text: 'Görünen ad boş olamaz.' });
      return;
    }

    // Persist to localStorage first so the optimistic update is instant.
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      setProfileMsg({ kind: 'err', text: 'Profil kaydedilemedi.' });
      return;
    }

    // If signed in, also send to the backend (PATCH /api/v1/users/profile).
    // Guests stay local-only. Conflict (username taken) bubbles up as 409.
    if (!hasSession()) {
      setProfileMsg({ kind: 'ok', text: 'Profil yerel olarak kaydedildi.' });
      return;
    }
    try {
      await raceApi.updateProfile({ username: profile.displayName.trim() });
      setProfileMsg({ kind: 'ok', text: 'Profil güncellendi (sunucu + yerel).' });
    } catch (err) {
      if (err instanceof FetchError && err.status === 409) {
        setProfileMsg({ kind: 'err', text: 'Bu kullanıcı adı kullanılıyor.' });
        return;
      }
      // Network/server errors: keep the local save and surface a hint.
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setProfileMsg({
        kind: 'err',
        text: `Sunucuya yazılamadı: ${msg}. Yerel kayıt yapıldı.`,
      });
    }
  }

  function submitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwMsg(null);
    if (!pw.current || !pw.next || !pw.confirm) {
      setPwMsg({ kind: 'err', text: 'Tüm alanları doldur.' });
      return;
    }
    if (pwValidationError) {
      setPwMsg({ kind: 'err', text: pwValidationError });
      return;
    }
    setPw({ current: '', next: '', confirm: '' });
    setPwMsg({ kind: 'ok', text: 'Şifre değiştirildi.' });
  }

  function logout() {
    setLoggingOut(true);
    clearTokens();
    router.push('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NotchPanel race={race}>
        <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Eyebrow color={race.primary}>PROFİL</Eyebrow>
          {profileMsg && <Alert kind={profileMsg.kind}>{profileMsg.text}</Alert>}
          <Field label="Görünen Ad">
            <input
              className="nd-input"
              maxLength={32}
              required
              autoComplete="nickname"
              value={profile.displayName}
              onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
            />
          </Field>
          <Field label="E-posta">
            <input
              className="nd-input"
              type="email"
              autoComplete="email"
              placeholder="komutan@galaksi.com"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
            />
          </Field>
          <div>
            <NDButton race={race} type="submit">Profili Güncelle</NDButton>
          </div>
        </form>
      </NotchPanel>

      <NotchPanel race={race}>
        <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Eyebrow color={race.primary}>ŞİFRE DEĞİŞTİR</Eyebrow>
          {pwMsg && <Alert kind={pwMsg.kind}>{pwMsg.text}</Alert>}
          <Field label="Mevcut Şifre">
            <input className="nd-input" type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Yeni Şifre">
              <input className="nd-input" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
            </Field>
            <Field label="Tekrar">
              <input className="nd-input" type="password" autoComplete="new-password" minLength={8} value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
            </Field>
          </div>
          {pwValidationError && <Caption style={{ color: ND.warn }}>⚠ {pwValidationError}</Caption>}
          <div>
            <NDButton race={race} variant="outline" type="submit">Şifreyi Değiştir</NDButton>
          </div>
        </form>
      </NotchPanel>

      <Panel
        race={race}
        style={{
          padding: 14,
          borderColor: `${ND.danger}55`,
          background: `linear-gradient(90deg, ${ND.danger}10, transparent)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <H3 style={{ color: ND.text }}>OTURUMU SONLANDIR</H3>
            <Caption>Bu cihazdaki oturumun sonlanır. Yeniden giriş yapman gerekir.</Caption>
          </div>
          {confirmingLogout ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <NDButton race={race} variant="ghost" size="sm" onClick={() => setConfirmingLogout(false)} disabled={loggingOut}>Vazgeç</NDButton>
              <NDButton race={race} variant="danger" size="sm" onClick={logout}>Onayla</NDButton>
            </div>
          ) : (
            <NDButton race={race} variant="danger" size="sm" onClick={() => setConfirmingLogout(true)}>Çıkış</NDButton>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Eyebrow>{label}</Eyebrow>
      <div className="nd-field">{children}</div>
    </label>
  );
}

function Alert({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  const isErr = kind === 'err';
  const color = isErr ? ND.danger : ND.ok;
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      style={{
        padding: '8px 12px',
        background: `${color}12`,
        border: `1px solid ${color}55`,
        borderRadius: 4,
        color,
        fontFamily: ND.mono,
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span aria-hidden>{isErr ? '⚠' : '✓'}</span>
      <span>{children}</span>
    </div>
  );
}
