import { EloService } from './elo.service';

describe('EloService', () => {
  let svc: EloService;

  beforeEach(() => {
    svc = new EloService();
  });

  describe('expectedScore', () => {
    it('returns 0.5 for equal elo', () => {
      expect(svc.expectedScore(1000, 1000)).toBeCloseTo(0.5);
    });

    it('returns > 0.5 when player has higher elo', () => {
      expect(svc.expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    });

    it('returns < 0.5 when player has lower elo', () => {
      expect(svc.expectedScore(800, 1000)).toBeLessThan(0.5);
    });
  });

  describe('calculate', () => {
    it('increases elo on win', () => {
      const result = svc.calculate(1000, 1000, true, 50);
      expect(result.newElo).toBeGreaterThan(1000);
      expect(result.delta).toBeGreaterThan(0);
    });

    it('decreases elo on loss', () => {
      const result = svc.calculate(1000, 1000, false, 50);
      expect(result.newElo).toBeLessThan(1000);
      expect(result.delta).toBeLessThan(0);
    });

    it('uses K=40 for new players (< 30 games)', () => {
      const win = svc.calculate(1000, 1000, true, 10);
      const winEstablished = svc.calculate(1000, 1000, true, 50);
      expect(win.delta).toBeGreaterThan(winEstablished.delta);
    });

    it('uses K=10 for established players (>= 2400 elo)', () => {
      const result = svc.calculate(2400, 2400, true, 200);
      expect(result.delta).toBeLessThanOrEqual(10);
    });

    it('never drops below 100 elo', () => {
      const result = svc.calculate(100, 2000, false, 100);
      expect(result.newElo).toBeGreaterThanOrEqual(100);
    });

    it('winner gains roughly what loser loses at equal elo', () => {
      const win = svc.calculate(1000, 1000, true, 50);
      const lose = svc.calculate(1000, 1000, false, 50);
      expect(win.delta + lose.delta).toBeCloseTo(0, 0);
    });
  });

  describe('isWithinRange', () => {
    it('returns true when elo difference is within range', () => {
      expect(svc.isWithinRange(1000, 1050, 100)).toBe(true);
    });

    it('returns false when elo difference exceeds range', () => {
      expect(svc.isWithinRange(1000, 1200, 100)).toBe(false);
    });

    it('returns true at exact boundary', () => {
      expect(svc.isWithinRange(1000, 1100, 100)).toBe(true);
    });
  });
});
