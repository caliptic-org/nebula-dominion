'use client';

/**
 * /replay/[id] — turn-by-turn replay viewer for a completed battle.
 *
 * Pulls the battle state from the api stub at `GET /battles/:id`. The same
 * endpoint /battle-prep + /battle use; the response includes a `log` array
 * with `{ turn, text }` rows that we play back here.
 *
 * Playback controls:
 *   - Auto-advance every 1.4 s while playing.
 *   - ‹ / › buttons jump one turn back / forward.
 *   - Tapping a turn dot in the timeline jumps directly to that turn.
 *
 * Caveat: the api battles stub stores state in-memory only — `BATTLES` map
 * resets on container restart, so historical replays may 404 if the
 * battle was created in a previous container generation. That's fine for
 * the demo — when the real persistent BattleModule lands, this page
 * swaps to a DB-backed log without changing the UI contract.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ND,
  Sigil,
  Screen,
  Panel,
  Bar,
  Eyebrow,
  H2,
  H3,
  Caption,
  Chip,
  Code,
  NDButton,
  useNDRace,
} from '@/components/handoff';
import { api, FetchError } from '@/lib/api';

interface BattleLogEntry {
  turn: number;
  text: string;
}

interface BattleState {
  id: string;
  attackerRace: string;
  defenderRace: string;
  status: 'pending' | 'in-progress' | 'won' | 'lost';
  turnsElapsed: number;
  maxTurns: number;
  winProb: number;
  log: BattleLogEntry[];
  rewards: {
    gold: number;
    gems: number;
    xp: number;
    mineral: number;
    gas: number;
    science: number;
  };
  createdAt: string;
}

const PLAYBACK_INTERVAL_MS = 1400;

export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const race = useNDRace();
  const battleId = params?.id ?? '';

  const [state, setState] = useState<BattleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Fetch once on mount. /battles/:id is a GET that may "advance" an
  // in-progress battle by one turn — for a finished battle (status === 'won'
  // or 'lost') it's idempotent (advance() bails on non-in-progress states),
  // so a single fetch is safe.
  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<BattleState>(`/battles/${battleId}`)
      .then((res) => {
        if (cancelled) return;
        setState(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof FetchError ? err.message : 'Savaş bulunamadı');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [battleId]);

  // Auto-advance the playhead while playing. Stops at the last log entry —
  // doesn't loop, so the player can read the final outcome without it
  // restarting under them.
  useEffect(() => {
    if (!playing || !state) return;
    const last = state.log.length - 1;
    if (playhead >= last) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(
      () => setPlayhead((p) => Math.min(p + 1, last)),
      PLAYBACK_INTERVAL_MS,
    );
    return () => window.clearTimeout(id);
  }, [playing, playhead, state]);

  if (loading) {
    return (
      <Screen race={race} style={{ height: '100dvh' }}>
        <div style={{ padding: 24 }}>
          <Caption>Replay yükleniyor…</Caption>
        </div>
      </Screen>
    );
  }

  if (error || !state) {
    return (
      <Screen race={race} style={{ height: '100dvh' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <H2>Savaş bulunamadı</H2>
          <Caption>{error ?? 'Replay süresi dolmuş olabilir.'}</Caption>
          <NDButton race={race} variant="primary" onClick={() => router.push('/profile')}>
            Profile dön
          </NDButton>
        </div>
      </Screen>
    );
  }

  const visibleLog = state.log.slice(0, playhead + 1);
  const currentEntry = state.log[playhead];
  const outcomeChip =
    state.status === 'won'
      ? { color: ND.ok, label: 'ZAFER' }
      : state.status === 'lost'
        ? { color: ND.danger, label: 'YENİLGİ' }
        : { color: ND.warn, label: 'SÜREN' };

  return (
    <Screen race={race} style={{ height: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: 'linear-gradient(180deg, rgba(6,8,15,0.95), rgba(6,8,15,0.55))',
          borderBottom: `1px solid ${race.primary}33`,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Geri"
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            border: `1px solid ${ND.border}`,
            background: 'transparent',
            color: ND.text,
            fontFamily: ND.display,
            cursor: 'pointer',
          }}
        >
          ‹
        </button>
        <Sigil race={race} size={28} glow />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={race.primary}>REPLAY</Eyebrow>
          <H2 style={{ marginTop: 2 }}>
            {state.attackerRace.toUpperCase()} · {state.defenderRace.toUpperCase()}
          </H2>
        </div>
        <Chip color={outcomeChip.color}>{outcomeChip.label}</Chip>
      </header>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px 100px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Turn indicator + progress bar */}
        <Panel race={race} style={{ padding: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <H3 style={{ color: ND.text }}>Tur {currentEntry?.turn ?? 0} / {state.maxTurns}</H3>
            <Code style={{ color: race.primary }}>%{state.winProb}</Code>
          </div>
          <Bar
            value={
              state.log.length > 1
                ? Math.round((playhead / (state.log.length - 1)) * 100)
                : 100
            }
            color={race.primary}
            height={6}
          />
        </Panel>

        {/* Current turn text — big, race-tinted, becomes the focus */}
        <Panel race={race} style={{ padding: 20, minHeight: 140 }}>
          <Caption style={{ fontSize: 10, marginBottom: 8 }}>
            {currentEntry?.turn === 0 ? 'AÇILIŞ' : `TUR ${currentEntry?.turn}`}
          </Caption>
          <div
            style={{
              fontFamily: ND.display,
              fontSize: 18,
              color: ND.text,
              lineHeight: 1.4,
            }}
          >
            {currentEntry?.text ?? 'Hazır bekleyiş…'}
          </div>
        </Panel>

        {/* Playback controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <NDButton
            race={race}
            variant="ghost"
            size="sm"
            disabled={playhead === 0}
            onClick={() => {
              setPlaying(false);
              setPlayhead((p) => Math.max(0, p - 1));
            }}
          >
            ‹ Tur
          </NDButton>
          <NDButton
            race={race}
            variant="primary"
            size="sm"
            onClick={() => {
              if (playhead >= state.log.length - 1) {
                // Restart from the beginning if we're at the end.
                setPlayhead(0);
                setPlaying(true);
              } else {
                setPlaying((p) => !p);
              }
            }}
          >
            {playhead >= state.log.length - 1 ? 'Tekrarla' : playing ? '⏸ Duraklat' : '▶ Oynat'}
          </NDButton>
          <NDButton
            race={race}
            variant="ghost"
            size="sm"
            disabled={playhead >= state.log.length - 1}
            onClick={() => {
              setPlaying(false);
              setPlayhead((p) => Math.min(state.log.length - 1, p + 1));
            }}
          >
            Tur ›
          </NDButton>
        </div>

        {/* Turn timeline — tap a dot to scrub */}
        <Panel race={race} style={{ padding: 12 }}>
          <Caption style={{ fontSize: 10, marginBottom: 8 }}>ZAMAN ÇİZGİSİ</Caption>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {state.log.map((entry, i) => (
              <button
                key={`${entry.turn}-${i}`}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setPlayhead(i);
                }}
                aria-label={`Tur ${entry.turn}`}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: `1px solid ${i === playhead ? race.primary : ND.border}`,
                  background:
                    i <= playhead
                      ? `${race.primary}28`
                      : 'transparent',
                  color: i === playhead ? race.primary : ND.textDim,
                  fontFamily: ND.mono,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {entry.turn}
              </button>
            ))}
          </div>
        </Panel>

        {/* Full log scroll-back — shows everything up to playhead */}
        <Panel race={race} style={{ padding: 12 }}>
          <Caption style={{ fontSize: 10, marginBottom: 8 }}>SAVAŞ KAYDI</Caption>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleLog.map((entry, i) => (
              <div
                key={`row-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom:
                    i < visibleLog.length - 1 ? `1px solid ${ND.border}` : 'none',
                  opacity: i === playhead ? 1 : 0.75,
                }}
              >
                <Code style={{ color: race.primary, fontSize: 11 }}>T{entry.turn}</Code>
                <div style={{ fontSize: 12, color: ND.text }}>{entry.text}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Final outcome card — only when the playhead reaches the end */}
        {playhead === state.log.length - 1 && state.status !== 'in-progress' && (
          <Panel
            race={race}
            style={{
              padding: 16,
              borderColor: state.status === 'won' ? ND.ok : ND.danger,
            }}
          >
            <Eyebrow color={state.status === 'won' ? ND.ok : ND.danger}>SONUÇ</Eyebrow>
            <H3 style={{ marginTop: 4, color: ND.text }}>
              {state.status === 'won' ? 'Zafer kazanıldı' : 'Yenilgi kabul edildi'}
            </H3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 10,
              }}
            >
              <div>
                <Caption style={{ fontSize: 9 }}>ALTIN</Caption>
                <Code style={{ color: race.primary }}>+{state.rewards.gold.toLocaleString()}</Code>
              </div>
              <div>
                <Caption style={{ fontSize: 9 }}>XP</Caption>
                <Code style={{ color: race.primary }}>+{state.rewards.xp}</Code>
              </div>
              <div>
                <Caption style={{ fontSize: 9 }}>MİNERAL</Caption>
                <Code style={{ color: race.primary }}>+{state.rewards.mineral}</Code>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </Screen>
  );
}
