'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Race, RACE_DESCRIPTIONS } from '@/types/units';
import { useRaceTheme } from '@/hooks/useRaceTheme';
import './battle-prep.css';

/* ─── Types ─── */
interface PrepUnit {
  id: string;
  name: string;
  portrait: string;
  glyph: string;
  level: number;
  attack: number;
  defense: number;
  hp: number;
  locked: boolean;
}

interface PrepAbility {
  id: string;
  name: string;
  glyph: string;
  hotkey: string;
  cooldown: number;
  ultimate: boolean;
}

interface EnemyTarget {
  name: string;
  race: Race;
  level: number;
  threat: 1 | 2 | 3 | 4;
  terrain: string[];
}

/* ─── Tuned per-race data ─── */
const UNITS_BY_RACE: Record<Race, PrepUnit[]> = {
  [Race.INSAN]: [
    { id: 'voss',   name: 'Voss',   portrait: '/assets/characters/insan/voss.png',   glyph: '⚔️', level: 5, attack: 60, defense: 80, hp: 75, locked: false },
    { id: 'chen',   name: 'Chen',   portrait: '/assets/characters/insan/chen.png',   glyph: '🔧', level: 3, attack: 45, defense: 70, hp: 65, locked: false },
    { id: 'reyes',  name: 'Reyes',  portrait: '/assets/characters/insan/reyes.png',  glyph: '🎯', level: 2, attack: 80, defense: 40, hp: 50, locked: true  },
    { id: 'kovacs', name: 'Kovacs', portrait: '/assets/characters/insan/kovacs.png', glyph: '🛡️', level: 4, attack: 50, defense: 95, hp: 90, locked: true  },
  ],
  [Race.ZERG]: [
    { id: 'vex_thara', name: 'Vex Thara', portrait: '/assets/characters/zerg/vex_thara.png', glyph: '🧬', level: 6, attack: 85, defense: 45, hp: 55, locked: false },
    { id: 'morgath',   name: 'Morgath',   portrait: '/assets/characters/zerg/morgath.png',   glyph: '☣️', level: 4, attack: 90, defense: 35, hp: 60, locked: false },
    { id: 'threnix',   name: 'Threnix',   portrait: '/assets/characters/zerg/threnix.png',   glyph: '🧠', level: 3, attack: 70, defense: 50, hp: 45, locked: true  },
    { id: 'null_4',    name: '???',       portrait: '',                                       glyph: '?',  level: 0, attack: 0,  defense: 0,  hp: 0,  locked: true  },
  ],
  [Race.OTOMAT]: [
    { id: 'demiurge', name: 'Demiurge',  portrait: '/assets/characters/otomat/demiurge_prime.png', glyph: '⚡', level: 7, attack: 75, defense: 90, hp: 70, locked: false },
    { id: 'aurelius', name: 'Aurelius',  portrait: '/assets/characters/otomat/aurelius.png',        glyph: '📐', level: 4, attack: 65, defense: 85, hp: 65, locked: false },
    { id: 'crucible', name: 'Crucible',  portrait: '/assets/characters/otomat/crucible.png',        glyph: '💠', level: 3, attack: 85, defense: 60, hp: 55, locked: true  },
    { id: 'null_4',   name: '???',       portrait: '',                                              glyph: '?',  level: 0, attack: 0,  defense: 0,  hp: 0,  locked: true  },
  ],
  [Race.CANAVAR]: [
    { id: 'khorvash', name: 'Khorvash', portrait: '/assets/characters/canavar/khorvash.png', glyph: '🔥', level: 6, attack: 95, defense: 55, hp: 80, locked: false },
    { id: 'null_2',   name: 'Gorgrath', portrait: '',                                        glyph: '🪨', level: 3, attack: 75, defense: 70, hp: 85, locked: false },
    { id: 'null_3',   name: 'Pyraxis',  portrait: '',                                        glyph: '💀', level: 4, attack: 88, defense: 45, hp: 60, locked: true  },
    { id: 'null_4',   name: '???',      portrait: '',                                        glyph: '?',  level: 0, attack: 0,  defense: 0,  hp: 0,  locked: true  },
  ],
  [Race.SEYTAN]: [
    { id: 'null_1',   name: 'Malveris', portrait: '',  glyph: '💀', level: 5, attack: 90, defense: 50, hp: 65, locked: false },
    { id: 'null_2',   name: 'Vyreth',   portrait: '',  glyph: '🌑', level: 4, attack: 80, defense: 60, hp: 55, locked: false },
    { id: 'null_3',   name: 'Thornix',  portrait: '',  glyph: '🩸', level: 3, attack: 70, defense: 65, hp: 60, locked: true  },
    { id: 'null_4',   name: '???',      portrait: '',  glyph: '?',  level: 0, attack: 0,  defense: 0,  hp: 0,  locked: true  },
  ],
};

