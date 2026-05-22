'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useState } from 'react';
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

export function RegisterForm() {
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

  function validate() {
    if (values.username.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return 'Geçerli bir e-posta gir';
    if (values.password.length < 8) return 'Şifre en az 8 karakter olmalı';
    if (values.password !== values.confirmPassword) return 'Şifreler eşleşmiyor';
    if (!accepted) return 'Pakt şartlarını kabul etmelisin';
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
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
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? 'Kayıt başarısız. Tekrar dene.');
      }
      const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.push('/race-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: ND.bgDeep,
        color: ND.text,
        fontFamily: ND.body,
        overflow: 'hidden',
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
          minHeight: '100dvh',
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

          {fields.map((f) => (
            <div key={f.name}>
              <Eyebrow style={{ marginBottom: 6 }}>{f.label}</Eyebrow>
              <label className="nd-field" htmlFor={`reg-${f.name}`}>
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
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  disabled={isLoading}
                  aria-label={f.label}
                />
              </label>
            </div>
          ))}

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
            Giriş yap →
          </Link>
        </Caption>
      </div>
    </div>
  );
}
