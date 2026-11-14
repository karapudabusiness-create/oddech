import { computeStreak } from './streak';
import { countsOnDay, dayProgress, intensityLevel } from './dayProgress';

describe('computeStreak', () => {
  const today = '2026-11-14';

  it('pusta historia', () => {
    expect(computeStreak([], today)).toEqual({ current: 0, longest: 0, todayCounted: false });
  });

  it('seria łącznie z dzisiaj', () => {
    const r = computeStreak(['2026-11-12', '2026-11-13', '2026-11-14'], today);
    expect(r).toEqual({ current: 3, longest: 3, todayCounted: true });
  });

  it('dzisiaj jeszcze nic – seria z wczoraj nie przepada', () => {
    expect(computeStreak(['2026-11-12', '2026-11-13'], today).current).toBe(2);
  });

  it('przerwa przedwczoraj zeruje obecną serię, ale pamięta najdłuższą', () => {
    const r = computeStreak(
      ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-12'],
      today,
    );
    expect(r.current).toBe(0);
    expect(r.longest).toBe(4);
  });

  it('seria przez przełom miesięcy, duplikaty i daty z przyszłości ignorowane', () => {
    const r = computeStreak(['2026-10-31', '2026-11-01', '2026-11-01', '2026-11-20'], '2026-11-01');
    expect(r).toEqual({ current: 2, longest: 2, todayCounted: true });
  });
});

describe('dayProgress', () => {
  const ex = (
    id: string,
    extra: Partial<{ active: boolean; createdAt: string; deletedAt: string | null }> = {},
  ) => ({
    id,
    active: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    deletedAt: null,
    ...extra,
  });

  it('liczy tylko ćwiczenia istniejące w danym dniu', () => {
    const list = [
      ex('a'),
      ex('b', { createdAt: '2026-11-10T08:00:00.000Z' }),
      ex('c', { deletedAt: '2026-11-05T10:00:00.000Z' }),
    ];
    expect(dayProgress(list, ['a'], '2026-11-04')).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(dayProgress(list, ['a', 'b'], '2026-11-12')).toEqual({ done: 2, total: 2, ratio: 1 });
  });

  it('wyłączone ćwiczenia nie liczą się do planu ani do wyniku', () => {
    expect(dayProgress([ex('a'), ex('b', { active: false })], ['b'], '2026-11-12')).toEqual({
      done: 0,
      total: 1,
      ratio: 0,
    });
  });

  it('countsOnDay', () => {
    expect(countsOnDay(ex('a'), '2026-10-31')).toBe(false);
    expect(countsOnDay(ex('a'), '2026-11-01')).toBe(true);
  });
});

describe('intensityLevel', () => {
  it('progi 0 / <40% / 40–79% / 80–100%', () => {
    expect(intensityLevel(0, false)).toBe(0);
    expect(intensityLevel(0.2, true)).toBe(1);
    expect(intensityLevel(0.4, true)).toBe(2);
    expect(intensityLevel(0.79, true)).toBe(2);
    expect(intensityLevel(0.8, true)).toBe(3);
    expect(intensityLevel(0, true)).toBe(1);
  });
});
