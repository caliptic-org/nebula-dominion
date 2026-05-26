'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Caption,
  Eyebrow,
  H2,
  ND,
  NDButton,
  type NDRaceKey,
  Panel,
  Sigil,
  useNDRace,
} from '@/components/handoff';
import { setTokens } from '@/lib/session';
import { translateBackendError } from '@/lib/translate-backend-error';

interface FieldDef {
  label: string;
  placeholder: string;
  name: 'username' | 'email' | 'password' | 'confirmPassword';
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  minLength?: number;
}

const FIELD_DEFS: Record<NDRaceKey, FieldDef[]> = {
  insan: [
    { label: 'KOMUTAN ADI',   placeholder: 'voss.cmd',                  name: 'username',        type: 'text',     autoComplete: 'username',     minLength: 3 },
    { label: 'E-POSTA',       placeholder: 'voss@ins-net.gx',           name: 'email',           type: 'email',    autoComplete: 'email' },
    { label: 'ŞİFRE',         placeholder: 'En az 8 karakter',          name: 'password',        type: 'password', autoComplete: 'new-password', minLength: 8 },
    { label: 'ŞİFRE TEKRAR',  placeholder: 'Şifreni tekrar gir',        name: 'confirmPassword', type: 'password', autoComplete: 'new-password', minLength: 8 },
  ],
  zerg: [
    { label: 'KOVAN UZANTI ADI', placeholder: 'vex.brood',              name: 'username',        type: 'text',     autoComplete: 'username',     minLength: 3 },
    { label: 'FEROMON İMZASI',   placeholder: 'vex@zrg-net.gx',         name: 'email',           type: 'email',    autoComplete: 'email' },
    { label: 'EVRİM SİNYALİ',    placeholder: '••••••••••',             name: 'password',        type: 'password', autoComplete: 'new-password', minLength: 8 },
    { label: 'SİNYAL TEKRAR',    placeholder: 'Sinyali tekrar yaz',     name: 'confirmPassword', type: 'password', autoComplete: 'new-password', minLength: 8 },
  ],
  otomat: [
    { label: '::process_name',   placeholder: 'demiurge.pr',            name: 'username',        type: 'text',     autoComplete: 'username',     minLength: 3 },
    { label: '::namespace',      placeholder: 'demiurge@oto-net.gx',    name: 'email',           type: 'email',    autoComplete: 'email' },
    { label: '::token',          placeholder: 'sha256:••••••••',        name: 'password',        type: 'password', autoComplete: 'new-password', minLength: 8 },
    { label: '::token_confirm',  placeholder: 'verify token',           name: 'confirmPassword', type: 'password', autoComplete: 'new-password', minLength: 8 },
  ],
  canavar: [
    { label: 'AVCI ADI',         placeholder: 'khorvash.a',             name: 'username',        type: 'text',     autoComplete: 'username',     minLength: 3 },
    { label: 'SÜRÜ İŞARETİ',     placeholder: 'khorvash@cnv-net.gx',    name: 'email',           type: 'email',    autoComplete: 'email' },
    { label: 'KAN MÜHRÜ',        placeholder: '••••••••••',             name: 'password',        type: 'password', autoComplete: 'new-password', minLength: 8 },
    { label: 'MÜHÜR TEKRAR',     placeholder: 'Mühürü tekrar bas',      name: 'confirmPassword', type: 'password', autoComplete: 'new-password', minLength: 8 },
  ],
  seytan: [
    { label: 'PAKT İSMİ',        placeholder: 'malphas.l',              name: 'username',        type: 'text',     autoComplete: 'username',     minLength: 3 },
    { label: 'ÇAĞIRMA YOLU',     placeholder: 'malphas@syt-net.gx',     name: 'email',           type: 'email',    autoComplete: 'email' },
    { label: 'GİZLİ HECE',       placeholder: '••••••••••',             name: 'password',        type: 'password', autoComplete: 'new-password', minLength: 8 },
    { label: 'HECE TEKRAR',      placeholder: 'Heceyi tekrar fısılda',  name: 'confirmPassword', type: 'password', autoComplete: 'new-password', minLength: 8 },
  ],
};

