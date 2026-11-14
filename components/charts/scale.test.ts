import { labelIndices, niceScale, shortDate } from './scale';

it('niceScale – kroki 1/2/5', () => {
  expect(niceScale(0)).toEqual({ max: 3, step: 1 });
  expect(niceScale(10)).toEqual({ max: 10, step: 5 });
  expect(niceScale(43)).toEqual({ max: 60, step: 20 });
  expect(niceScale(140)).toEqual({ max: 150, step: 50 });
});
it('etykiety osi', () => {
  expect(shortDate('2026-11-04')).toBe('4.11');
  expect(labelIndices(30)).toEqual([0, 14, 29]);
  expect(labelIndices(2)).toEqual([0, 1]);
});
