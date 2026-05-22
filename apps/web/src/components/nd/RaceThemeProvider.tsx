'use client';

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { RACES, type RaceKey, type RaceTheme } from '@/lib/nd-tokens';

interface RaceThemeContextValue {
  race: RaceTheme;
  raceKey: RaceKey;
}

const RaceThemeContext = createContext<RaceThemeContextValue | null>(null);

interface RaceThemeProviderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Race key to theme this subtree with. Defaults to `'insan'`. */
  race?: RaceKey;
  children: ReactNode;
  /** Tag for the wrapping element. Defaults to `div`. */
  as?: 'div' | 'section' | 'main' | 'article';
}

type ThemeVars = CSSProperties & {
  '--nd-primary': string;
  '--nd-primary-dim': string;
  '--nd-glow': string;
};

/**
 * Applies a race theme to its subtree by writing `--nd-primary`,
 * `--nd-primary-dim`, and `--nd-glow` onto a wrapping element. Children can
 * consume them either as raw `text-[var(--nd-primary)]` etc., or via the
 * Tailwind aliases `text-nd-primary` / `bg-nd-primary` / `border-nd-glow`.
 *
 * The same vars are also reflected onto the `<html>` element via
 * `data-race` rules in `nd-handoff.css`, so global gradients stay in sync.
 */
export function RaceThemeProvider({
  race = 'insan',
  children,
  as: Tag = 'div',
  style,
  ...rest
}: RaceThemeProviderProps) {
  const theme = RACES[race] ?? RACES.insan;

  const cssVars: ThemeVars = {
    '--nd-primary': theme.primary,
    '--nd-primary-dim': theme.primaryDim,
    '--nd-glow': theme.glow,
  };

  const value = useMemo<RaceThemeContextValue>(
    () => ({ race: theme, raceKey: theme.key }),
    [theme],
  );

  return (
    <RaceThemeContext.Provider value={value}>
      <Tag
        data-nd-race={theme.key}
        style={{ ...cssVars, ...style }}
        {...rest}
      >
        {children}
      </Tag>
    </RaceThemeContext.Provider>
  );
}

/** Returns the current race theme. Throws when called outside a provider. */
export function useRaceThemeStrict(): RaceThemeContextValue {
  const ctx = useContext(RaceThemeContext);
  if (!ctx) {
    throw new Error('useRaceThemeStrict must be used inside <RaceThemeProvider>.');
  }
  return ctx;
}

/** Returns the current race theme, falling back to `'insan'` when no provider exists. */
export function useNDTheme(): RaceThemeContextValue {
  const ctx = useContext(RaceThemeContext);
  if (ctx) return ctx;
  return { race: RACES.insan, raceKey: 'insan' };
}
