import { clampConfig, phaseAt, totalCycles, totalMs } from './engine';

const cfg = { inhaleS: 4, exhaleS: 6, restS: 0, durationS: 60 };

describe('pacer engine', () => {
  it('liczba oddechów zaokrąglona do pełnych cykli', () => {
    expect(totalCycles(cfg)).toBe(6);
    expect(totalMs(cfg)).toBe(60_000);
    expect(totalCycles({ ...cfg, durationS: 64 })).toBe(6);
    expect(totalCycles({ ...cfg, durationS: 3 })).toBe(1);
  });

  it('fazy i odliczanie w dół', () => {
    expect(phaseAt(0, cfg)).toMatchObject({ phase: 'inhale', countdown: 4, cycle: 0 });
    expect(phaseAt(999, cfg)).toMatchObject({ phase: 'inhale', countdown: 4 });
    expect(phaseAt(1000, cfg)).toMatchObject({ phase: 'inhale', countdown: 3 });
    expect(phaseAt(3999, cfg)).toMatchObject({ phase: 'inhale', countdown: 1 });
    expect(phaseAt(4000, cfg)).toMatchObject({ phase: 'exhale', countdown: 6 });
    expect(phaseAt(10_000, cfg)).toMatchObject({ phase: 'inhale', cycle: 1 });
  });

  it('poziom koła: rośnie na wdechu, maleje na wydechu, sinusoidalnie', () => {
    expect(phaseAt(0, cfg).level).toBeCloseTo(0);
    expect(phaseAt(2000, cfg).level).toBeCloseTo(0.5);
    expect(phaseAt(3999, cfg).level).toBeGreaterThan(0.99);
    expect(phaseAt(7000, cfg).level).toBeCloseTo(0.5);
    // wygładzenie: w 1/4 wdechu poziom < 1/4 (powolny start)
    expect(phaseAt(1000, cfg).level).toBeLessThan(0.25);
  });

  it('opcjonalna pauza po wydechu (nie ma pauzy po wdechu)', () => {
    const c = { ...cfg, restS: 2 };
    expect(phaseAt(10_500, c)).toMatchObject({ phase: 'rest', countdown: 2, level: 0 });
    expect(phaseAt(12_000, c)).toMatchObject({ phase: 'inhale', cycle: 1 });
  });

  it('koniec sesji', () => {
    expect(phaseAt(60_000, cfg).finished).toBe(true);
    expect(phaseAt(59_999, cfg)).toMatchObject({ finished: false, phase: 'exhale', countdown: 1 });
  });

  it('clampConfig pilnuje zakresów', () => {
    expect(clampConfig({ inhaleS: 0, exhaleS: 40, restS: -1, durationS: 0 })).toEqual({
      inhaleS: 2,
      exhaleS: 14,
      restS: 0,
      durationS: 60,
    });
  });
});
