import { contrastRatio, bestTextOn } from '@/lib/color';
import { palettes } from '@/theme/colors';
import { buildMonth } from './month';

const ex = (id: string) => ({
  id,
  active: true,
  createdAt: '2026-10-01T08:00:00.000Z',
  deletedAt: null,
});
const exercises = [ex('a'), ex('b'), ex('c'), ex('d'), ex('e')];

describe('buildMonth', () => {
  const m = buildMonth(
    '2026-11-01',
    '2026-11-14',
    exercises,
    [
      { exerciseId: 'a', date: '2026-11-02' },
      ...['a', 'b', 'c', 'd', 'e'].map((id) => ({ exerciseId: id, date: '2026-11-03' })),
      { exerciseId: 'a', date: '2026-11-04' },
      { exerciseId: 'b', date: '2026-11-04' },
      { exerciseId: 'a', date: '2026-10-31' }, // poza miesiącem – ignorowane w statystykach
    ],
    [
      { date: '2026-11-02', catches: 3, tension: 6, note: '' },
      { date: '2026-11-05', catches: 2, tension: 3, note: 'Szczęka luźniej' },
      { date: '2026-11-06', catches: 0, tension: null, note: '   ' },
    ],
  );
  const day = (d: string) => m.weeks.flat().find((x) => x?.date === d)!;

  it('siatka od poniedziałku, 30 dni listopada', () => {
    expect(m.weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(m.weeks[0]![6]?.date).toBe('2026-11-01');
  });

  it('poziomy intensywności', () => {
    expect(day('2026-11-01').level).toBe(0);
    expect(day('2026-11-02').level).toBe(1); // 20%
    expect(day('2026-11-04').level).toBe(2); // 40%
    expect(day('2026-11-03').level).toBe(3); // 100%
  });

  it('kropka przy notatce lub napięciu (puste spacje się nie liczą)', () => {
    expect(day('2026-11-02').hasEntry).toBe(true);
    expect(day('2026-11-05').hasEntry).toBe(true);
    expect(day('2026-11-06').hasEntry).toBe(false);
  });

  it('dni przyszłe i dzisiejszy', () => {
    expect(day('2026-11-14').isToday).toBe(true);
    expect(day('2026-11-15').isFuture).toBe(true);
  });

  it('statystyki miesiąca', () => {
    expect(m.stats).toEqual({ trainingDays: 3, fullDays: 1, avgTension: 4.5, totalCatches: 5 });
  });

  it('miesiąc bez danych', () => {
    const empty = buildMonth('2026-02-01', '2026-11-14', [], [], []);
    expect(empty.stats).toEqual({
      trainingDays: 0,
      fullDays: 0,
      avgTension: null,
      totalCatches: 0,
    });
    expect(empty.weeks).toHaveLength(5); // luty 2026: 1. to niedziela
  });
});

describe('kontrast skali kalendarza (WCAG AA)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`każdy poziom ma czytelny numer dnia – ${scheme}`, () => {
      const c = palettes[scheme];
      for (const bg of c.scale) {
        const fg = bestTextOn(bg, [c.text, c.onPrimary, '#FFFFFF', '#0B1A22']);
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
