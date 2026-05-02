import { TICKS_PER_HOUR, TICK_INTERVAL_MS } from './economy.service';

// ── Pure formula helpers (no DI required) ────────────────────────────────────

function computeProductionPerTick(basePerHour: number, level: number, exponent = 1.25): number {
  return (basePerHour * Math.pow(exponent, level - 1)) / TICKS_PER_HOUR;
}

function computeStorageCap(baseCap: number, ageMultiplier: number): number {
  return Math.floor(baseCap * ageMultiplier);
}

function applyOfflineAccumulation(params: {
  current: number;
  cap: number;
  perTick: number;
  offlineMs: number;
}): number {
  const { current, cap, perTick, offlineMs } = params;
  const missedTicks = Math.floor(offlineMs / TICK_INTERVAL_MS);
  return Math.min(Math.floor(current + perTick * missedTicks), cap);
}

// ── Production formula: base × 1.25^(level-1) ───────────────────────────────

describe('Production formula', () => {
  const MINERAL_BASE = 1000; // per hour at Level 1

  it('Level 1 → base rate', () => {
    const rate = computeProductionPerTick(MINERAL_BASE, 1);
    // 1000/hr ÷ 120 ticks/hr = 8.333.../tick
    expect(rate).toBeCloseTo(1000 / TICKS_PER_HOUR, 6);
  });

  it('Level 2 → 1.25× base', () => {
    const rate = computeProductionPerTick(MINERAL_BASE, 2);
    expect(rate).toBeCloseTo((MINERAL_BASE * 1.25) / TICKS_PER_HOUR, 6);
  });

  it('Level 3 → 1.25² × base', () => {
    const rate = computeProductionPerTick(MINERAL_BASE, 3);
    expect(rate).toBeCloseTo((MINERAL_BASE * 1.25 ** 2) / TICKS_PER_HOUR, 6);
  });

  it('Level 5 → 1.25⁴ × base (~2.44× multiplier)', () => {
    const l1 = computeProductionPerTick(MINERAL_BASE, 1);
    const l5 = computeProductionPerTick(MINERAL_BASE, 5);
    expect(l5 / l1).toBeCloseTo(1.25 ** 4, 5);
  });

  it('Tier 1→5 upgrade: production increases at each level', () => {
    const rates = [1, 2, 3, 4, 5].map((lvl) => computeProductionPerTick(MINERAL_BASE, lvl));
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    }
  });

  it('Gas base 600/hr at Level 1', () => {
    const rate = computeProductionPerTick(600, 1);
    expect(rate).toBeCloseTo(600 / TICKS_PER_HOUR, 6);
  });

  it('Energy base 350/hr at Level 1', () => {
    const rate = computeProductionPerTick(350, 1);
    expect(rate).toBeCloseTo(350 / TICKS_PER_HOUR, 6);
  });
});

// ── Storage cap curve ────────────────────────────────────────────────────────

describe('Storage cap curve', () => {
  const MINERAL_BASE_CAP = 24_000;
  const AGE_MULTIPLIERS = [1, 2.5, 6, 14, 30, 60];

  it('Age 1 → base cap (1×)', () => {
    expect(computeStorageCap(MINERAL_BASE_CAP, AGE_MULTIPLIERS[0])).toBe(24_000);
  });

  it('Age 2 → 2.5×', () => {
    expect(computeStorageCap(MINERAL_BASE_CAP, AGE_MULTIPLIERS[1])).toBe(60_000);
  });

  it('Age 3 → 6×', () => {
    expect(computeStorageCap(MINERAL_BASE_CAP, AGE_MULTIPLIERS[2])).toBe(144_000);
  });

  it('Age 6 → 60×', () => {
    expect(computeStorageCap(MINERAL_BASE_CAP, AGE_MULTIPLIERS[5])).toBe(1_440_000);
  });

  it('Cap increases at each age', () => {
    const caps = AGE_MULTIPLIERS.map((m) => computeStorageCap(MINERAL_BASE_CAP, m));
    for (let i = 1; i < caps.length; i++) {
      expect(caps[i]).toBeGreaterThan(caps[i - 1]);
    }
  });
});

// ── Offline accumulation ─────────────────────────────────────────────────────

describe('Offline accumulation', () => {
  // Mineral extractor base 1000/hr at Level 1 → 8.333.../tick
  const MINERAL_PER_TICK = 1000 / TICKS_PER_HOUR;
  const MINERAL_CAP = 24_000;

  const hours = (h: number) => h * 60 * 60 * 1000; // ms

  it('8 hours offline → accumulation under cap', () => {
    const result = applyOfflineAccumulation({
      current: 0,
      cap: MINERAL_CAP,
      perTick: MINERAL_PER_TICK,
      offlineMs: hours(8),
    });
    // 8h × 1000/hr = 8000
    expect(result).toBe(8000);
    expect(result).toBeLessThan(MINERAL_CAP);
  });

  it('24 hours offline → reaches full cap', () => {
    const result = applyOfflineAccumulation({
      current: 0,
      cap: MINERAL_CAP,
      perTick: MINERAL_PER_TICK,
      offlineMs: hours(24),
    });
    // 24h × 1000/hr = 24000 = cap
    expect(result).toBe(MINERAL_CAP);
  });

  it('48 hours offline → still at cap (no overflow loss)', () => {
    const result = applyOfflineAccumulation({
      current: 0,
      cap: MINERAL_CAP,
      perTick: MINERAL_PER_TICK,
      offlineMs: hours(48),
    });
    expect(result).toBe(MINERAL_CAP);
  });

  it('already at cap → no change after offline', () => {
    const result = applyOfflineAccumulation({
      current: MINERAL_CAP,
      cap: MINERAL_CAP,
      perTick: MINERAL_PER_TICK,
      offlineMs: hours(12),
    });
    expect(result).toBe(MINERAL_CAP);
  });

  it('partial fill → correctly accumulates up to cap', () => {
    const result = applyOfflineAccumulation({
      current: 20_000,
      cap: MINERAL_CAP,
      perTick: MINERAL_PER_TICK,
      offlineMs: hours(6), // 6h at 1000/hr = 6000 more → 26000, capped at 24000
    });
    expect(result).toBe(MINERAL_CAP);
  });

  it('zero production rate → resources unchanged', () => {
    const result = applyOfflineAccumulation({
      current: 500,
      cap: MINERAL_CAP,
      perTick: 0,
      offlineMs: hours(24),
    });
    expect(result).toBe(500);
  });

  it('sub-tick offline duration → no change', () => {
    const result = applyOfflineAccumulation({
      current: 100,
      cap: MINERAL_CAP,
      perTick: MINERAL_PER_TICK,
      offlineMs: TICK_INTERVAL_MS - 1, // just under 30s
    });
    expect(result).toBe(100);
  });
});

// ── TICKS_PER_HOUR sanity ────────────────────────────────────────────────────

describe('Tick interval constants', () => {
  it('TICKS_PER_HOUR = 3600s / 30s = 120', () => {
    expect(TICKS_PER_HOUR).toBe(120);
  });

  it('TICK_INTERVAL_MS = 30 seconds', () => {
    expect(TICK_INTERVAL_MS).toBe(30_000);
  });
});
