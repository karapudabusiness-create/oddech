import { pl, type Strings } from './pl';

/** Na razie jedyny język. Wybór języka (expo-localization) dodamy razem z `en.ts`. */
export const strings: Strings = pl;

/**
 * Polska odmiana liczebników: [1, 2–4, 5+], np. ['dzień', 'dni', 'dni'].
 */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n);
  if (abs === 1) return forms[0];
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
