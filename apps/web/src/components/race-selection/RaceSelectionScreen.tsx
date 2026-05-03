'use client';

import { useState } from 'react';
import { Race, RACE_DESCRIPTIONS, RaceDescription } from '@/types/units';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-1">
        <span className="font-display text-xs uppercase tracking-wider text-text-muted">{label}</span>
        <span className="font-display text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="progress-track h-1.5">
        <div
          className="progress-fill h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 6px ${color}50`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '4px 4px 0 0',
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface RaceCardProps {
  race: Race;
  desc: RaceDescription;
  selected: boolean;
  onSelect: () => void;
}

function RaceCard({ race, desc, selected, onSelect }: RaceCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-pressed={selected}
      className="relative rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${desc.bgColor} 0%, rgba(10,13,20,0.85) 70%)`
          : hovered
          ? `${desc.bgColor}`
          : 'rgba(13, 17, 32, 0.7)',
        border: `2px solid ${selected ? desc.color : hovered ? `${desc.color}50` : 'rgba(255,255,255,0.07)'}`,
        boxShadow: selected
          ? `0 0 32px ${desc.color}30, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`
          : hovered
          ? `0 8px 24px rgba(0,0,0,0.4), 0 0 16px ${desc.color}18`
          : '0 4px 16px rgba(0,0,0,0.3)',
        transform: hovered || selected ? 'translateY(-4px)' : 'none',
        backdropFilter: 'blur(14px)',
        flex: '1 1 260px',
        minWidth: 240,
        maxWidth: 340,
      }}
    >
      {/* Selected indicator */}
      {selected && (
        <div
          className="absolute top-3 right-3 font-display font-black text-black uppercase rounded-full px-2.5 py-0.5"
          style={{
            background: desc.color,
            fontSize: '9px',
            letterSpacing: '0.8px',
          }}
        >
          SEÇİLDİ ✓
        </div>
      )}

      {/* Neon corner accent */}
      <div
        className="absolute top-0 left-0 w-12 h-12 pointer-events-none"
        style={{
          borderTop: `2px solid ${desc.color}`,
          borderLeft: `2px solid ${desc.color}`,
          borderTopLeftRadius: 14,
          opacity: selected ? 1 : 0.3,
        }}
        aria-hidden
      />

      {/* Race icon + name */}
      <div className="flex items-center gap-4 mb-4">
        <span
          className="text-5xl leading-none"
          style={{
            filter: selected || hovered ? `drop-shadow(0 0 12px ${desc.color})` : 'none',
            transition: 'filter 0.3s',
          }}
          aria-hidden
        >
          {desc.icon}
        </div>
        <div>
          <h3 className="font-display text-xl font-black leading-none mb-1" style={{ color: desc.color }}>
            {desc.name}
          </h3>
          <p className="font-body text-xs text-text-muted uppercase tracking-wider">{desc.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 flex-1">
        {desc.description}
      </p>

      {/* Stats */}
      <div className="space-y-0">
        <StatBar label="Saldırı"  value={desc.stats.attack}  color={desc.color} />
        <StatBar label="Savunma" value={desc.stats.defense} color={desc.color} />
        <StatBar label="Hız"      value={desc.stats.speed}   color={desc.color} />
        <StatBar label="Can"      value={desc.stats.hp}      color={desc.color} />
      </div>

      {/* Race tag */}
      <div
        className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full font-display font-bold uppercase self-start"
        style={{
          background: `${desc.color}14`,
          border: `1px solid ${desc.color}35`,
          color: desc.color,
          fontSize: '10px',
          letterSpacing: '1px',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: desc.color, display: 'inline-block' }} />
        {race}
      </div>
    </div>
  );
}

interface RaceSelectionScreenProps {
  selectedRace: Race | null;
  onSelect: (race: Race) => void;
  onConfirm?: (race: Race) => void;
}

