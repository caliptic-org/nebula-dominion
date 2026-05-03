'use client';

import { useEffect, useRef, useState } from 'react';
import { Race, RACE_DESCRIPTIONS, DEMO_UNITS, UNIT_DISPLAY_NAMES } from '@/types/units';

interface RacePreviewModalProps {
  race: Race;
  onClose: () => void;
  onPick: (race: Race) => void;
}

const PREVIEW_DURATION_MS = 5000;

interface PreviewBeat {
  label: string;
  caption: string;
}

const PREVIEW_BEATS: Record<Race, PreviewBeat[]> = {
  [Race.INSAN]: [
    { label: 'Komutan', caption: 'Komutan Voss üs köprüsünden bölgeyi tarıyor.' },
    { label: 'Birim', caption: 'Marines + Medic karma takım baskına çıkıyor.' },
    { label: 'Üs', caption: 'Modüler askeri üs — Siege Tank hattı kuşatma alıyor.' },
  ],
  [Race.ZERG]: [
    { label: 'Komutan', caption: 'Vex Thara biyolüminesan dokuların içinden uyanıyor.' },
    { label: 'Birim', caption: 'Zergling sürüsü düşman hattına dalıyor.' },
    { label: 'Üs', caption: 'Yaşayan üs — Queen larva kuluçkasını başlatıyor.' },
  ],
  [Race.OTOMAT]: [
    { label: 'Komutan', caption: 'Demiurge Prime holografik harita üzerinde komut veriyor.' },
    { label: 'Birim', caption: 'Geometrik mekanik birimler senkronize ilerliyor.' },
    { label: 'Üs', caption: 'Kristal-mavi enerji üssünden yapay zeka çekirdeği yükseliyor.' },
  ],
  [Race.CANAVAR]: [
    { label: 'Komutan', caption: 'Khorvash kadim taş tahtından savaşa hazırlanıyor.' },
    { label: 'Birim', caption: 'Ravager sürüsü lav akıntısından yükseliyor.' },
    { label: 'Üs', caption: 'Atalar mağarasından primitif öfke yayılıyor.' },
  ],
  [Race.SEYTAN]: [
    { label: 'Komutan', caption: 'Malphas lanet enerjisini portal üzerinden topluyor.' },
    { label: 'Birim', caption: 'Shade gölgeler arasında hızla ilerliyor.' },
    { label: 'Üs', caption: 'Karanlık mahkeme dumana bürünüyor.' },
  ],
};