const ABILITIES_BY_RACE: Record<Race, PrepAbility[]> = {
  [Race.INSAN]: [
    { id: 'q', name: 'Stimpack',      glyph: '💉', hotkey: 'Q', cooldown: 12, ultimate: false },
    { id: 'w', name: 'Nişancı Modu',  glyph: '🎯', hotkey: 'W', cooldown: 18, ultimate: false },
    { id: 'e', name: 'Zırh Takviye',  glyph: '🛡️', hotkey: 'E', cooldown: 24, ultimate: false },
    { id: 'r', name: 'Hava Desteği',  glyph: '✈️', hotkey: 'R', cooldown: 60, ultimate: true  },
    { id: 'a', name: 'Mevzi',         glyph: '🏰', hotkey: 'A', cooldown: 30, ultimate: false },
    { id: 's', name: 'Tahliye',       glyph: '🚁', hotkey: 'S', cooldown: 45, ultimate: false },
  ],
  [Race.ZERG]: [
    { id: 'q', name: 'Sürü Hücumu',   glyph: '🧬', hotkey: 'Q', cooldown: 8,  ultimate: false },
    { id: 'w', name: 'Biyolüm Patlama',glyph:'✨', hotkey: 'W', cooldown: 15, ultimate: false },
    { id: 'e', name: 'Mutasyon',       glyph: '🦠', hotkey: 'E', cooldown: 20, ultimate: false },
    { id: 'r', name: 'Kovan Çağrısı', glyph: '🌐', hotkey: 'R', cooldown: 60, ultimate: true  },
    { id: 'a', name: 'Adrenal',        glyph: '⚡', hotkey: 'A', cooldown: 10, ultimate: false },
    { id: 's', name: 'Tünel',          glyph: '🕳️', hotkey: 'S', cooldown: 35, ultimate: false },
  ],
  [Race.OTOMAT]: [
    { id: 'q', name: 'Hologram',       glyph: '📡', hotkey: 'Q', cooldown: 10, ultimate: false },
    { id: 'w', name: 'Enerji Alanı',   glyph: '🔵', hotkey: 'W', cooldown: 20, ultimate: false },
    { id: 'e', name: 'Geometrik Kes',  glyph: '💎', hotkey: 'E', cooldown: 16, ultimate: false },
    { id: 'r', name: 'Sistem Güncelle',glyph: '🔄', hotkey: 'R', cooldown: 60, ultimate: true  },
    { id: 'a', name: 'Grid Kilidi',    glyph: '🔒', hotkey: 'A', cooldown: 25, ultimate: false },
    { id: 's', name: 'Hassas Atış',    glyph: '🎯', hotkey: 'S', cooldown: 18, ultimate: false },
  ],
  [Race.CANAVAR]: [
    { id: 'q', name: 'Ateş Nefesi',   glyph: '🔥', hotkey: 'Q', cooldown: 10, ultimate: false },
    { id: 'w', name: 'Taş Zırh',      glyph: '🪨', hotkey: 'W', cooldown: 20, ultimate: false },
    { id: 'e', name: 'Yıkım Darbesi', glyph: '💥', hotkey: 'E', cooldown: 15, ultimate: false },
    { id: 'r', name: 'Primal Öfke',   glyph: '🌋', hotkey: 'R', cooldown: 60, ultimate: true  },
    { id: 'a', name: 'Kan Ritüeli',   glyph: '🩸', hotkey: 'A', cooldown: 30, ultimate: false },
    { id: 's', name: 'Totem Çağrısı', glyph: '🗿', hotkey: 'S', cooldown: 40, ultimate: false },
  ],
  [Race.SEYTAN]: [
    { id: 'q', name: 'Ruh Tüketi',    glyph: '💀', hotkey: 'Q', cooldown: 8,  ultimate: false },
    { id: 'w', name: 'Karanlık Portal',glyph:'🌑', hotkey: 'W', cooldown: 18, ultimate: false },
    { id: 'e', name: 'Lanet',          glyph: '🩸', hotkey: 'E', cooldown: 22, ultimate: false },
    { id: 'r', name: 'Grimuvada Pakti',glyph:'📜', hotkey: 'R', cooldown: 60, ultimate: true  },
    { id: 'a', name: 'Sigil Patla',    glyph: '✦',  hotkey: 'A', cooldown: 14, ultimate: false },
    { id: 's', name: 'Boyut Yırtığı', glyph: '🔮', hotkey: 'S', cooldown: 50, ultimate: false },
  ],
};

