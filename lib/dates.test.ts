import { addDays, addMonths, diffDays, isoWeekday, monthGrid, startOfWeek } from './dates';

describe('dates', () => {
  it('addDays przechodzi przez granice miesięcy i lat', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('diffDays jest odporne na zmianę czasu', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('tydzień zaczyna się w poniedziałek', () => {
    expect(isoWeekday('2026-11-15')).toBe(7); // niedziela
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09');
  });

  it('monthGrid: listopad 2026 zaczyna się w niedzielę', () => {
    const grid = monthGrid('2026-11-14');
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });

  it('addMonths', () => {
    expect(addMonths('2026-11-14', 2)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
  });
});
