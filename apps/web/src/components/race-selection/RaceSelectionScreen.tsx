'use client';

import { useEffect, useRef, useState } from 'react';
import { Race, RACE_DESCRIPTIONS, RaceDescription } from '@/types/units';
import { RaceQuiz } from './RaceQuiz';
import { RacePreviewModal } from './RacePreviewModal';
import { formatCountdown, useRaceCommitment } from './useRaceCommitment';
import { emitRaceSelectionEvent } from './telemetry';

type SelectionMode = 'show_all' | 'pick_for_me';

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-display text-[10px] uppercase tracking-widest text-text-muted">{label}</span>
        <span className="font-display text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-white/06 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  );
}

interface RaceCardProps {
  race: Race;
  desc: RaceDescription;
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function RaceCard({ race, desc, selected, recommended, onSelect, onPreview }: RaceCardProps) {
  const [hovered, setHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    background: selected ? desc.bgColor : 'rgba(255,255,255,0.03)',
    border: `2px solid ${selected ? desc.color : hovered ? `${desc.color}60` : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 16,
    padding: '28px 24px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    transform: hovered || selected ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: selected
      ? `0 0 24px ${desc.color}40, 0 8px 32px rgba(0,0,0,0.4)`
      : hovered
      ? `0 8px 24px rgba(0,0,0,0.3), 0 0 12px ${desc.color}20`
      : '0 4px 12px rgba(0,0,0,0.2)',
    flex: '1 1 280px',
    minWidth: 260,
    maxWidth: 340,
  };

  return (
    <div
      style={baseStyle}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={selected}
    >
      {/* Recommended ribbon */}
      {recommended && !selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'var(--color-energy)',
            color: '#000',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          ★ Önerilen
        </div>
      )}

      {/* Selected badge */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: desc.color,
            color: '#000',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Seçildi
        </div>
      )}

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: recommended && !selected ? 18 : 0 }}>
        <span
          style={{
            fontSize: 42,
            lineHeight: 1,
            filter: selected ? 'drop-shadow(0 0 8px currentColor)' : 'none',
          }}
        >
          {desc.icon}
        </span>
        <div>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: desc.color }}>
            {desc.name}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: '#888', marginTop: 2 }}>{desc.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: '#bbb',
          lineHeight: 1.6,
          marginBottom: 20,
          minHeight: 60,
        }}
      >
        {desc.description}
      </p>

      {/* Stats Bars */}
      <div style={{ marginBottom: 20 }}>
        <StatBar label="Saldırı" value={desc.stats.attack} color={desc.color} />
        <StatBar label="Savunma" value={desc.stats.defense} color={desc.color} />
        <StatBar label="Hız" value={desc.stats.speed} color={desc.color} />
        <StatBar label="Can" value={desc.stats.hp} color={desc.color} />
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: `${desc.color}18`,
            border: `1px solid ${desc.color}40`,
            borderRadius: 20,
            fontSize: 11,
            color: desc.color,
            fontWeight: 600,
          }}
        >
          {race.toUpperCase()}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: `1px solid ${desc.color}60`,
            color: desc.color,
            padding: '5px 12px',
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
          aria-label={`${desc.name} önizle`}
        >
          ▶ 5sn önizle
        </button>
      </div>
    </div>
  );
}

interface RaceSelectionScreenProps {
  selectedRace: Race | null;
  onSelect: (race: Race) => void;
  onConfirm?: (race: Race) => void;
}

export function RaceSelectionScreen({ selectedRace, onSelect }: RaceSelectionScreenProps) {
  const commitment = useRaceCommitment();
  const [mode, setMode] = useState<SelectionMode>(() =>
    commitment.committed ? 'show_all' : 'pick_for_me',
  );
  const [previewRace, setPreviewRace] = useState<Race | null>(null);
  const [recommended, setRecommended] = useState<Race | null>(null);
  const [confirmReroll, setConfirmReroll] = useState<Race | null>(null);
  const screenStartedAtRef = useRef<number>(Date.now());
  const expirationEmittedRef = useRef(false);

  useEffect(() => {
    screenStartedAtRef.current = Date.now();
    emitRaceSelectionEvent({ type: 'screen_viewed', mode });
    // Re-emit only on mount; mode-change is tracked separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      commitment.committed &&
      !commitment.rerollAvailable &&
      !commitment.rerollUsed &&
      !expirationEmittedRef.current
    ) {
      expirationEmittedRef.current = true;
      emitRaceSelectionEvent({ type: 'reroll_window_expired' });
    }
  }, [commitment.committed, commitment.rerollAvailable, commitment.rerollUsed]);

  const handleModeChange = (next: SelectionMode) => {
    if (next === mode) return;
    setMode(next);
    emitRaceSelectionEvent({ type: 'mode_changed', mode: next });
  };

  const finalize = (race: Race, via: 'card' | 'quiz' | 'reroll') => {
    onSelect(race);
    if (via === 'reroll') {
      const ok = commitment.reroll(race);
      if (!ok) return;
      emitRaceSelectionEvent({
        type: 'reroll_used',
        from: commitment.committed ?? '',
        to: race,
        remainingMs: commitment.remainingMs,
      });
    } else {
      if (!commitment.committed) commitment.commit(race);
      emitRaceSelectionEvent({
        type: 'race_selected',
        race,
        via,
        timeOnScreenMs: Date.now() - screenStartedAtRef.current,
      });
    }
  };

  const handleCardSelect = (race: Race) => {
    if (commitment.committed && commitment.committed !== race) {
      if (commitment.rerollAvailable) {
        setConfirmReroll(race);
        return;
      }
      // Window expired; nothing to do.
      return;
    }
    finalize(race, 'card');
  };

  const handleQuizPick = (race: Race) => {
    setRecommended(race);
    setMode('show_all');
    emitRaceSelectionEvent({ type: 'mode_changed', mode: 'show_all' });
    if (commitment.committed && commitment.committed !== race) {
      if (commitment.rerollAvailable) {
        setConfirmReroll(race);
        return;
      }
      return;
    }
    finalize(race, 'quiz');
  };

  const openPreview = (race: Race) => {
    setPreviewRace(race);
    emitRaceSelectionEvent({ type: 'preview_opened', race });
  };

  const closePreview = () => setPreviewRace(null);

  const previewPick = (race: Race) => {
    closePreview();
    if (commitment.committed && commitment.committed !== race) {
      if (commitment.rerollAvailable) {
        setConfirmReroll(race);
        return;
      }
      return;
    }
    finalize(race, 'card');
  };

  return (
    <div
      className="min-h-[100dvh] relative overflow-hidden flex flex-col"
      style={{ background: 'var(--color-bg)' }}
      data-race={activeDesc.dataRace}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 900,
            margin: 0,
            background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Irk Seçimi
        </h2>
        <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
          Savaş stilinizi belirleyin — her ırkın benzersiz güçlü yanları var.
        </p>
      </div>

      {/* Re-roll banner */}
      {commitment.committed && (
        <RerollBanner
          committed={commitment.committed}
          rerollAvailable={commitment.rerollAvailable}
          rerollUsed={commitment.rerollUsed}
          remainingMs={commitment.remainingMs}
        />
      )}

      {/* Mode toggle */}
      <ModeToggle mode={mode} onChange={handleModeChange} />

      {mode === 'pick_for_me' ? (
        <RaceQuiz onPick={handleQuizPick} onShowAll={() => handleModeChange('show_all')} />
      ) : (
        <>
          {/* Race Cards */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            {(Object.values(Race) as Race[]).map((race) => (
              <RaceCard
                key={race}
                race={race}
                desc={RACE_DESCRIPTIONS[race]}
                selected={selectedRace === race}
                recommended={recommended === race}
                onSelect={() => handleCardSelect(race)}
                onPreview={() => openPreview(race)}
              />
            ))}
          </div>

          {/* Confirm section */}
          {selectedRace && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '12px 32px',
                  background: RACE_DESCRIPTIONS[selectedRace].color,
                  color: '#000',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  boxShadow: `0 4px 20px ${RACE_DESCRIPTIONS[selectedRace].color}50`,
                  cursor: 'default',
                }}
              >
                {RACE_DESCRIPTIONS[selectedRace].icon} {RACE_DESCRIPTIONS[selectedRace].name} Seçildi
              </div>
              <p style={{ color: '#555', fontSize: 12, marginTop: 10 }}>
                Birimler sekmesinden birliklerinizi görüntüleyebilirsiniz.
              </p>
            </div>
          )}
        </>
      )}

      {previewRace && (
        <RacePreviewModal race={previewRace} onClose={closePreview} onPick={previewPick} />
      )}

      {confirmReroll && commitment.committed && (
        <RerollConfirmModal
          fromRace={commitment.committed}
          toRace={confirmReroll}
          remainingMs={commitment.remainingMs}
          onCancel={() => setConfirmReroll(null)}
          onConfirm={() => {
            const target = confirmReroll;
            setConfirmReroll(null);
            finalize(target, 'reroll');
          }}
        />
      )}
    </div>
  );
}

interface ModeToggleProps {
  mode: SelectionMode;
  onChange: (mode: SelectionMode) => void;
}

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const options: { id: SelectionMode; label: string; hint: string }[] = [
    { id: 'pick_for_me', label: 'Benim için seç', hint: '4 hızlı soru' },
    { id: 'show_all', label: 'Hepsini göster', hint: 'Karşılaştır' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Irk seçim modu"
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        margin: '0 auto 28px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
        borderRadius: 999,
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {options.map((opt) => {
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--color-brand)' : 'transparent',
              color: active ? '#0a0a14' : 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: active ? 800 : 600,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{opt.label}</span>
            <span
              style={{
                fontSize: 10,
                opacity: 0.75,
                fontWeight: 500,
              }}
            >
              · {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface RerollBannerProps {
  committed: Race;
  rerollAvailable: boolean;
  rerollUsed: boolean;
  remainingMs: number;
}

function RerollBanner({ committed, rerollAvailable, rerollUsed, remainingMs }: RerollBannerProps) {
  const desc = RACE_DESCRIPTIONS[committed];

  let body: React.ReactNode;
  let accent = 'var(--color-brand)';

  if (rerollUsed) {
    body = (
      <>
        <strong style={{ color: 'var(--color-text-primary)' }}>{desc.name}</strong> ile
        ilerliyorsun. Ücretsiz ırk değişimi haklarını kullandın — başka değişim için destekle iletişime geç.
      </>
    );
    accent = 'var(--color-text-muted)';
  } else if (rerollAvailable) {
    accent = 'var(--color-energy)';
    body = (
      <>
        İlk 24 saatte <strong style={{ color: 'var(--color-energy)' }}>1 kez ücretsiz</strong> ırk
        değişimi yapabilirsin. Üs ve kaynaklar korunur. Kalan süre:{' '}
        <strong style={{ color: 'var(--color-energy)', fontVariantNumeric: 'tabular-nums' }}>
          {formatCountdown(remainingMs)}
        </strong>
      </>
    );
  } else {
    body = (
      <>
        <strong style={{ color: 'var(--color-text-primary)' }}>{desc.name}</strong> seçimin kalıcı.
        24 saatlik ücretsiz değişim penceresi sona erdi.
      </>
    );
    accent = 'var(--color-text-muted)';
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto 24px',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent}40`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
      }}
      role="status"
    >
      {body}
    </div>
  );
}

