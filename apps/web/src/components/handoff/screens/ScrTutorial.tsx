'use client';

/* Nebula Dominion — Onboarding tutorial (6 steps).
 *
 * Ports the screens defined in handoff `nd-screens-tutorial.jsx` (Welcome →
 * First Build → First Produce → First Attack → First Tier-Up → Complete).
 * Each screen renders against a race-aware backdrop with a bottom card
 * carrying step counter, copy, hint and ATLA / CTA controls.
 *
 * Used by `/tutorial` which threads steps via `?step=1..6`.
 */

import type { CSSProperties, ReactNode } from 'react';
import {
  Bar,
  BaseField,
  Caption,
  Code,
  Eyebrow,
  H1,
  H3,
  HUD,
  ND,
  NDButton,
  NotchSurface,
  ResIcon,
  Screen,
  Sigil,
  raceLex,
  type NDRace,
} from '@/components/handoff';

const TUT_TOTAL = 6;

/* ── Copy registry ──────────────────────────────────────────────────────── */

interface TutCopy {
  accent: string;
  title: string;
  body: string;
  cta: string;
  hint: string | null;
}

const TUT_COPY: Record<NDRace['key'], Record<number, TutCopy>> = {
  insan: {
    1: { accent: 'I. UYANIŞ',          title: 'HOŞ GELDİN KOMUTAN',     body: 'Eski Dünya öldü. Sen küllerden yeni bir başlangıç çıkaracaksın. Yıldızlar bekliyor.', cta: 'BAŞLAT',         hint: 'Federasyon seni bekler.' },
    2: { accent: 'II. İLK İNŞA',       title: 'KOMUTA ÜSSÜNÜ KUR',      body: 'Reaktör Modülü inşa et. Enerji üretmen lazım. Sağdaki "İNŞA" butonuna dokun.',     cta: 'İNŞA ET',        hint: '-200 Kredi · 60sn süre' },
    3: { accent: 'III. İLK BİRİM',     title: 'İLK MARINE\'INI EĞİT',   body: 'Kışlanda piyade üret. 4 birim ile başlıyorsun. Üretim kuyruğuna ekle.',             cta: 'EĞİT',           hint: '-80 Kredi · 24sn süre' },
    4: { accent: 'IV. İLK SALDIRI',    title: 'KOMŞU SİSTEMİ FETHET',   body: 'Galaksi haritasında işaretli düşman üssünü seç ve filonu gönder. İlk zaferin yakın.', cta: 'SALDIR',       hint: 'Zafer ihtimali %68' },
    5: { accent: 'V. İLK YÜKSELİŞ',    title: 'TIER 2 KAZANDIN',        body: 'İlk tier yükselişin tamamlandı. Yeni komutanlar ve birimler açıldı.',                cta: 'GÖSTER',         hint: '+200 XP · General Reyes açıldı' },
    6: { accent: 'TAMAMLANDI',          title: 'HAZIRSIN KOMUTAN',       body: 'Federasyon sana güveniyor. Galaksi senin yazacağın hikaye. Yıldızlar arası bir imparatorluk seni bekliyor.', cta: 'GALAKSİYE GİR', hint: null },
  },
  zerg: {
    1: { accent: 'I. KOVAN UYANDI',    title: 'HOŞ GELDİN ANA KRALİÇE', body: 'Yumurtan çatladı. Sürü senin uzantın. Galaksi asimile edilmeyi bekliyor.',           cta: 'DOĞ',            hint: 'Kovan bilinci aktif.' },
    2: { accent: 'II. İLK ORGAN',      title: 'BİYOKÜTLE HAVUZUNU BÜYÜT', body: 'Damardan beslen. Biyokütle havuzu temel kaynak organın. Sağdaki "MUTASYON" butonuna dokun.', cta: 'MUTASYON',  hint: '-200 Biyokütle · 60sn evrim' },
    3: { accent: 'III. İLK LARVA',     title: 'İLK LARVANI DOĞUR',      body: 'Larva havuzunda 4 embriyo morphla. Sürünün ilk uzantıları.',                           cta: 'DOĞUR',          hint: '-80 Biyokütle · embriyo %0→100' },
    4: { accent: 'IV. İLK ASİMİLE',    title: 'KOMŞU GEZEGENİ ASİMİLE ET', body: 'Galaksi haritasında işaretli organik dünyayı yut. Et eklendikçe sürü büyür.',         cta: 'ASİMİLE ET',     hint: 'Genom kazancı %68' },
    5: { accent: 'V. İLK EVRİM',       title: 'EVRİM AŞAMASI II',       body: 'Genom sıçraması yaptın. Yeni mutasyon türleri açıldı.',                                 cta: 'GÖSTER',         hint: '+200 Genetik · Genom Üstadı Threnix' },
    6: { accent: 'KOVAN OLGUNLAŞTI',    title: 'HAZIRSIN ANA KRALİÇE',   body: 'Sürün kozmik. Damarların yıldızlara uzanır. Evrim hâlâ başlıyor.',                     cta: 'GALAKSİYİ YUT',  hint: null },
  },
  otomat: {
    1: { accent: '::SCENE 01',          title: '::WELCOME, PRIME',       body: '::boot OK. ::archive::loaded. Your task: optimize the universe. Begin.',              cta: '::execute',      hint: '::self_define::ok' },
    2: { accent: '::STEP 02',           title: '::FIRST MODULE',         body: 'Compile your Data Bus module. Required for ::expansion. Right-side ::assemble.',     cta: '::assemble',     hint: '-200 Mineral · 60s ::compile' },
    3: { accent: '::STEP 03',           title: '::FIRST UNIT',           body: '::deploy Sentinel v1.0. 4 units in queue. ::tick 0→360.',                            cta: '::compile',      hint: '-80 Mineral · ::tick 24s' },
    4: { accent: '::STEP 04',           title: '::FIRST STRIKE',         body: '::target acquired. Hex node CORE-12 marked hostile. ::deploy fleet.',                cta: '::strike',       hint: '::win_prob 0.68' },
    5: { accent: '::STEP 05',           title: '::BUILD v2.0 SHIPPED',   body: '::tier_up successful. New units + commanders unlocked.',                              cta: '::log',          hint: '+200 Hesap · Mimar Aurelius online' },
    6: { accent: '::ONBOARDING_DONE',   title: '::PRODUCTION READY',     body: '::commit self. ::deploy to universe. The optimal solution awaits computation.',      cta: '::run_loop',     hint: null },
  },
  canavar: {
    1: { accent: 'I. VAHŞİ KAN',        title: 'HOŞ GELDİN ALFA',        body: 'Gözlerin koru. Pençelerin keskin. Galaksi avlanma alanın.',                            cta: 'UYAN',           hint: 'Ataların seni izliyor.' },
    2: { accent: 'II. İLK İN',          title: 'AV KAMPI KAZ',           body: 'Etin lazım. Sağdaki "KAZ" butonuyla av kampı kur.',                                    cta: 'KAZ',            hint: '-200 Vahşi Et · 60sn kazı' },
    3: { accent: 'III. İLK YAVRU',      title: 'İLK AVCINI BÜYÜT',       body: '4 yavru canavar yetiştir. Her av onları güçlendirir.',                                cta: 'BÜYÜT',          hint: '-80 Et · 24sn olgunlaşma' },
    4: { accent: 'IV. İLK AV',          title: 'KOMŞU SÜRÜYÜ AVLA',      body: 'Av rotanda işaretli bölgeyi yağmala. Kan al, güçlen.',                                cta: 'AVLA',           hint: 'Av başarı %68' },
    5: { accent: 'V. KAN YÜKSELDİ',     title: 'AVCI ÇAĞI II',           body: 'Kanın kutsandı. Yeni beden yükseltmeleri açıldı.',                                      cta: 'KÜKRE',          hint: '+200 Kan Özü · Şaman Ulrek katıldı' },
    6: { accent: 'SÜRÜ HAZIR',          title: 'HAZIRSIN ALFA',          body: 'Sürün kozmik. Pençen yıldız söker. Av sonsuz.',                                          cta: 'AVLANMAYA BAŞLA', hint: null },
  },
  seytan: {
    1: { accent: '· I · ZİNCİR ·',      title: 'HOŞ GELDİN LORD',        body: 'Mühürlerin kanında. Pakt seni bekler. Sürgün son buldu.',                              cta: 'GERİ DÖN',       hint: '· III RUH BORÇLU ·' },
    2: { accent: '· II · TAPINAK ·',    title: 'RUH TOPLAYICIYI KUR',    body: 'Ruh hasatın için tapınak gerek. Sağdaki "PAKT" düğmesine dokun.',                     cta: 'PAKT YAZ',       hint: '-200 Ruh Özü · 60sn ritüel' },
    3: { accent: '· III · ÇAĞRI ·',     title: 'İLK IMP\'İNİ ÇAĞIR',     body: '4 imp çağır. Pakt mühürün ilk gücü.',                                                  cta: 'ÇAĞIR',          hint: '-80 Ruh Özü · 24sn ritüel' },
    4: { accent: '· IV · PAKT BOZ ·',   title: 'KOMŞU SÜRGÜNÜ MÜHÜRLE',  body: 'Sigil haritasında işaretli ruhu bağla. Borçlu kalsın.',                              cta: 'MÜHÜRLE',        hint: 'Pakt ihtimali %68' },
    5: { accent: '· V · YÜKSELİŞ ·',    title: 'MERTEBE II MÜHÜRLENDİ',  body: 'Mührün güçlendi. Yeni paktlar ve vassallar açıldı.',                                  cta: 'GÖSTER',         hint: '+200 Karanlık Md. · Lilithra bağlandı' },
    6: { accent: '· MAHKEME HAZIR ·',   title: 'HAZIRSIN HÜKÜMDAR',      body: 'Mahkemen kuruldu. Vassalların seni bekler. Karanlık sonsuz.',                          cta: 'PAKT YAZ',       hint: null },
  },
};

