/**
 * Race-aware visual tokens for the battle scene.
 * Accepts both Turkish (insan/zerg/otomat/canavar/seytan) and legacy English
 * (human/zerg/automaton) keys — falls back to "insan" (human, blue) when
 * an unknown race is passed.
 */
export interface RaceVisual {
  /** Phaser numeric hex (0xRRGGBB) */
  hex: number;
  /** CSS hex string (#rrggbb) */
  str: string;
  /** Race label rendered in HUD */
  label: string;
  /** Single-glyph race icon */
  icon: string;
}

const PALETTE: Record<string, RaceVisual> = {
  insan:    { hex: 0x4a9eff, str: '#4a9eff', label: 'INSAN',   icon: '⚔' },
  zerg:     { hex: 0x44ff44, str: '#44ff44', label: 'ZERG',    icon: '☣' },
  otomat:   { hex: 0x00cfff, str: '#00cfff', label: 'OTOMAT',  icon: '◆' },
  canavar:  { hex: 0xff6600, str: '#ff6600', label: 'CANAVAR', icon: '☠' },
  seytan:   { hex: 0xcc00ff, str: '#cc00ff', label: 'SEYTAN',  icon: '✶' },
};

const ALIASES: Record<string, string> = {
  human:     'insan',
  automaton: 'otomat',
  monster:   'canavar',
  demon:     'seytan',
};

export function getRaceVisual(race: string | undefined): RaceVisual {
  if (!race) return PALETTE.insan;
  const key = ALIASES[race] ?? race;
  return PALETTE[key] ?? PALETTE.insan;
}
