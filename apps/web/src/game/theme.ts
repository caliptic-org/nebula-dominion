/**
 * Phaser scene color palette — mirrors the CSS design tokens in globals.css.
 * Phaser uses numeric hex (0xRRGGBB) or string hex ('#RRGGBB').
 * Keep these in sync with var(--color-*) in globals.css.
 */
export const THEME = {
  // Backgrounds
  BG:          0x07090f,
  BG_SURFACE:  0x0d1020,
  BG_ELEVATED: 0x141828,
  BG_PANEL:    0x0d0d22,

  // Text (string form for Phaser text objects)
  TEXT_PRIMARY:   '#e8e8f0',
  TEXT_SECONDARY: '#a8a8c0',
  TEXT_MUTED:     '#666882',

  // Brand
  BRAND:      0x7b8cde,
  BRAND_STR:  '#7b8cde',

  // Accent (teal)
  ACCENT:     0x44d9c8,
  ACCENT_STR: '#44d9c8',

  // Energy (gold)
  ENERGY:     0xffc832,
  ENERGY_STR: '#ffc832',

  // Status
  SUCCESS:     0x44dd88,
  SUCCESS_STR: '#44dd88',
  DANGER:      0xff4444,
  DANGER_STR:  '#ff4444',
  WARNING:     0xffaa22,
  WARNING_STR: '#ffaa22',
  INFO:        0x4488ff,
  INFO_STR:    '#4488ff',

  // Battle grid
  GRID_PLAYER_SIDE: 0x223366,
  GRID_ENEMY_SIDE:  0x662233,
  GRID_DIVIDER:     0x3333aa,
  GRID_REACHABLE:   0x4488ff,

  // Unit HP bar thresholds  (0x44dd88 → 0xffaa22 → 0xff2222)
  HP_HIGH:   0x44dd88,
  HP_MED:    0xffaa22,
  HP_LOW:    0xff2222,

  // HUD
  HUD_BG:       0x0a0a20,
  HUD_MANA:     0x9966ff,
  HUD_MANA_BG:  0x1a1a3a,
  HUD_END_TURN: '#44ff88',
  HUD_SURRENDER:'#ff6666',

  // Win/Lose panels
  WIN_PANEL:     0x0d2d0d,
  WIN_BORDER:    0x44ff88,
  LOSE_PANEL:    0x2d0d0d,
  LOSE_BORDER:   0xff4444,

  // Rewards
  REWARD_MINERAL: '#60aaff',
  REWARD_GAS:     '#88ffaa',
  REWARD_XP:      '#ffcc44',
} as const;

/** Unit body colors keyed by unit type string */
export const UNIT_COLORS: Record<string, number> = {
  soldier:   0x4488ff,
  tank:      0x2244aa,
  medic:     0x44ffaa,
  sniper:    0xaa44ff,
  overlord:  0xff8844,
  drone:     0xaaff44,
  guardian:  0xffaa44,
};
