'use client';

import { useState, useEffect } from 'react';
import { RacePanel } from '@/components/ui/RacePanel';

const RACES = [
  { code: 'human',   label: 'HUMAN — İnsan',     primary: '#4a9eff' },
  { code: 'zerg',    label: 'ZERG — Böcek',      primary: '#44ff44' },
  { code: 'automat', label: 'AUTOMAT — Otomat',  primary: '#00cfff' },
  { code: 'beast',   label: 'BEAST — Canavar',   primary: '#ff6600' },
  { code: 'demon',   label: 'DEMON — Şeytan',    primary: '#cc00ff' },
] as const;

export default function RaceChromeShowcase() {
  const [active, setActive] = useState<string>('human');
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    setRemountKey((k) => k + 1);
  }, [active]);

  return (
    <div
      data-race={active}
      style={{
        minHeight: '100vh',
        background: 'var(--race-bg-deep)',
        padding: '32px',
        color: 'var(--race-text-primary)',
        fontFamily: 'var(--race-font-ui)',
        transition: 'background 200ms ease',
      }}
    >
      <header style={{ marginBottom: '24px' }}>
        <h1
          className="race-heading"
          style={{ fontSize: '32px', marginBottom: '8px' }}
        >
          Race Chrome System
        </h1>
        <p className="race-text-muted" style={{ marginBottom: '16px' }}>
          BRIEF 1/4 — Per-race tokens, panel geometry, open animations.
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {RACES.map((r) => (
            <button
              key={r.code}
              onClick={() => setActive(r.code)}
              style={{
                padding: '8px 16px',
                background: active === r.code ? r.primary : 'transparent',
                color: active === r.code ? '#000' : r.primary,
                border: `1px solid ${r.primary}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '12px',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <main
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
        key={remountKey}
      >
        <RacePanel className="p-6" style={{ padding: '24px' }}>
          <h2
            className="race-heading"
            style={{ fontSize: '20px', marginBottom: '8px' }}
          >
            Standart Panel
          </h2>
          <p style={{ marginBottom: '12px', lineHeight: 1.5 }}>
            Bu panel ırka özel açılma animasyonu, geometrisi ve glow'u kullanır.
            Tüm renkler <code>var(--race-*)</code> token'larından gelir.
          </p>
          <div className="race-text-muted" style={{ fontSize: '12px' }}>
            data-race=&quot;{active}&quot;
          </div>
        </RacePanel>

        <RacePanel isActive style={{ padding: '24px' }}>
          <h2
            className="race-heading"
            style={{ fontSize: '20px', marginBottom: '8px' }}
          >
            Aktif Panel
          </h2>
          <p style={{ marginBottom: '12px', lineHeight: 1.5 }}>
            <code>is-active</code> sınıfı; Zerg'de sürekli nefes alır,
            diğer ırklar bir kerelik açılma yapar.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              fontFamily: 'var(--race-font-primary)',
              fontSize: '14px',
              color: 'var(--race-primary)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--race-primary)',
                boxShadow: '0 0 12px var(--race-glow-color)',
              }}
            />
            ONLINE
          </div>
        </RacePanel>

        <RacePanel style={{ padding: '24px' }}>
          <h2
            className="race-heading"
            style={{ fontSize: '20px', marginBottom: '8px' }}
          >
            Tipografi
          </h2>
          <div
            style={{
              fontFamily: 'var(--race-font-primary)',
              fontSize: '24px',
              marginBottom: '8px',
              color: 'var(--race-primary)',
            }}
          >
            Primary Font
          </div>
          <div style={{ fontFamily: 'var(--race-font-ui)', fontSize: '14px' }}>
            UI font — tablo, sayaç ve veri için kullanılır.
          </div>
        </RacePanel>
      </main>

      <footer style={{ marginTop: '32px', fontSize: '12px' }} className="race-text-muted">
        Tip: Irkı değiştirin — açılma animasyonları yeniden tetiklenir.
      </footer>
    </div>
  );
}
