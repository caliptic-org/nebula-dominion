'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { buildMockGalaxy } from '@/components/galaxy-map/mockGalaxy';

// Galaxy map uses canvas + DOM measurements — disable SSR
const GalaxyMap = dynamic(
  () => import('@/components/galaxy-map/GalaxyMap').then((m) => ({ default: m.GalaxyMap })),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 32, color: '#fff' }}>Galaksi yükleniyor…</div>
    ),
  },
);

export default function GalaxyMapShowcase() {
  const galaxy = useMemo(() => buildMockGalaxy(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedSystem = galaxy.systems.find((s) => s.id === selected) ?? null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#04060c' }}>
      <GalaxyMap
        systems={galaxy.systems}
        fleets={galaxy.fleets}
        connections={galaxy.connections}
        discovery={galaxy.discovery}
        worldWidth={galaxy.worldWidth}
        worldHeight={galaxy.worldHeight}
        selectedId={selected}
        onSelectSystem={setSelected}
      />

      {selectedSystem && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 20,
            padding: 16,
            minWidth: 220,
            background: 'rgba(8, 12, 20, 0.92)',
            border: '1px solid rgba(0, 207, 255, 0.35)',
            color: '#e0f8ff',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 12,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: '0.08em',
              color: '#00cfff',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            {selectedSystem.name}
          </div>
          <div style={{ opacity: 0.65, marginBottom: 12 }}>
            Sahip: {selectedSystem.owner ?? 'Boş bölge'} · Sektör: {selectedSystem.sectorId}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
            <span>Mineral</span><span>{selectedSystem.resources.mineral ?? '—'}</span>
            <span>Gaz</span><span>{selectedSystem.resources.gas ?? '—'}</span>
            <span>Enerji</span><span>{selectedSystem.resources.energy ?? '—'}</span>
          </div>
          {selectedSystem.underAttack && (
            <div style={{ marginTop: 10, color: '#ff4466' }}>⚠ Saldırı altında</div>
          )}
          {selectedSystem.contested && (
            <div style={{ marginTop: 4, color: '#ffaa22' }}>⚔ İhtilaflı sınır</div>
          )}
          <button
            onClick={() => setSelected(null)}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '6px 8px',
              background: 'transparent',
              border: '1px solid rgba(0, 207, 255, 0.3)',
              color: '#00cfff',
              fontFamily: 'inherit',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Kapat
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 20,
          padding: '10px 14px',
          background: 'rgba(8, 12, 20, 0.85)',
          border: '1px solid rgba(0, 207, 255, 0.18)',
          color: 'rgba(0, 207, 255, 0.7)',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Sürükle: Pan · Tekerlek: Zum · Pinch: Mobil zum
      </div>
    </div>
  );
}