const COPY: Record<NDRaceKey, {
  eyebrow: string;
  title: string;
  cta: string;
  policy: ReactNode;
  back: string;
}> = {
  insan:   { eyebrow: 'YENİ KOMUTAN PROTOKOLÜ',   title: 'GALAKSİYE KATIL',   cta: 'HESABI KUR',       back: 'Zaten kimliğin var mı?',           policy: <>Galaktik Anlaşma&apos;yı ve Pakt Hükümlerini okudum, kabul ediyorum. <strong style={{ color: 'var(--nd-race)' }}>Her ölüm sürümü güçlendirir.</strong></> },
  zerg:    { eyebrow: 'YENİ DAMAR FORMASYONU',    title: 'KOVANA DOĞ',         cta: 'EMBRİYOYU DOĞUR',  back: 'Zaten kovan uzantısı mısın?',     policy: <>Evrim Hükümlerini okudum, kovan bilincine katıldım. <strong style={{ color: 'var(--nd-race)' }}>Her kayıp, bir mutasyondur.</strong></> },
  otomat:  { eyebrow: '::spawn_new_process',      title: '::init self',        cta: '::commit_self',    back: '::existing_process?',              policy: <>::accepts(galactic_treaty, terms_of_compute). <strong style={{ color: 'var(--nd-race)' }}>::error == data</strong></> },
  canavar: { eyebrow: 'YENİ AVCI KAYDI',          title: 'SÜRÜYE GİR',         cta: 'KAN MÜHÜRLE',      back: 'Zaten av meydanına çıktın mı?',   policy: <>Vahşi yasayı kabul ettim. <strong style={{ color: 'var(--nd-race)' }}>Güçlü yönetir. Zayıf yenir.</strong></> },
  seytan:  { eyebrow: 'YENİ PAKT YAZIMI',         title: 'PAKTI MÜHÜRLE',      cta: 'MÜHÜRLE',          back: 'Zaten pakt yazdın mı?',           policy: <>Pakt şartlarını kabul ettim. <strong style={{ color: 'var(--nd-race)' }}>Her güç bir borçtur.</strong></> },
};

type FieldName = 'username' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

