import { addDays, type DateKey } from '@/lib/dates';

export interface StreakResult {
  /** Seria trwająca do dziś (lub do wczoraj, jeśli dziś jeszcze nic nie zrobiono). */
  current: number;
  longest: number;
  /** Czy dzisiejszy dzień już się liczy do serii. */
  todayCounted: boolean;
}

/**
 * Seria dni z rzędu, w których wykonano co najmniej jedno ćwiczenie.
 * Bez presji: brak ćwiczeń *dzisiaj* nie przerywa serii, dopóki dzień trwa.
 */
export function computeStreak(activeDays: Iterable<DateKey>, today: DateKey): StreakResult {
  const set = new Set<DateKey>();
  for (const d of activeDays) if (d <= today) set.add(d);

  const todayCounted = set.has(today);
  let current = 0;
  let cursor = todayCounted ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  const sorted = [...set].sort();
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, todayCounted };
}
