'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Caption,
  Code,
  Eyebrow,
  H2,
  ND,
  NDButton,
  Panel,
  RACES,
  Sigil,
  type NDRace,
  type NDRaceKey,
} from '@/components/handoff';
import { RACE_BY_ID, type RaceId } from '../race-select/races';

const RACE_KEYS: readonly NDRaceKey[] = ['insan', 'zerg', 'otomat', 'canavar', 'seytan'];

const NARRATOR_LABEL: Record<NDRaceKey, string> = {
  insan:   '— ANLATICI',
  zerg:    '— KOVAN BİLİNCİ',
  otomat:  '::LOG-NARRATOR.v1',
  canavar: '— ATALARIN SESİ',
  seytan:  '· KARANLIK FISILTI ·',
};

const AWAKENING_HEADER: Record<NDRaceKey, { eyebrow: string; title: string }> = {
  insan:   { eyebrow: 'SAHNE I · KOLONY İNİŞ',           title: 'İNSANLAR İÇİN UYANIŞ' },
  zerg:    { eyebrow: 'SAHNE I · YUMURTA ÇATLAR',        title: 'KOVAN UYANIYOR' },
  otomat:  { eyebrow: '::SCENE 01 · FIRST BOOT',         title: 'DEMIURGE PRIME AKTİF' },
  canavar: { eyebrow: 'SAHNE I · İLK AV',                title: 'VAHŞİ KAN UYANIR' },
  seytan:  { eyebrow: '· SAHNE I · ZİNCİR KIRILIR ·',    title: 'SÜRGÜN DÖNÜYOR' },
};

const FINISH_CTA: Record<NDRaceKey, string> = {
  insan:   'EVRENE GİR',
  zerg:    "KOVAN'A KATIL",
  otomat:  '::initialize',
  canavar: 'AV BAŞLAT',
  seytan:  'PAKT YAZ',
};

function readCommittedRaceKey(): NDRaceKey | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('nebula:race-commitment:v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { race?: string };
    if (parsed?.race && (RACE_KEYS as readonly string[]).includes(parsed.race)) {
      return parsed.race as NDRaceKey;
    }
    return null;
  } catch {
    return null;
  }
}

function buildScenes(race: NDRace): string[] {
  return [
    race.storyAct1,
    race.storyAct2,
    `"Beş ırk uyandı. Sen ${race.name} olarak yazılıyorsun. ${race.motto}."`,
    `"İlk üssün: ${race.capitalBase}. ${race.capitalDescription}."`,
    `"Sezonun hedefi: ${race.seasonGoal}. Hazırsan, evrene gir."`,
  ];
}

export function RaceConfirmClient() {
  const router = useRouter();
  const search = useSearchParams();
  const queryRace = search.get('race');

  const [resolvedKey, setResolvedKey] = useState<NDRaceKey>(() => {
    if (queryRace && (RACE_KEYS as readonly string[]).includes(queryRace)) {
      return queryRace as NDRaceKey;
    }
    return 'insan';
  });

  useEffect(() => {
    if (queryRace && (RACE_KEYS as readonly string[]).includes(queryRace)) return;
    const committed = readCommittedRaceKey();
    if (committed) setResolvedKey(committed);
  }, [queryRace]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-race', resolvedKey);
    }
  }, [resolvedKey]);

  const race = RACES[resolvedKey];
  const header = AWAKENING_HEADER[resolvedKey];
  const scenes = useMemo(() => buildScenes(race), [race]);
  const portrait = RACE_BY_ID[resolvedKey as RaceId]?.primaryPortrait;

  const [sceneIndex, setSceneIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const isFinalScene = sceneIndex >= scenes.length - 1;
  const finish = () => router.push(`/?race=${resolvedKey}`);
  const next = () => {
    if (isFinalScene) finish();
    else setSceneIndex((i) => Math.min(i + 1, scenes.length - 1));
  };

  return (
    <div
      data-race={resolvedKey}
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
          background: `
            radial-gradient(ellipse 90% 60% at 50% 0%, ${race.glow} 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 50% 100%, ${race.primaryDim} 0%, transparent 65%)
          `,
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(3,5,11,0.55) 0%, rgba(3,5,11,0.15) 35%, rgba(3,5,11,0.96) 100%)',
          pointerEvents: 'none',
        }}
      />

      <main
        className="nd-slide-up"
        style={{
          position: 'relative',
          maxWidth: 480,
          margin: '0 auto',
          padding: '48px 22px 28px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Sigil race={race} size={36} glow />
          <div>
            <Eyebrow color={race.primary}>{header.eyebrow}</Eyebrow>
            <H2
              style={{
                color: ND.text,
                marginTop: 2,
                fontSize: 22,
                fontFamily: race.key === 'otomat' ? ND.mono : ND.display,
              }}
            >
              {header.title}
            </H2>
          </div>
        </div>

        {/* Race awakening art */}
        <div
          className="nd-notch"
          style={{
            ['--nd-notch' as string]: '14px',
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            marginBottom: 16,
            background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${race.glow} 0%, transparent 65%), rgba(8, 12, 26, 0.6)`,
            border: `1px solid color-mix(in oklch, ${race.primary}, transparent 72%)`,
            overflow: 'hidden',
          }}
        >
          {portrait && !imgError ? (
            <Image
              src={portrait}
              alt={`${race.name} uyanış portresi`}
              fill
              priority
              sizes="(max-width: 480px) 92vw, 480px"
              className="object-contain object-bottom"
              style={{ filter: `drop-shadow(0 0 32px ${race.glow})` }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sigil race={race} size={140} glow />
            </div>
          )}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 10,
              left: 12,
              fontFamily: ND.mono,
              fontSize: 9,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: race.primary,
            }}
          >
            ◈ {race.short}-{(RACE_KEYS.indexOf(resolvedKey) + 1).toString().padStart(2, '0')}
          </div>
        </div>

        <Panel
          aria-live="polite"
          style={{ padding: 14 }}
        >
          <Caption style={{ color: ND.text, lineHeight: 1.6, fontSize: 13, minHeight: 84 }}>
            {scenes[sceneIndex]}
          </Caption>
          <div style={{ height: 1, background: ND.border, margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Code style={{ color: race.primary }}>{NARRATOR_LABEL[resolvedKey]}</Code>
            <Code>{sceneIndex + 1} / {scenes.length}</Code>
          </div>
        </Panel>

        <div style={{ flex: 1, minHeight: 12 }} />

        <div
          aria-hidden
          style={{ display: 'flex', gap: 6, marginTop: 18, marginBottom: 14 }}
        >
          {scenes.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                background: i <= sceneIndex ? race.primary : ND.border,
                boxShadow: i === sceneIndex ? `0 0 8px ${race.glow}` : 'none',
                transition: 'background 300ms, box-shadow 300ms',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <NDButton race={race} variant="ghost" size="md" onClick={finish} style={{ flex: 1 }}>
            ATLA
          </NDButton>
          <NDButton race={race} size="md" onClick={next} style={{ flex: 2 }}>
            {isFinalScene ? FINISH_CTA[resolvedKey] : 'DEVAM ›'}
          </NDButton>
        </div>
      </main>
    </div>
  );
}
