import { buildProgress, movingAverage, rangeDates } from './progress';

describe('rangeDates', () => {
  it('zakresy 7/30/90 kończą się dziś', () => {
    expect(rangeDates('7', '2026-11-14', '2026-10-01')).toEqual({
      from: '2026-11-08',
      to: '2026-11-14',
    });
    expect(rangeDates('30', '2026-11-14', '2026-10-01').from).toBe('2026-10-16');
  });
  it('cały program – od startu, min. 7 dni', () => {
    expect(rangeDates('program', '2026-11-14', '2026-10-01').from).toBe('2026-10-01');
    expect(rangeDates('program', '2026-11-14', '2026-11-13').from).toBe('2026-11-08');
  });
});

describe('movingAverage', () => {
  it('średnia z dostępnych wartości w oknie 7 dni', () => {
    const pts = [8, null, 6, null, null, null, null, null, null, 4].map((value, i) => ({
      date: String(i),
      value,
    }));
    const ma = movingAverage(pts).map((p) => p.value);
    expect(ma[0]).toBe(8);
    expect(ma[2]).toBe(7);
    expect(ma[6]).toBe(7);
    expect(ma[8]).toBe(6); // okno 2..8 zawiera tylko 6
    expect(ma[9]).toBe(4); // okno 3..9 zawiera tylko 4
  });
});

describe('buildProgress', () => {
  const data = buildProgress({
    from: '2026-11-09',
    to: '2026-11-14',
    today: '2026-11-14',
    logs: [
      { date: '2026-11-05', catches: 1, tension: 8 }, // przed zakresem – tylko do średniej kroczącej
      { date: '2026-11-09', catches: 3, tension: 6 },
      { date: '2026-11-11', catches: 2, tension: 4 },
      { date: '2026-11-14', catches: 5, tension: null },
    ],
    completions: [
      { exerciseId: 'a', date: '2026-11-09', durationS: 300 },
      { exerciseId: 'b', date: '2026-11-09', durationS: 0 }, // ręcznie odhaczone → minuty z ćwiczenia
      { exerciseId: 'a', date: '2026-11-08', durationS: 600 }, // poza zakresem
      { exerciseId: 'a', date: '2026-11-12', durationS: 240 },
    ],
    exerciseMinutes: new Map([
      ['a', 5],
      ['b', 2],
    ]),
    allActiveDays: ['2026-11-08', '2026-11-09', '2026-11-12', '2026-11-13'],
  });

  it('dni zakresu i wartości dzienne', () => {
    expect(data.days).toHaveLength(6);
    expect(data.catches.map((p) => p.value)).toEqual([3, 0, 2, 0, 0, 5]);
    expect(data.tension.map((p) => p.value)).toEqual([6, null, 4, null, null, null]);
  });

  it('średnia krocząca uwzględnia dni sprzed zakresu', () => {
    expect(data.tensionAvg7[0]?.value).toBe(7); // (8 + 6) / 2
    expect(data.tensionAvg7[2]?.value).toBe(6); // (8 + 6 + 4) / 3
  });

  it('minuty tygodniowo z fallbackiem na czas ćwiczenia', () => {
    expect(data.weeklyMinutes).toEqual([{ weekStart: '2026-11-09', minutes: 11, partial: true }]); // tydzień trwa
    expect(data.summary.totalMinutes).toBe(11);
  });

  it('podsumowanie i serie', () => {
    expect(data.summary).toMatchObject({
      avgTension: 5,
      totalCatches: 10,
      activeDays: 2,
      trackedDays: 6,
    });
    expect(data.summary.tensionChange).toBe(-2); // 7 → 5
    expect(data.streak).toEqual({ current: 2, longest: 2 });
  });
});
