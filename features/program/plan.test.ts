import { programPhase, weekPlanFor } from './plan';

describe('programPhase', () => {
  const start = '2026-11-02';

  it('dzień startu to tydzień 1, dzień 1', () => {
    expect(programPhase(start, '2026-11-02')).toEqual({ kind: 'week', week: 1, dayOfProgram: 1 });
  });

  it('dzień 7 to nadal tydzień 1, dzień 8 to tydzień 2', () => {
    expect(programPhase(start, '2026-11-08')).toMatchObject({ week: 1, dayOfProgram: 7 });
    expect(programPhase(start, '2026-11-09')).toMatchObject({ week: 2, dayOfProgram: 8 });
  });

  it('dzień 28 to tydzień 4, dzień 29 to plan podtrzymujący', () => {
    expect(programPhase(start, '2026-11-29')).toMatchObject({ kind: 'week', week: 4 });
    expect(programPhase(start, '2026-11-30')).toEqual({ kind: 'maintenance', dayOfProgram: 29 });
  });

  it('przed startem zwraca liczbę dni do startu', () => {
    expect(programPhase(start, '2026-10-30')).toEqual({ kind: 'notStarted', daysUntilStart: 3 });
  });

  it('poprawnie liczy przez zmianę czasu (koniec października)', () => {
    expect(programPhase('2026-10-20', '2026-10-27')).toMatchObject({ week: 2, dayOfProgram: 8 });
  });

  it('weekPlanFor zwraca plan tylko w tygodniach programu', () => {
    expect(weekPlanFor(programPhase(start, '2026-11-20'))?.exhaleOverrides.c5).toBe(8);
    expect(weekPlanFor(programPhase(start, '2026-12-20'))).toBeNull();
  });
});