export function RegisterForm() {
  const t = useTranslations('auth.register');
  const race = useNDRace('insan');
  const copy = COPY[race.key];
  const fields = FIELD_DEFS[race.key];
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(true);
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  // Per-field errors shown directly under each input.  Used to be one
  // banner at the top — three round-trips to fix a typo'd email + short
  // password + already-registered conflict.  Now each field surfaces its
  // own error onBlur (and confirmPassword onChange so it lights up the
  // instant the player breaks the match).
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Tracks which fields have been blurred-or-attempted so errors don't
  // show on a fresh form. Submit attempt marks all fields as touched.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  function fieldError(name: FieldName, v = values): string | null {
    switch (name) {
      case 'username':
        if (v.username.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı';
        return null;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return 'Geçerli bir e-posta gir';
        return null;
      case 'password':
        if (v.password.length < 8) return 'Şifre en az 8 karakter olmalı';
        return null;
      case 'confirmPassword':
        if (v.password !== v.confirmPassword) return t('errorMismatch');
        return null;
    }
  }

  function validateAll(v = values): FieldErrors {
    const errs: FieldErrors = {};
    (['username', 'email', 'password', 'confirmPassword'] as const).forEach((name) => {
      const err = fieldError(name, v);
      if (err) errs[name] = err;
    });
    return errs;
  }

  function setField(name: FieldName, val: string) {
    setValues((v) => {
      const next = { ...v, [name]: val };
      // Re-validate confirmPassword whenever password OR confirmPassword
      // changes so the match-state updates live without waiting for blur.
      if (name === 'password' || name === 'confirmPassword') {
        setFieldErrors((errs) => {
          const cpErr = fieldError('confirmPassword', next);
          const out = { ...errs };
          if (cpErr) out.confirmPassword = cpErr;
          else delete out.confirmPassword;
          // Same for the password field itself when typing.
          if (name === 'password') {
            const pwErr = fieldError('password', next);
            if (pwErr) out.password = pwErr;
            else if (touched.password) delete out.password;
          }
          return out;
        });
      }
      return next;
    });
  }

  function handleBlur(name: FieldName) {
    setTouched((t) => ({ ...t, [name]: true }));
    setFieldErrors((errs) => {
      const err = fieldError(name);
      const out = { ...errs };
      if (err) out[name] = err;
      else delete out[name];
      return out;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // Mark every field touched so any miss gets surfaced.
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    const errs = validateAll();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!accepted) {
      setError('Pakt şartlarını kabul etmelisin');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        // Flatten class-validator's array form so the rest of the branch
        // can pattern-match a string.
        const rawMsg = Array.isArray(data.message) ? data.message.join(' · ') : data.message ?? '';
        // 409 = duplicate username/email. Surface as a field error so the
        // player knows exactly which field to fix (and that "Giriş yap"
        // is probably the next move) instead of a vague top banner.
        if (res.status === 409) {
          const msg = rawMsg.toLowerCase();
          if (msg.includes('email') || msg.includes('e-posta') || msg.includes('e-mail')) {
            setFieldErrors((errs) => ({ ...errs, email: 'Bu e-posta zaten kayıtlı — giriş yap' }));
          } else if (msg.includes('username') || msg.includes('kullanıcı')) {
            setFieldErrors((errs) => ({
              ...errs,
              username: t('errorTaken'),
            }));
          } else {
            // Server replied 409 without specifying which field — show on
            // email by default since that's the more common collision.
            setFieldErrors((errs) => ({ ...errs, email: 'Bu hesap zaten kayıtlı' }));
          }
          return;
        }
        throw new Error(translateBackendError(rawMsg || t('errorGeneric')));
      }
      const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.push('/race-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${race.glow} 0%, transparent 55%), radial-gradient(ellipse 50% 60% at 50% 100%, ${race.primaryDim} 0%, transparent 70%)`,
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.78) 0%, rgba(3,5,11,0.35) 40%, rgba(3,5,11,0.95) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="nd-slide-up"
        style={{
          position: 'relative',
          maxWidth: 440,
          margin: '0 auto',
          padding: '56px 24px 32px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Sigil race={race} size={32} glow />
          <Eyebrow color={race.primary}>NEBULA DOMINION</Eyebrow>
        </div>

        <Eyebrow color={race.primary} style={{ marginBottom: 6 }}>{copy.eyebrow}</Eyebrow>
        <H2 style={{ color: ND.text, marginBottom: 20, fontFamily: race.key === 'otomat' ? ND.mono : ND.display }}>{copy.title}</H2>

        <form onSubmit={handleSubmit} noValidate aria-label="Kayıt formu" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 4,
                fontFamily: ND.mono,
                fontSize: 12,
                background: 'color-mix(in oklch, oklch(0.65 0.22 25), transparent 84%)',
                border: '1px solid color-mix(in oklch, oklch(0.65 0.22 25), transparent 60%)',
                color: ND.danger,
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              {error}
            </div>
          )}

          {fields.map((f) => {
            const fe = touched[f.name] ? fieldErrors[f.name] : undefined;
            return (
              <div key={f.name}>
                <Eyebrow style={{ marginBottom: 6 }}>{f.label}</Eyebrow>
                <label
                  className="nd-field"
                  htmlFor={`reg-${f.name}`}
                  style={fe ? { borderColor: ND.danger, boxShadow: `0 0 0 1px ${ND.danger}55` } : undefined}
                >
                  <input
                    id={`reg-${f.name}`}
                    name={f.name}
                    type={f.type}
                    className="nd-input"
                    placeholder={f.placeholder}
                    autoComplete={f.autoComplete}
                    required
                    minLength={f.minLength}
                    value={values[f.name]}
                    onChange={(e) => setField(f.name, e.target.value)}
                    onBlur={() => handleBlur(f.name)}
                    disabled={isLoading}
                    aria-label={f.label}
                    aria-invalid={fe ? 'true' : undefined}
                    aria-describedby={fe ? `reg-${f.name}-err` : undefined}
                  />
                </label>
                {fe && (
                  <div
                    id={`reg-${f.name}-err`}
                    role="alert"
                    style={{
                      marginTop: 4,
                      color: ND.danger,
                      fontFamily: ND.mono,
                      fontSize: 10,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {fe}
                  </div>
                )}
              </div>
            );
          })}

          <Panel race={race} style={{ marginTop: 6, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <button
              type="button"
              role="checkbox"
              aria-checked={accepted}
              onClick={() => setAccepted((a) => !a)}
              style={{
                marginTop: 2,
                width: 18,
                height: 18,
                flexShrink: 0,
                background: accepted ? race.primary : 'transparent',
                border: `1px solid ${race.primary}`,
                color: accepted ? 'var(--color-bg-elevated)' : 'transparent',
                fontFamily: ND.display,
                fontSize: 12,
                fontWeight: 800,
                lineHeight: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Pakt şartlarını kabul et"
            >
              ✓
            </button>
            <Caption style={{ fontSize: 11, lineHeight: 1.5 }}>{copy.policy}</Caption>
          </Panel>

          <NDButton race={race} size="lg" type="submit" full disabled={isLoading} style={{ marginTop: 6 }}>
            {isLoading ? 'YAZILIYOR…' : copy.cta}
          </NDButton>
        </form>

        <div style={{ flex: 1 }} />

        <Caption style={{ textAlign: 'center', marginTop: 22 }}>
          {copy.back}{' '}
          <Link
            href="/login"
            style={{ color: race.primary, fontFamily: ND.display, textDecoration: 'none', letterSpacing: '0.08em' }}
          >
            {t('loginLink')} →
          </Link>
        </Caption>
      </div>
    </div>
  );
}