interface RerollConfirmModalProps {
  fromRace: Race;
  toRace: Race;
  remainingMs: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function RerollConfirmModal({
  fromRace,
  toRace,
  remainingMs,
  onCancel,
  onConfirm,
}: RerollConfirmModalProps) {
  const from = RACE_DESCRIPTIONS[fromRace];
  const to = RACE_DESCRIPTIONS[toRace];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Irk değişimi onayı"
      onClick={onCancel}
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
        style={{
          maxWidth: 460,
          width: '100%',
          background: 'var(--color-bg-surface)',
          border: `1px solid ${to.color}40`,
          borderRadius: 14,
          padding: 24,
          boxShadow: `0 20px 60px rgba(0,0,0,0.6)`,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
          Irk değişimini onayla
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            marginTop: 8,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          Bu, ilk 24 saatte sahip olduğun <strong>tek ücretsiz değişim hakkın</strong>. Üssün ve
          kaynakların korunur, ancak ırk değişiminden sonra ek değişim yapamazsın.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{from.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Şu anki</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: from.color }}>{from.name}</div>
            </div>
          </div>
          <span style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{to.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Yeni</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: to.color }}>{to.name}</div>
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginBottom: 18,
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Kalan ücretsiz pencere: {formatCountdown(remainingMs)}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
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
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: to.color,
              border: 'none',
              color: '#000',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 0 16px ${to.color}40`,
            }}
          >
            {to.name} ile değiştir
          </button>
        </div>
      </div>
    </div>
  );
}
