import { BattlesStubController } from './battles-stub.controller';

/**
 * cycle-27 audit ROOKIE_BAND_BYPASSED — the PvE defender band used to jump
 * straight from the rookie 0.6× (no floor) to the full 0.9× + 4000 floor the
 * moment a player hit Lv3 (~1-2h in), a sharp retention-hazard cliff. A Lv 3-5
 * transition band now ramps both levers. These tests pin the smoothing.
 */
describe('BattlesStubController — defender difficulty band', () => {
  // deriveDefenderPower is pure (constants only), so the deps can be null.
  const ctrl = new BattlesStubController(null as any, null as any, null as any);
  const derive = (power: number, level: number): number =>
    (ctrl as any).deriveDefenderPower(power, level);

  it('rookie (Lv ≤ 2): guaranteed-beatable 0.6× fleet, no floor', () => {
    expect(derive(10_000, 1)).toBe(6_000);
    expect(derive(10_000, 2)).toBe(6_000);
  });

  it('veteran (Lv ≥ 6): full 0.9× fleet with the 4000 floor', () => {
    expect(derive(10_000, 6)).toBe(9_000);
    expect(derive(10_000, 99)).toBe(9_000);
    expect(derive(1_000, 6)).toBe(4_000); // floor dominates a weak fleet
  });

  it('transition (Lv 3–5) ramps smoothly with no cliff', () => {
    const power = 10_000;
    const series = [2, 3, 4, 5, 6].map((lv) => derive(power, lv));
    // monotonically increasing across the whole band
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i]).toBeGreaterThan(series[i - 1]);
    }
    // every step is gentle — nowhere near the old ~3000 (0.6→0.9 + floor) jump
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i] - series[i - 1]).toBeLessThanOrEqual(900);
    }
    // exact interpolation checkpoints (t = 0.25 / 0.5 / 0.75)
    expect(derive(power, 3)).toBe(6_750);
    expect(derive(power, 4)).toBe(7_500);
    expect(derive(power, 5)).toBe(8_250);
  });
});