export function RaceSelectionScreen({ selectedRace, onSelect, onConfirm }: RaceSelectionScreenProps) {
  const { setRace } = useRaceTheme();
  const [hoveredRace, setHoveredRace] = useState<Race | null>(null);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const races = Object.values(Race) as Race[];
  const activeRace = hoveredRace ?? selectedRace ?? Race.INSAN;
  const activeDesc = RACE_DESCRIPTIONS[activeRace];

  function handleSelect(race: Race) {
    onSelect(race);
    setRace(race);
  }

  return (
    <div className="py-2">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-black text-text-primary mb-2">
          <span className="text-gradient-brand">Irk Seçimi</span>
        </h2>
        <p className="font-body text-text-secondary text-sm">
          Savaş stilini belirle — her ırkın kendine özgü güçlü yanları var.
        </p>

        {/* Race color indicators */}
        <div className="flex justify-center gap-2 mt-3">
          {(Object.values(Race) as Race[]).map((race) => {
            const desc = RACE_DESCRIPTIONS[race];
            const active = selectedRace === race;
            return (
              <button
                key={race}
                onClick={() => onSelect(race)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: desc.color,
                  boxShadow: active ? `0 0 8px ${desc.color}` : 'none',
                  transform: active ? 'scale(1.5)' : 'scale(1)',
                }}
                aria-label={`${desc.name} ırkını seç`}
              />
            );
          })}
        </div>
      </div>

      {/* Race cards */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {(Object.values(Race) as Race[]).map((race) => (
          <RaceCard
            key={race}
            race={race}
            desc={RACE_DESCRIPTIONS[race]}
            selected={selectedRace === race}
            onSelect={() => onSelect(race)}
          />
        ))}
      </div>

      {/* Confirm banner */}
      {selectedRace && (
        <div className="text-center animate-fade-in-scale">
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl font-display font-black text-black text-sm uppercase tracking-wider"
            style={{
              background: `linear-gradient(135deg, ${RACE_DESCRIPTIONS[selectedRace].color}, ${RACE_DESCRIPTIONS[selectedRace].color}cc)`,
              boxShadow: `0 4px 24px ${RACE_DESCRIPTIONS[selectedRace].color}40`,
              letterSpacing: '1px',
            }}
          >
            <span>{RACE_DESCRIPTIONS[selectedRace].icon}</span>
            <span>{RACE_DESCRIPTIONS[selectedRace].name} Seçildi!</span>
          </div>
          <p className="text-text-muted text-xs font-body mt-2">
            Birimler sekmesinden birliklerini görüntüleyebilirsin.
          </p>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
          <span className="text-text-primary">Hangi Irk</span>{' '}
          <span style={{ color: activeDesc.color, textShadow: `0 0 20px ${activeDesc.glowColor}` }}>
            Sen Olacaksın?
          </span>
        </h1>
        <p className="mt-2 text-text-muted text-sm">Her ırkın benzersiz lore&apos;u ve savaş biçimi var</p>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Left: Race selector tabs */}
        <div className="relative z-10 flex flex-row lg:flex-col gap-2 px-4 lg:px-6 lg:py-6 overflow-x-auto lg:overflow-x-visible lg:w-56 shrink-0">
          {races.map((race) => {
            const desc = RACE_DESCRIPTIONS[race];
            const active = selectedRace === race;
            return (
              <button
                key={race}
                onClick={() => handleSelect(race)}
                onMouseEnter={() => setHoveredRace(race)}
                onMouseLeave={() => setHoveredRace(null)}
                className={clsx(
                  'relative flex items-center gap-3 px-4 py-3 rounded-xl shrink-0 lg:w-full text-left',
                  'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  'border',
                  active
                    ? 'scale-[1.02]'
                    : 'hover:scale-[1.01] bg-white/02 border-white/06 hover:border-white/15',
                )}
                style={active ? {
                  background: desc.bgColor,
                  borderColor: desc.color,
                  boxShadow: `0 0 20px ${desc.glowColor}`,
                } : {}}
                aria-pressed={active}
              >
                <span className="text-xl leading-none">{desc.icon}</span>
                <div className="min-w-0">
                  <div
                    className="font-display text-sm font-bold truncate"
                    style={{ color: active ? desc.color : 'var(--color-text-secondary)' }}
                  >
                    {desc.name}
                  </div>
                  <div className="text-text-muted text-[10px] truncate">{desc.subtitle}</div>
                </div>
                {active && (
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: desc.color, boxShadow: `0 0 6px ${desc.color}` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Center: Character portrait + lore */}
        <div className="relative flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
          {/* Portrait panel */}
          <div className="relative flex-1 flex items-end justify-center min-h-[300px] lg:min-h-0 overflow-hidden">
            {/* Race atmosphere glow */}
            <div
              className="absolute inset-0 transition-all duration-700"
              style={{
                background: `radial-gradient(ellipse 80% 70% at 50% 100%, ${activeDesc.glowColor} 0%, transparent 65%)`,
              }}
              aria-hidden
            />

            {/* Character portrait */}
            <div className="relative z-10 h-[55vh] lg:h-full w-full max-w-xs lg:max-w-sm flex items-end justify-center">
              {!imgError[activeRace] ? (
                <Image
                  key={activeRace}
                  src={activeDesc.primaryCommanderPortrait}
                  alt={`${activeDesc.name} komutanı`}
                  fill
                  className="object-contain object-bottom transition-all duration-500 animate-slide-up"
                  onError={() => setImgError(prev => ({ ...prev, [activeRace]: true }))}
                  priority
                  style={{
                    filter: `drop-shadow(0 0 32px ${activeDesc.glowColor}) drop-shadow(0 8px 16px rgba(0,0,0,0.7))`,
                  }}
                />
              ) : (
                <div
                  className="w-40 h-40 flex items-center justify-center text-7xl"
                  style={{ filter: `drop-shadow(0 0 20px ${activeDesc.glowColor})` }}
                >
                  {activeDesc.icon}
                </div>
              )}
            </div>

            {/* Manga panel bottom gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
              style={{
                background: `linear-gradient(to top, var(--color-bg) 0%, transparent 100%)`,
              }}
              aria-hidden
            />
          </div>

          {/* Info panel */}
          <div
            className="relative z-10 flex flex-col justify-between p-6 lg:p-8 lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div>
              {/* Race name */}
              <div className="mb-2">
                <span
                  className="badge"
                  style={{ background: activeDesc.bgColor, color: activeDesc.color, border: `1px solid ${activeDesc.color}40` }}
                >
                  {activeRace.toUpperCase()}
                </span>
              </div>
              <h2
                className="font-display text-2xl font-black mb-1"
                style={{ color: activeDesc.color, textShadow: `0 0 16px ${activeDesc.glowColor}` }}
              >
                {activeDesc.name}
              </h2>
              <p className="text-text-muted text-xs mb-4">{activeDesc.subtitle}</p>

              {/* Lore */}
              <div
                className="manga-panel p-4 mb-6"
                style={{ borderColor: `${activeDesc.color}20` }}
              >
                <p className="text-text-secondary text-xs leading-relaxed">{activeDesc.lore}</p>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <h3 className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-2">
                  Savaş İstatistikleri
                </h3>
                <StatBar label="Saldırı" value={activeDesc.stats.attack} color={activeDesc.color} />
                <StatBar label="Savunma" value={activeDesc.stats.defense} color={activeDesc.color} />
                <StatBar label="Hız" value={activeDesc.stats.speed} color={activeDesc.color} />
                <StatBar label="Can" value={activeDesc.stats.hp} color={activeDesc.color} />
              </div>

              {/* Commanders preview */}
              <div>
                <h3 className="font-display text-[10px] uppercase tracking-widest text-text-muted mb-3">
                  Komutanlar ({activeDesc.commanders.length})
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {activeDesc.commanders.slice(0, 4).map((cmd) => (
                    <div
                      key={cmd.id}
                      className="relative w-10 h-10 rounded-lg overflow-hidden border"
                      style={{ borderColor: `${activeDesc.color}30` }}
                      title={cmd.name}
                    >
                      {!imgError[cmd.id] ? (
                        <Image
                          src={cmd.portrait}
                          alt={cmd.name}
                          fill
                          className="object-cover object-top"
                          onError={() => setImgError(prev => ({ ...prev, [cmd.id]: true }))}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-lg"
                          style={{ background: activeDesc.bgColor }}
                        >
                          {activeDesc.icon}
                        </div>
                      )}
                      {!cmd.isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px]">🔒</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            {selectedRace && (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <GlowButton
                  onClick={() => onConfirm?.(selectedRace)}
                  className="w-full"
                  icon={<span>→</span>}
                  style={{
                    background: RACE_DESCRIPTIONS[selectedRace].color,
                    boxShadow: `0 4px 24px ${RACE_DESCRIPTIONS[selectedRace].glowColor}`,
                  }}
                >
                  {RACE_DESCRIPTIONS[selectedRace].name} Seç
                </GlowButton>
              </div>
            )}
          </div>
        </div>
      </main>
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