export function RacePreviewModal({ race, onClose, onPick }: RacePreviewModalProps) {
  const desc = RACE_DESCRIPTIONS[race];
  const beats = PREVIEW_BEATS[race];
  const units = DEMO_UNITS[race];
  const [elapsed, setElapsed] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      const next = Date.now() - startedAtRef.current;
      setElapsed(next);
      if (next >= PREVIEW_DURATION_MS) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, [race]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      audioNodesRef.current?.stop();
      audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  const startAudio = () => {
    if (audioEnabled) {
      audioNodesRef.current?.stop();
      audioNodesRef.current = null;
      setAudioEnabled(false);
      return;
    }
    try {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = audioCtxRef.current ?? new Ctor();
      audioCtxRef.current = ctx;
      const nodes = playRaceTheme(ctx, race);
      audioNodesRef.current = nodes;
      setAudioEnabled(true);
    } catch {
      // Audio unavailable — silently no-op.
    }
  };

  const progress = Math.min(1, elapsed / PREVIEW_DURATION_MS);
  const beatIndex = Math.min(beats.length - 1, Math.floor(progress * beats.length));
  const currentBeat = beats[beatIndex];
  const finished = progress >= 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${desc.name} önizleme`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7, 9, 15, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-diagonal-panel modal-diagonal-panel-race"
        style={{
          width: '100%',
          maxWidth: 640,
          padding: 24,
          '--color-race': desc.color,
          '--color-race-glow': desc.glowColor,
        } as React.CSSProperties}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 20,
            cursor: 'pointer',
            padding: 4,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{desc.icon}</span>
          <div>
            <h3 style={{ margin: 0, color: desc.color, fontSize: 22, fontWeight: 800 }}>
              {desc.name}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
              {desc.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={startAudio}
            style={{
              marginLeft: 'auto',
              background: audioEnabled ? desc.color : 'transparent',
              border: `1px solid ${desc.color}`,
              color: audioEnabled ? '#000' : desc.color,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
            aria-pressed={audioEnabled}
          >
            {audioEnabled ? '♪ Müzik açık' : '♪ Müzik önizle'}
          </button>
        </div>

        {/* Footage stage (5s placeholder visual) */}
        <div
          style={{
            position: 'relative',
            aspectRatio: '16 / 9',
            borderRadius: 12,
            overflow: 'hidden',
            background: `radial-gradient(ellipse at center, ${desc.color}25 0%, #000 70%)`,
            border: `1px solid ${desc.color}30`,
            marginBottom: 16,
          }}
        >
          <PreviewStage race={race} elapsed={elapsed} />

          {/* Progress + caption overlay */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '14px 16px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 4,
                marginBottom: 8,
              }}
            >
              {beats.map((_, i) => {
                const segStart = i / beats.length;
                const segEnd = (i + 1) / beats.length;
                const fill = Math.max(0, Math.min(1, (progress - segStart) / (segEnd - segStart)));
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${fill * 100}%`,
                        height: '100%',
                        background: desc.color,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: desc.color,
                }}
              >
                {currentBeat.label}
              </span>
              <span style={{ fontSize: 12, color: '#ddd' }}>{currentBeat.caption}</span>
            </div>
          </div>
        </div>

        {/* Demo unit chips */}
        {units.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Karşılaşacağın birimler
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {units.map((u) => (
                <span
                  key={u.id}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: `${desc.color}15`,
                    border: `1px solid ${desc.color}40`,
                    color: desc.color,
                  }}
                >
                  {UNIT_DISPLAY_NAMES[u.type]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={() => onPick(race)}
            style={{
              background: desc.color,
              border: 'none',
              color: '#000',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 0 16px ${desc.color}40`,
            }}
          >
            {finished ? `${desc.name} ile devam et` : `Bu ırkı seç`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewStage({ race, elapsed }: { race: Race; elapsed: number }) {
  const desc = RACE_DESCRIPTIONS[race];
  const t = elapsed / 1000;

  if (race === Race.ZERG) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 60%, ${desc.color}40 0%, transparent 60%)`,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 14 }).map((_, i) => {
          const phase = (i / 14) * Math.PI * 2 + t;
          const left = 50 + Math.sin(phase * 1.3 + i) * 38;
          const top = 50 + Math.cos(phase * 0.9 + i * 0.4) * 28;
          const size = 6 + (i % 4);
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                borderRadius: '50%',
                background: desc.color,
                opacity: 0.7,
                boxShadow: `0 0 12px ${desc.color}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}
      </div>
    );
  }

  if (race === Race.OTOMAT) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${desc.color}20, transparent 60%)`,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * 360 + t * 25;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 90 + i * 14,
                height: 90 + i * 14,
                marginLeft: -(90 + i * 14) / 2,
                marginTop: -(90 + i * 14) / 2,
                borderRadius: 4,
                border: `1px solid ${desc.color}${i % 2 === 0 ? '60' : '30'}`,
                transform: `rotate(${angle}deg)`,
                opacity: 0.7,
              }}
            />
          );
        })}
      </div>
    );
  }

  // HUMAN — military scan grid
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          `linear-gradient(${desc.color}25 1px, transparent 1px), linear-gradient(90deg, ${desc.color}25 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 220,
          height: 220,
          marginLeft: -110,
          marginTop: -110,
          borderRadius: '50%',
          border: `1px solid ${desc.color}80`,
          background: `radial-gradient(circle at center, ${desc.color}30 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 220,
          height: 2,
          background: `linear-gradient(to right, ${desc.color}, transparent)`,
          transformOrigin: 'left center',
          transform: `rotate(${t * 90}deg)`,
        }}
      />
    </div>
  );
}

interface RaceAudioProfile {
  freqs: number[];
  type: OscillatorType;
  gain: number;
}

const RACE_AUDIO: Record<Race, RaceAudioProfile> = {
  [Race.INSAN]: { freqs: [196, 246.94, 293.66], type: 'sine', gain: 0.04 },
  [Race.ZERG]: { freqs: [110, 138.59, 164.81, 207.65], type: 'sawtooth', gain: 0.025 },
  [Race.OTOMAT]: { freqs: [261.63, 392, 523.25], type: 'square', gain: 0.02 },
  [Race.CANAVAR]: { freqs: [82.41, 110, 130.81], type: 'sawtooth', gain: 0.035 },
  [Race.SEYTAN]: { freqs: [220, 277.18, 329.63], type: 'triangle', gain: 0.03 },
};

function playRaceTheme(ctx: AudioContext, race: Race): { stop: () => void } {
  const profile = RACE_AUDIO[race];
  const master = ctx.createGain();
  master.gain.value = profile.gain;
  master.connect(ctx.destination);

  const oscillators: OscillatorNode[] = profile.freqs.map((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = profile.type;
    osc.frequency.value = f;
    const detune = ctx.createGain();
    detune.gain.value = 1 / (i + 1);
    osc.connect(detune);
    detune.connect(master);
    osc.start();
    return osc;
  });

  return {
    stop: () => {
      try {
        oscillators.forEach((o) => o.stop());
      } catch {
        // already stopped
      }
    },
  };
}