export function tutCopy(raceKey: NDRace['key'], step: number): TutCopy {
  const raceMap = TUT_COPY[raceKey];
  return raceMap[step] ?? raceMap[1];
}

/* ── TutorialCard ───────────────────────────────────────────────────────── */

interface TutorialCardProps {
  race: NDRace;
  step: number;
  accent: string;
  title: string;
  body: string;
  cta: string;
  hint?: string | null;
  onSkip?: () => void;
  onAdvance?: () => void;
}

function TutorialCard({
  race, step, accent, title, body, cta, hint, onSkip, onAdvance,
}: TutorialCardProps) {
  const c = race.primary;
  const g = race.glow;
  const isFinal = step >= TUT_TOTAL;
  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 28,
      }}
    >
      {/* Step counter — rendered OUTSIDE the clipped NotchSurface so the
       *  top: -10 chip isn't clipped by the surface's clipPath. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -10,
          right: 12,
          background: c,
          color: '#0A0E1A',
          padding: '2px 8px',
          fontFamily: ND.display,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.10em',
          zIndex: 2,
        }}
      >
        ADIM {step} / {TUT_TOTAL}
      </div>
      <NotchSurface
        notch={12}
        borderColor={`${c}88`}
        background="rgba(6,8,15,0.95)"
        glow={`${g}55`}
        glowSize={24}
        padding={14}
        style={{ display: 'block', position: 'relative' }}
      >
        <Eyebrow style={{ color: c, marginBottom: 4 }}>{accent}</Eyebrow>
        <H3 style={{ color: ND.text, fontSize: 14, letterSpacing: '0.04em' }}>{title}</H3>
        <Caption style={{ color: ND.textDim, marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
          {body}
        </Caption>

        {hint && (
          <div
            style={{
              marginTop: 8,
              padding: '6px 10px',
              background: `${c}11`,
              border: `1px dashed ${c}55`,
              fontFamily: ND.mono,
              fontSize: 10,
              color: g,
              letterSpacing: '0.06em',
            }}
          >
            ⓘ {hint}
          </div>
        )}

        {/* Step progress bar */}
        <div style={{ marginTop: 10 }}>
          <Bar value={step} max={TUT_TOTAL} color={c} height={3} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {!isFinal && (
            <NDButton race={race} variant="ghost" size="md" style={{ flex: 1 }} onClick={onSkip}>
              ATLA
            </NDButton>
          )}
          <NDButton race={race} size="md" style={{ flex: isFinal ? 1 : 2 }} onClick={onAdvance}>
            {cta} ›
          </NDButton>
        </div>
      </NotchSurface>
    </div>
  );
}

