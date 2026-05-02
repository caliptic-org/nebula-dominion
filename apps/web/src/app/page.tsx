'use client';

import { useState } from 'react';
import { useProgression } from '@/hooks/useProgression';
import { LevelIndicator } from '@/components/progression/LevelIndicator';
import { LevelUpModal } from '@/components/progression/LevelUpModal';
import { UnlockNotification } from '@/components/progression/UnlockNotification';
import { LevelUpPayload, ContentUnlock } from '@/types/progression';

// Demo page — replace USER_ID with the authenticated player's ID
const DEMO_USER_ID = 'demo-player-001';

export default function HomePage() {
  const [pendingLevelUp, setPendingLevelUp] = useState<LevelUpPayload | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<ContentUnlock[]>([]);

  const { progress, loading } = useProgression({
    userId: DEMO_USER_ID,
    onLevelUp: (payload) => {
      setPendingLevelUp(payload);
      if (payload.newUnlocks.length) setPendingUnlocks(payload.newUnlocks);
    },
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#aaa' }}>Yükleniyor…</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#f66' }}>İlerleme yüklenemedi.</p>
      </div>
    );
  }

  return (
    <>
      <UnlockNotification newUnlocks={pendingUnlocks} />

      {pendingLevelUp && (
        <LevelUpModal
          payload={pendingLevelUp}
          onClose={() => {
            setPendingLevelUp(null);
            setPendingUnlocks([]);
          }}
        />
      )}

      <main style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: 22, marginBottom: 24, color: '#ffc832' }}>Nebula Dominion</h1>

        <LevelIndicator progress={progress} />

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Açık İçerikler
          </h2>
          {progress.unlockedContent.length === 0 ? (
            <p style={{ color: '#666', fontSize: 13 }}>Henüz içerik açılmadı.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {progress.unlockedContent.map((unlock) => (
                <span
                  key={unlock}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(255,200,50,0.1)',
                    border: '1px solid rgba(255,200,50,0.3)',
                    borderRadius: 20,
                    fontSize: 12,
                    color: '#ffc832',
                  }}
                >
                  {unlock.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            İstatistikler
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Toplam XP', value: progress.totalXp.toLocaleString('tr-TR') },
              { label: 'Tier Bonusu', value: `×${progress.tierBonusMultiplier.toFixed(2)}` },
              { label: 'Yaş', value: `Çağ ${progress.age}` },
              { label: 'Seviye', value: `${progress.level} / 9` },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
