'use client';

export type RaceSelectionEvent =
  | { type: 'screen_viewed'; mode: 'show_all' | 'pick_for_me' }
  | { type: 'mode_changed'; mode: 'show_all' | 'pick_for_me' }
  | { type: 'preview_opened'; race: string }
  | { type: 'quiz_started' }
  | { type: 'quiz_completed'; recommended: string; alternative: string; durationMs: number }
  | { type: 'race_selected'; race: string; via: 'card' | 'quiz' | 'reroll'; timeOnScreenMs: number }
  | { type: 'reroll_used'; from: string; to: string; remainingMs: number }
  | { type: 'reroll_window_expired' };

export function emitRaceSelectionEvent(event: RaceSelectionEvent) {
  if (typeof window === 'undefined') return;
  try {
    const payload = { ...event, ts: Date.now() };
    const w = window as unknown as { __caliptic_telemetry__?: { push: (e: unknown) => void } };
    if (w.__caliptic_telemetry__?.push) {
      w.__caliptic_telemetry__.push(payload);
    } else if (process.env.NODE_ENV !== 'production') {
      console.debug('[race-selection]', payload);
    }
  } catch {
    // Telemetry is best-effort.
  }
}