/* ── HighlightRing — pulsing ring + arrow pointer ───────────────────────── */

interface HighlightRingProps {
  race: NDRace;
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
  arrow?: 'down' | 'up' | 'left' | 'right';
}

function HighlightRing({ race, x, y, w = 80, h = 40, label, arrow = 'down' }: HighlightRingProps) {
  const c = race.primary;
  const g = race.glow;
  const ring: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: w,
    height: h,
    border: `2px solid ${g}`,
    borderRadius: 6,
    boxShadow: `0 0 0 4px ${c}33, 0 0 18px ${g}aa`,
    pointerEvents: 'none',
    animation: 'nd-pulse-glow 1.6s ease-in-out infinite',
    color: g,
  };
  const arrowSvg = (() => {
    const filter = `drop-shadow(0 0 4px ${g})`;
    const sw = 2.4;
    if (arrow === 'down') {
      return (
        <svg style={{ position: 'absolute', left: x + w / 2 - 12, top: y - 32, width: 24, height: 28 }}>
          <path d="M 12 0 L 12 22 M 4 14 L 12 26 L 20 14" stroke={g} strokeWidth={sw} fill="none" style={{ filter }} />
        </svg>
      );
    }
    if (arrow === 'up') {
      return (
        <svg style={{ position: 'absolute', left: x + w / 2 - 12, top: y + h + 4, width: 24, height: 28 }}>
          <path d="M 12 26 L 12 4 M 4 12 L 12 0 L 20 12" stroke={g} strokeWidth={sw} fill="none" style={{ filter }} />
        </svg>
      );
    }
    if (arrow === 'left') {
      return (
        <svg style={{ position: 'absolute', left: x + w + 4, top: y + h / 2 - 12, width: 28, height: 24 }}>
          <path d="M 26 12 L 4 12 M 12 4 L 0 12 L 12 20" stroke={g} strokeWidth={sw} fill="none" style={{ filter }} />
        </svg>
      );
    }
    return (
      <svg style={{ position: 'absolute', left: x - 32, top: y + h / 2 - 12, width: 28, height: 24 }}>
        <path d="M 2 12 L 24 12 M 16 4 L 28 12 L 16 20" stroke={g} strokeWidth={sw} fill="none" style={{ filter }} />
      </svg>
    );
  })();
  return (
    <>
      <div aria-hidden style={ring} />
      {arrowSvg}
      {label && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y - 50,
            padding: '2px 6px',
            background: 'rgba(6,8,15,0.92)',
            border: `1px solid ${g}77`,
            fontFamily: ND.mono,
            fontSize: 9,
            color: g,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}

/* ── Shared screen wrapper ──────────────────────────────────────────────── */

interface TutorialScreenProps {
  race: NDRace;
  onSkip?: () => void;
  onAdvance?: () => void;
}

function TutorialFrame({
  race,
  step,
  onSkip,
  onAdvance,
  backdrop,
  pointer,
  hero,
}: TutorialScreenProps & {
  step: number;
  backdrop?: ReactNode;
  pointer?: ReactNode;
  hero?: ReactNode;
}) {
  const c = tutCopy(race.key, step);
  return (
    <div data-race={race.key} style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      <Screen race={race} dim={0.5} intensity={step === 1 || step === 6 ? 1.3 : 1} style={{ height: '100dvh' }}>
        {backdrop}
        {hero}
        {pointer}
        <TutorialCard
          race={race}
          step={step}
          accent={c.accent}
          title={c.title}
          body={c.body}
          cta={c.cta}
          hint={c.hint}
          onSkip={onSkip}
          onAdvance={onAdvance}
        />
      </Screen>
    </div>
  );
}

/* ── 26. Welcome ────────────────────────────────────────────────────────── */

export function ScrTutorialWelcome({ race, onSkip, onAdvance }: TutorialScreenProps) {
  const c = tutCopy(race.key, 1);
  return (
    <TutorialFrame
      race={race}
      step={1}
      onSkip={onSkip}
      onAdvance={onAdvance}
      hero={
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px 260px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: race.glow, marginBottom: 18 }} className="nd-glow">
            <Sigil race={race} size={68} glow />
          </div>
          <Eyebrow style={{ color: race.primary, marginBottom: 6, fontSize: 9, letterSpacing: '0.30em' }}>
            {c.accent} · TUTORIAL
          </Eyebrow>
          <H1 style={{ color: ND.text, fontSize: 28, letterSpacing: '0.16em', marginBottom: 14 }}>
            {c.title}
          </H1>
          <Caption style={{ color: ND.textDim, maxWidth: 280, fontSize: 13, lineHeight: 1.55 }}>
            {c.body}
          </Caption>
        </div>
      }
    />
  );
}

