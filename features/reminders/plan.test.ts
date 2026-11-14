import type { ReminderSettings } from '@/db/schema';
import { breathCheckMinutes, MAX_SCHEDULED, planBreathChecks, toDate } from './plan';

const base: ReminderSettings = {
  enabled: true,
  morning: { enabled: true, time: '07:30' },
  evening: { enabled: true, time: '21:00' },
  breathCheck: {
    enabled: true,
    count: 4,
    windowStart: '09:00',
    windowEnd: '17:00',
    mode: 'random',
    weekdays: [1, 2, 3, 4, 5],
  },
};

describe('breathCheckMinutes', () => {
  it('równe odstępy', () => {
    expect(breathCheckMinutes(4, '09:00', '17:00', 'even', 'x')).toEqual([600, 720, 840, 960]);
  });

  it('losowo: w oknie, rosnąco, z minimalnym odstępem, deterministycznie', () => {
    const a = breathCheckMinutes(5, '09:00', '17:00', 'random', '2026-11-16');
    expect(a).toEqual(breathCheckMinutes(5, '09:00', '17:00', 'random', '2026-11-16'));
    expect(a).not.toEqual(breathCheckMinutes(5, '09:00', '17:00', 'random', '2026-11-17'));
    expect(a.every((m) => m >= 540 && m < 1020)).toBe(true);
    for (let i = 1; i < a.length; i++) expect(a[i]! - a[i - 1]!).toBeGreaterThanOrEqual(20);
  });

  it('puste okno lub 0 przypomnień', () => {
    expect(breathCheckMinutes(3, '17:00', '09:00', 'even', 'x')).toEqual([]);
    expect(breathCheckMinutes(0, '09:00', '17:00', 'even', 'x')).toEqual([]);
  });

  it('limit 8 dziennie', () => {
    expect(breathCheckMinutes(20, '08:00', '20:00', 'even', 'x')).toHaveLength(8);
  });
});

describe('planBreathChecks', () => {
  // 2026-11-14 to sobota
  it('tylko wybrane dni tygodnia', () => {
    const plan = planBreathChecks(base, '2026-11-14', new Date(2026, 10, 14, 8, 0));
    expect(new Set(plan.map((p) => p.date))).toEqual(
      new Set(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']),
    );
    expect(plan).toHaveLength(20);
  });

  it('pomija godziny, które dziś już minęły', () => {
    const r = {
      ...base,
      breathCheck: { ...base.breathCheck, mode: 'even' as const, weekdays: [6] },
    };
    const plan = planBreathChecks(r, '2026-11-14', new Date(2026, 10, 14, 13, 0), 1);
    expect(plan.map((p) => p.minute)).toEqual([840, 960]);
  });

  it('wyłączone przypomnienia = pusty plan', () => {
    expect(planBreathChecks({ ...base, enabled: false }, '2026-11-14', new Date())).toEqual([]);
    expect(
      planBreathChecks(
        { ...base, breathCheck: { ...base.breathCheck, weekdays: [] } },
        '2026-11-14',
        new Date(),
      ),
    ).toEqual([]);
  });

  it('mieści się w limicie iOS', () => {
    const r = {
      ...base,
      breathCheck: { ...base.breathCheck, count: 8, weekdays: [1, 2, 3, 4, 5, 6, 7] },
    };
    expect(
      planBreathChecks(r, '2026-11-14', new Date(2026, 10, 14, 6, 0)).length,
    ).toBeLessThanOrEqual(MAX_SCHEDULED - 2);
  });

  it('toDate składa lokalną datę i godzinę', () => {
    const d = toDate('2026-11-16', 9 * 60 + 5);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([16, 9, 5]);
  });
});