const ENEMY_TARGETS: EnemyTarget[] = [
  { name: 'Komutan Vex-7',    race: Race.ZERG,    level: 12, threat: 3, terrain: ['Uzay', 'Asteroit'] },
  { name: 'Demiurge-X9',      race: Race.OTOMAT,  level: 10, threat: 2, terrain: ['Orbital', 'Platform'] },
  { name: 'Khorvash Jr',      race: Race.CANAVAR, level: 8,  threat: 2, terrain: ['Gezegen', 'Kaya'] },
  { name: 'Şeytan Malveris',  race: Race.SEYTAN,  level: 15, threat: 4, terrain: ['Subspace', 'Portal'] },
];

const THREAT_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Düşük',    cls: 'threat-low'  },
  2: { label: 'Orta',     cls: 'threat-mid'  },
  3: { label: 'Yüksek',   cls: 'threat-high' },
  4: { label: 'KRİTİK',   cls: 'threat-max'  },
};

const TACTIC_OPTIONS = {
  strateji:   ['Saldır',    'Dengeli',   'Savun'],
  pozisyon:   ['Yakın',     'Orta',      'Uzak'],
  oncelik:    ['HP Düşük',  'Güçlü',     'Rasgele'],
};

const BATTLE_COST = { mineral: 800, gas: 200, energy: 500 };
const MAX_FLEET   = 2;