/* ── 27. First Build ────────────────────────────────────────────────────── */

export function ScrTutorialBuild({ race, onSkip, onAdvance }: TutorialScreenProps) {
  const c = tutCopy(race.key, 2);
  const lex = raceLex(race.key);
  // Use the same simple `hero` pattern as Welcome (step 1) instead of the
  // earlier `backdrop` overlay that combined HUD + BaseField + a dark dim
  // layer + HighlightRing. Stacking those four absolutely-positioned siblings
  // on a virtual-canvas BaseField shipped a black screen on some browsers
  // (the dark dim covered the TutorialCard before the layout settled).
  // Hero centre keeps the visual focus on what the player needs to do and
  // matches the rhythm of step 1 / step 6, which already worked.
  return (
    <TutorialFrame
      race={race}
      step={2}
      onSkip={onSkip}
      onAdvance={onAdvance}
      hero={
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px 260px',
            textAlign: 'center',
            gap: 16,
          }}
        >
          {/* Pulsing icon — replaces the iso-plane HighlightRing pointer */}
          <div
            aria-hidden
            style={{
              width: 88,
              height: 88,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${race.glow}`,
              borderRadius: 12,
              boxShadow: `0 0 0 6px ${race.primary}22, 0 0 24px ${race.glow}aa`,
              animation: 'nd-pulse-glow 1.6s ease-in-out infinite',
              color: race.glow,
              fontFamily: ND.display,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}
          >
            {lex.quickActions[0]?.label ?? lex.actionVerb}
          </div>

          <Eyebrow style={{ color: race.primary, fontSize: 9, letterSpacing: '0.30em' }}>
            {c.accent}
          </Eyebrow>
          <H1 style={{ color: ND.text, fontSize: 22, letterSpacing: '0.14em' }}>
            {c.title}
          </H1>
          <Caption style={{ color: ND.textDim, maxWidth: 300, fontSize: 13, lineHeight: 1.5 }}>
            {c.body}
          </Caption>
        </div>
      }
    />
  );
}

/* ── 28. First Produce ──────────────────────────────────────────────────── */

export function ScrTutorialProduce({ race, onSkip, onAdvance }: TutorialScreenProps) {
  const lex = raceLex(race.key);
  return (
    <TutorialFrame
      race={race}
      step={3}
      onSkip={onSkip}
      onAdvance={onAdvance}
      backdrop={
        <>
          <HUD race={race} level={1} levelName="UYANIŞ" resA="80" resB="0" crystal="3" />
          <div
            style={{
              padding: '12px 14px 0',
              display: 'flex',
              justifyContent: 'space-between',
              opacity: 0.7,
            }}
          >
            <H3 style={{ color: ND.text }}>{lex.productionName}</H3>
            <Code style={{ color: race.primary }}>0 / 5 SLOT</Code>
          </div>
          <div
            style={{
              padding: '10px 14px',
              opacity: 0.55,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                padding: 10,
                border: `1px dashed ${race.primary}66`,
                background: 'rgba(8,12,26,0.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Code style={{ color: race.primary }}>
                  {race.units[0].n} ×4
                </Code>
                <Code style={{ color: ND.textDim }}>00:24</Code>
              </div>
              <div style={{ marginTop: 6 }}>
                <Bar value={0} max={100} color={race.primary} height={4} />
              </div>
            </div>
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 60,
              left: 0,
              right: 0,
              bottom: 250,
              background: 'rgba(3,5,11,0.55)',
              pointerEvents: 'none',
            }}
          />
        </>
      }
      pointer={
        <HighlightRing race={race} x={20} y={130} w={350} h={120} label="ÜRETIM" arrow="up" />
      }
    />
  );
}

/* ── 29. First Attack ───────────────────────────────────────────────────── */

export function ScrTutorialAttack({ race, onSkip, onAdvance }: TutorialScreenProps) {
  return (
    <TutorialFrame
      race={race}
      step={4}
      onSkip={onSkip}
      onAdvance={onAdvance}
      backdrop={
        <>
          <HUD race={race} level={1} levelName="UYANIŞ" resA="120" resB="0" crystal="5" />
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden', opacity: 0.75 }}>
            <GalaxyMiniMap race={race} />
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 60,
              left: 0,
              right: 0,
              bottom: 240,
              background: 'rgba(3,5,11,0.45)',
              pointerEvents: 'none',
            }}
          />
        </>
      }
      pointer={
        <HighlightRing race={race} x={180} y={170} w={64} h={64} label="HEDEF" arrow="up" />
      }
    />
  );
}

/* Lightweight inline galaxy backdrop — small set of star nodes that does not
 * require porting RaceGalaxyVision. Sufficient for the tutorial pointer beat. */
function GalaxyMiniMap({ race }: { race: NDRace }) {
  const c = race.primary;
  const stars = [
    { x: 78, y: 180, r: 5, label: 'ORIGO-3' },
    { x: 145, y: 210, r: 6, label: race.capitalBase },
    { x: 212, y: 200, r: 9, label: 'HEDEF', enemy: true },
    { x: 280, y: 200, r: 6, label: 'TEMPLE-2' },
    { x: 105, y: 290, r: 5, label: 'ARK-5' },
  ];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 390 460"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <defs>
        <radialGradient id="galaxy-bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor={c} stopOpacity="0.16" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="390" height="460" fill="url(#galaxy-bg)" />
      {stars.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.r + 6} fill="none" stroke={s.enemy ? 'oklch(0.65 0.22 25)' : c} strokeWidth="0.6" opacity="0.4" />
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.enemy ? 'oklch(0.65 0.22 25)' : c} />
          <text x={s.x + s.r + 4} y={s.y + 3} fontFamily="var(--font-nd-mono, monospace)" fontSize="8" fill={s.enemy ? 'oklch(0.65 0.22 25)' : c} letterSpacing="0.08em">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── 30. First Tier-Up ──────────────────────────────────────────────────── */

export function ScrTutorialTierUp({ race, onSkip, onAdvance }: TutorialScreenProps) {
  const c = race.primary;
  return (
    <TutorialFrame
      race={race}
      step={5}
      onSkip={onSkip}
      onAdvance={onAdvance}
      hero={
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '70px 22px 260px',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ color: race.glow, marginBottom: 18 }} className="nd-glow">
            <Sigil race={race} size={84} glow />
          </div>
          <Eyebrow style={{ color: c, marginBottom: 6, fontSize: 9, letterSpacing: '0.30em' }}>
            ÇAĞ I → ÇAĞ II
          </Eyebrow>
          <H1
            style={{
              color: c,
              fontSize: 32,
              letterSpacing: '0.20em',
              marginBottom: 10,
              textShadow: `0 0 14px ${race.glow}aa`,
            }}
          >
            FİLİZ
          </H1>
          <Caption style={{ color: ND.textDim, maxWidth: 260, fontSize: 12, lineHeight: 1.5 }}>
            {raceLex(race.key).levelLabel} ödülleri açıldı.
          </Caption>
        </div>
      }
    />
  );
}

/* ── 31. Complete ───────────────────────────────────────────────────────── */

export function ScrTutorialComplete({ race, onSkip, onAdvance }: TutorialScreenProps) {
  const c = tutCopy(race.key, 6);
  const rewards = [
    { i: race.resourceA.icon, n: race.resourceA.name, v: '+500' },
    { i: 'crystal' as const,   n: 'Kozmik Kristal',    v: '+25'  },
    { i: 'energy' as const,    n: 'XP',                v: '+200' },
  ];
  return (
    <TutorialFrame
      race={race}
      step={6}
      onSkip={onSkip}
      onAdvance={onAdvance}
      hero={
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px 280px',
            textAlign: 'center',
          }}
        >
          <div style={{ color: race.glow, marginBottom: 16 }} className="nd-glow">
            <Sigil race={race} size={72} glow />
          </div>
          <Eyebrow
            style={{
              color: race.primary,
              marginBottom: 6,
              fontSize: 9,
              letterSpacing: '0.30em',
            }}
          >
            {c.accent}
          </Eyebrow>
          <H1
            style={{
              color: race.primary,
              fontSize: 28,
              letterSpacing: '0.18em',
              marginBottom: 6,
              textShadow: `0 0 14px ${race.glow}aa`,
            }}
          >
            {c.title}
          </H1>
          <Caption
            style={{
              color: ND.textDim,
              maxWidth: 280,
              fontSize: 13,
              lineHeight: 1.55,
              marginBottom: 18,
            }}
          >
            {c.body}
          </Caption>

          <Eyebrow style={{ color: race.primary, marginBottom: 8 }}>
            BAŞLANGIÇ HEDİYESİ
          </Eyebrow>
          <div style={{ display: 'flex', gap: 6 }}>
            {rewards.map((r, i) => (
              <NotchSurface
                key={i}
                notch={6}
                borderColor={`${race.primary}66`}
                background="rgba(8,12,26,0.72)"
                padding={8}
                innerStyle={{ textAlign: 'center', minWidth: 86 }}
              >
                <div style={{ color: race.primary }}>
                  <ResIcon kind={r.i} size={18} color={race.primary} />
                </div>
                <div
                  style={{
                    fontFamily: ND.mono,
                    fontSize: 12,
                    color: ND.text,
                    marginTop: 2,
                  }}
                >
                  {r.v}
                </div>
                <Code style={{ fontSize: 8 }}>{r.n}</Code>
              </NotchSurface>
            ))}
          </div>
        </div>
      }
    />
  );
}

export const TUTORIAL_STEPS = TUT_TOTAL;
