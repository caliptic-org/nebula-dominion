/**
 * Phaser scene color palette — mirrors the CSS design tokens in globals.css.
 * Phaser uses numeric hex (0xRRGGBB) or string hex ('#RRGGBB').
 */
export const THEME = {
  // Backgrounds — deep space black
  BG:          0x080a10,
  BG_SURFACE:  0x0d1117,
  BG_ELEVATED: 0x141d2b,
  BG_PANEL:    0x0a0e1a,

  // Text (string form for Phaser text objects)
  TEXT_PRIMARY:   '#e8e8f0',
  TEXT_SECONDARY: '#a0a8c0',
  TEXT_MUTED:     '#555d7a',

  // Brand (İnsan blue — overridden per race at runtime)
  BRAND:      0x4a9eff,
  BRAND_STR:  '#4a9eff',

  // Accent
  ACCENT:     0x00cfff,
  ACCENT_STR: '#00cfff',

  // Energy (gold)
  ENERGY:     0xffc832,
  ENERGY_STR: '#ffc832',

  // Status
  SUCCESS:     0x44ff88,
  SUCCESS_STR: '#44ff88',
  DANGER:      0xff3355,
  DANGER_STR:  '#ff3355',
  WARNING:     0xffaa22,
  WARNING_STR: '#ffaa22',
  INFO:        0x4488ff,
  INFO_STR:    '#4488ff',

  // Battle grid — manga panel style
  GRID_PLAYER_SIDE: 0x1a2a44,
  GRID_ENEMY_SIDE:  0x3a1a20,
  GRID_DIVIDER:     0x2a2a55,
  GRID_REACHABLE:   0x4a9eff,

  // Unit HP bar thresholds
  HP_HIGH:   0x44ff88,
  HP_MED:    0xffaa22,
  HP_LOW:    0xff3355,

  // HUD — manga dark panel
  HUD_BG:       0x080a10,
  HUD_MANA:     0xcc00ff,
  HUD_MANA_BG:  0x1a0a22,
  HUD_END_TURN: '#44ff88',
  HUD_SURRENDER:'#ff3355',

  // Win/Lose panels
  WIN_PANEL:     0x0a1a0a,
  WIN_BORDER:    0x44ff88,
  LOSE_PANEL:    0x1a0a0a,
  LOSE_BORDER:   0xff3355,

  // Rewards
  REWARD_MINERAL: '#4a9eff',
  REWARD_GAS:     '#44ff88',
  REWARD_XP:      '#ffc832',

  // Race colors (for dynamic theming in scenes)
  RACE: {
    insan:   { num: 0x4a9eff, str: '#4a9eff', glow: '#4a9eff44' },
    zerg:    { num: 0x44ff44, str: '#44ff44', glow: '#44ff4444' },
    otomat:  { num: 0x00cfff, str: '#00cfff', glow: '#00cfff44' },
    canavar: { num: 0xff6600, str: '#ff6600', glow: '#ff660044' },
    seytan:  { num: 0xcc00ff, str: '#cc00ff', glow: '#cc00ff44' },
  },
} as const;

export const UNIT_COLORS: Record<string, number> = {
  marine:      0x4a9eff,
  medic:       0x44ffaa,
  siege_tank:  0x2255cc,
  ghost:       0x9966ff,
  zergling:    0x44ff44,
  hydralisk:   0x22cc44,
  ultralisk:   0x11aa22,
  queen:       0x66ff66,
  sentinel:    0x00cfff,
  fabricator:  0x0099cc,
  colossus:    0x00aaee,
  ravager:     0xff6600,
  predator:    0xcc4400,
  titan:       0xff8833,
  shade:       0xcc00ff,
  warlock:     0xaa00dd,
  dreadlord:   0x880099,
};
