// Re-export the full context-based implementation from the .tsx file.
// This file exists so that both `.ts` and `.tsx` module resolution paths
// resolve to the same implementation.
export { RaceThemeProvider, useRaceTheme } from './useRaceTheme.tsx';