/* ─── Component ─── */
export function BattlePrepScreen() {
  const { race } = useRaceTheme();
  const router   = useRouter();

  const raceData   = RACE_DESCRIPTIONS[race];
  const units      = UNITS_BY_RACE[race];
  const abilities  = ABILITIES_BY_RACE[race];

  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [tactics, setTactics] = useState<Record<string, string>>({
    strateji: 'Dengeli',
    pozisyon: 'Orta',
    oncelik:  'HP Düşük',
  });

  const enemy = useMemo(() => {
    const idx = Object.values(Race).indexOf(race);
    return ENEMY_TARGETS[idx % ENEMY_TARGETS.length];
  }, [race]);

  const threat = THREAT_LABELS[enemy.threat];

  const toggleUnit = (id: string, locked: boolean) => {
    if (locked) return;
    setSelectedUnits(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < MAX_FLEET
          ? [...prev, id]
          : prev,
    );
  };

  const toggleTactic = (key: string, val: string) => {
    setTactics(prev => ({ ...prev, [key]: val }));
  };

  const canConfirm = selectedUnits.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    router.push(`/battle-v2?race=${raceData.dataRace}`);
  };

  return (
    <div className="bp-root" data-race={raceData.dataRace}>
      {/* Nebula bg */}
      <div className="bp-nebula" aria-hidden>
        <div className="bp-nebula-orb" />
        <div className="bp-nebula-orb" />
      </div>
      <div className="bp-halftone" aria-hidden />
      <div className="bp-scan-beam" aria-hidden />

      {/* Header */}
      <header className="bp-header bp-anim-1">
        <Link href="/map" className="bp-header-back" aria-label="Haritaya dön">
          ‹
        </Link>
        <div className="bp-header-info">
          <div className="bp-header-eyebrow">Savaş Hazırlığı · Screen 13</div>
          <div className="bp-header-title">{raceData.name} İmparatorluğu</div>
        </div>
        <div className="bp-header-badge">{raceData.icon} {raceData.dataRace.toUpperCase()}</div>
      </header>

      <div className="bp-content">
        {/* Enemy Intel */}
        <section className="bp-section bp-anim-2">
          <div className="bp-section-label">Hedef İstihbaratı</div>
          <div className="bp-enemy-card">
            <div className="bp-enemy-card-inner">
              <div className="bp-enemy-portrait">
                <span className="bp-unit-portrait-glyph" style={{ fontSize: 30 }}>
                  {RACE_DESCRIPTIONS[enemy.race].icon}
                </span>
              </div>
              <div className="bp-enemy-details">
                <div className="bp-enemy-name">{enemy.name}</div>
                <div className="bp-enemy-race">{RACE_DESCRIPTIONS[enemy.race].name} · Lv.{enemy.level}</div>
                <div className="bp-enemy-stats-row">
                  <div className="bp-enemy-stat">
                    <span className="bp-enemy-stat-val">{RACE_DESCRIPTIONS[enemy.race].stats.attack}</span>
                    <span className="bp-enemy-stat-lbl">ATK</span>
                  </div>
                  <div className="bp-enemy-stat">
                    <span className="bp-enemy-stat-val">{RACE_DESCRIPTIONS[enemy.race].stats.defense}</span>
                    <span className="bp-enemy-stat-lbl">DEF</span>
                  </div>
                  <div className="bp-enemy-stat">
                    <span className="bp-enemy-stat-val">{RACE_DESCRIPTIONS[enemy.race].stats.speed}</span>
                    <span className="bp-enemy-stat-lbl">SPD</span>
                  </div>
                </div>
              </div>
              <div className="bp-enemy-threat">
                <div className={`bp-threat-ring ${threat.cls}`}>{enemy.threat}</div>
                <div className="bp-threat-label">{threat.label}</div>
              </div>
            </div>
            <div className="bp-terrain-row">
              {enemy.terrain.map(t => (
                <div key={t} className="bp-terrain-chip">
                  <span>🌍</span> {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Fleet Selection */}
        <section className="bp-section bp-anim-3">
          <div className="bp-section-label">Komutan Seç</div>
          <div className="bp-slot-counter">
            {Array.from({ length: MAX_FLEET }).map((_, i) => (
              <div key={i} className={`bp-slot-dot ${i < selectedUnits.length ? 'filled' : ''}`} />
            ))}
            <span className="bp-slot-text">Aktif Filo</span>
            <span className="bp-slot-count">{selectedUnits.length}/{MAX_FLEET}</span>
          </div>
          <div className="bp-fleet-grid">
            {units.map(unit => {
              const sel = selectedUnits.includes(unit.id);
              return (
                <div
                  key={unit.id}
                  className={`bp-unit-card${sel ? ' selected' : ''}${unit.locked ? ' locked' : ''}`}
                  onClick={() => toggleUnit(unit.id, unit.locked)}
                  role="button"
                  aria-pressed={sel}
                  aria-label={`${unit.name} ${unit.locked ? '(kilitli)' : ''}`}
                >
                  <div className="bp-unit-portrait-wrap">
                    {unit.portrait ? (
                      <img
                        src={unit.portrait}
                        alt={unit.name}
                        className="bp-unit-portrait-img"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : null}
                    <div className="bp-unit-portrait-glyph">{unit.portrait ? null : unit.glyph}</div>
                    <div className="bp-unit-portrait-overlay" />
                    {!unit.locked && unit.level > 0 && (
                      <div className="bp-unit-level-badge">Lv.{unit.level}</div>
                    )}
                    {sel && <div className="bp-unit-selected-check" aria-hidden>✓</div>}
                    {unit.locked && <div className="bp-unit-lock-icon" aria-hidden>🔒</div>}
                  </div>
                  <div className="bp-unit-info">
                    <div className="bp-unit-name">{unit.name}</div>
                    {unit.level > 0 && (
                      <div className="bp-unit-bars">
                        <div className="bp-unit-bar-row">
                          <span className="bp-unit-bar-label">ATK</span>
                          <div className="bp-unit-bar-track">
                            <div className="bp-unit-bar-fill atk" style={{ width: `${unit.attack}%` }} />
                          </div>
                        </div>
                        <div className="bp-unit-bar-row">
                          <span className="bp-unit-bar-label">DEF</span>
                          <div className="bp-unit-bar-track">
                            <div className="bp-unit-bar-fill def" style={{ width: `${unit.defense}%` }} />
                          </div>
                        </div>
                        <div className="bp-unit-bar-row">
                          <span className="bp-unit-bar-label">HP</span>
                          <div className="bp-unit-bar-track">
                            <div className="bp-unit-bar-fill hp" style={{ width: `${unit.hp}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Abilities */}
        <section className="bp-section bp-anim-4" style={{ paddingTop: 24 }}>
          <div className="bp-section-label">Yetenek Yükü</div>
          <div className="bp-abilities-grid">
            {abilities.map(ab => (
              <div
                key={ab.id}
                className={`bp-ability-slot${ab.ultimate ? ' ultimate' : ' equipped'}`}
              >
                <div className="bp-ability-hotkey">{ab.hotkey}</div>
                <div className="bp-ability-glyph">{ab.glyph}</div>
                <div className="bp-ability-name">{ab.name}</div>
                <div className="bp-ability-cd">{ab.cooldown}s</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tactical Overlay */}
        <section className="bp-section bp-anim-4" style={{ paddingTop: 20 }}>
          <div className="bp-section-label">Taktik Overlay</div>
          <div className="bp-tactical-card">
            <div className="bp-tactical-header">
              <div className="bp-tactical-title">{raceData.name} Taktikleri</div>
              <div className="bp-tactical-badge">{raceData.subtitle}</div>
            </div>
            <div className="bp-tactical-rows">
              {(Object.entries(TACTIC_OPTIONS) as [keyof typeof TACTIC_OPTIONS, string[]][]).map(([key, opts]) => (
                <div key={key} className="bp-tactical-row">
                  <div className="bp-tactical-row-label">
                    {key === 'strateji' ? 'Strateji' : key === 'pozisyon' ? 'Pozisyon' : 'Öncelik'}
                  </div>
                  <div className="bp-tactic-options">
                    {opts.map(opt => (
                      <button
                        key={opt}
                        className={`bp-tactic-btn${tactics[key] === opt ? ' active' : ''}`}
                        onClick={() => toggleTactic(key, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resource Cost */}
        <section className="bp-section bp-anim-5" style={{ paddingTop: 20 }}>
          <div className="bp-section-label">Savaş Maliyeti</div>
          <div className="bp-cost-card">
            <div className="bp-cost-item">
              <span className="bp-cost-glyph">💎</span>
              <span className="bp-cost-value mineral">{BATTLE_COST.mineral.toLocaleString()}</span>
              <span className="bp-cost-label">Mineral</span>
              <span className="bp-cost-balance">/ 2.400</span>
            </div>
            <div className="bp-cost-item">
              <span className="bp-cost-glyph">⚗️</span>
              <span className="bp-cost-value gas">{BATTLE_COST.gas.toLocaleString()}</span>
              <span className="bp-cost-label">Gaz</span>
              <span className="bp-cost-balance">/ 840</span>
            </div>
            <div className="bp-cost-item">
              <span className="bp-cost-glyph">⚡</span>
              <span className="bp-cost-value energy">{BATTLE_COST.energy.toLocaleString()}</span>
              <span className="bp-cost-label">Enerji</span>
              <span className="bp-cost-balance">/ 1.200</span>
            </div>
          </div>
        </section>

        {/* Spacer for fixed footer */}
        <div style={{ height: 80 }} />
      </div>

      {/* Fixed Confirm CTA */}
      <div className="bp-confirm-footer">
        <button
          className={`bp-confirm-btn${!canConfirm ? ' disabled' : ''}`}
          onClick={handleConfirm}
          disabled={!canConfirm}
          aria-disabled={!canConfirm}
        >
          <span>SAVAŞA GİR</span>
          <div className="bp-confirm-icon">⚔️</div>
        </button>
        <div className="bp-confirm-meta">
          <div className="bp-confirm-meta-item">
            <div className="bp-confirm-meta-dot" style={{ background: canConfirm ? '#44ff88' : '#ff3355' }} />
            {canConfirm ? `${selectedUnits.length} komutan hazır` : 'Komutan seç'}
          </div>
          <div className="bp-confirm-meta-item">
            <div className="bp-confirm-meta-dot" style={{ background: '#ffc832' }} />
            Tehdit: {threat.label}
          </div>
        </div>
      </div>
    </div>
  );
}
