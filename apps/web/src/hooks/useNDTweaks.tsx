'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type NDDensity = 'compact' | 'comfortable';
export type NDOnOff = 'on' | 'off';

export interface NDTweaks {
  density: NDDensity;
  animations: NDOnOff;
  sigilGlow: NDOnOff;
}

const DEFAULTS: NDTweaks = {
  density: 'comfortable',
  animations: 'on',
  sigilGlow: 'on',
};

const STORAGE_KEY = 'nebula:nd-tweaks:v1';

interface Ctx {
  tweaks: NDTweaks;
  setTweak: <K extends keyof NDTweaks>(key: K, value: NDTweaks[K]) => void;
  reset: () => void;
}

const NDTweaksCtx = createContext<Ctx>({
  tweaks: DEFAULTS,
  setTweak: () => {},
  reset: () => {},
});

function readStored(): NDTweaks {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<NDTweaks>;
    return {
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      animations: parsed.animations === 'off' ? 'off' : 'on',
      sigilGlow: parsed.sigilGlow === 'off' ? 'off' : 'on',
    };
  } catch {
    return DEFAULTS;
  }
}

function applyToHtml(t: NDTweaks) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('data-nd-density', t.density);
  el.setAttribute('data-nd-anim', t.animations);
  el.setAttribute('data-nd-glow', t.sigilGlow);
}

export function NDTweaksProvider({ children }: { children: ReactNode }) {
  const [tweaks, setTweaks] = useState<NDTweaks>(DEFAULTS);

  // Load once after mount so SSR markup matches server defaults.
  useEffect(() => {
    const initial = readStored();
    setTweaks(initial);
  }, []);

  // Mirror to <html> attributes and persist.
  useEffect(() => {
    applyToHtml(tweaks);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
    } catch {
      /* storage unavailable */
    }
  }, [tweaks]);

  const setTweak = useCallback<Ctx['setTweak']>((key, value) => {
    setTweaks(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setTweaks(DEFAULTS), []);

  return <NDTweaksCtx.Provider value={{ tweaks, setTweak, reset }}>{children}</NDTweaksCtx.Provider>;
}

export function useNDTweaks(): Ctx {
  return useContext(NDTweaksCtx);
}
