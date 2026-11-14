import { plural } from './index';

const day = ['dzień', 'dni', 'dni'] as const;
const raz = ['raz', 'razy', 'razy'] as const;
const minuta = ['minuta', 'minuty', 'minut'] as const;

it('polska odmiana liczebników', () => {
  expect(plural(1, day)).toBe('dzień');
  expect(plural(5, day)).toBe('dni');
  expect(plural(2, raz)).toBe('razy');
  expect(plural(2, minuta)).toBe('minuty');
  expect(plural(5, minuta)).toBe('minut');
  expect(plural(12, minuta)).toBe('minut');
  expect(plural(22, minuta)).toBe('minuty');
  expect(plural(0, minuta)).toBe('minut');
});
