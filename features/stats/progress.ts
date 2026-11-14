import { addDays, diffDays, eachDay, startOfWeek, type DateKey } from '@/lib/dates';
import { computeStreak } from './streak';

export type RangeKey = '7' | '30' | '90' | 'program';

export const RANGES: RangeKey[] = ['7', '30', '90', 'program'];

/** Zakres dat [from, to] dla wybranego widoku. „Program” = od startu programu (min. 7 dni). */
export function rangeDates(
  range: RangeKey,
  today: DateKey,
  programStart: DateKey,
): { from: DateKey; to: DateKey } {
  if (range === 'program') {
    const from = programStart <= addDays(today, -6) ? programStart : addDays(today, -6);
    return { from, to: today };
  }
  return { from: addDays(today, -(Number(range) - 1)), to: today };
}

export interface DayPoint {
  date: DateKey;
  value: number | null;
}

/**
 * Średnia krocząca z `window` dni kończących się danym dniem, liczona z dni, które mają wartość.
 * Brak wartości w całym oknie → null.
 */
export function movingAverage(points: DayPoint[], window = 7): DayPoint[] {
  return points.map((p, i) => {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - window + 1); j <= i; j++) {
      const v = points[j]?.value;
      if (v != null) {
        sum += v;
        n++;
      }
    }
    return { date: p.date, value: n ? Math.round((sum / n) * 10) / 10 : null };
  });
}

export interface ProgressInput {
  from: DateKey;
  to: DateKey;
  logs: { date: DateKey; catches: number; tension: number | null }[];
  completions: { exerciseId: string; date: DateKey; durationS: number }[];
  /** Minuty ćwiczeń (także usuniętych) – fallback, gdy wykonanie nie ma zapisanego czasu. */
  exerciseMinutes: Map<string, number>;
  /** Wszystkie dni z jakimkolwiek wykonaniem (do serii – niezależnie od zakresu). */
  allActiveDays: DateKey[];
  today: DateKey;
}

export interface WeekBar {
  weekStart: DateKey;
  minutes: number;
  /** Tydzień obcięty zakresem (np. bieżący, niepełny). */
  partial: boolean;
}

export interface ProgressData {
  days: DateKey[];
  tension: DayPoint[];
  tensionAvg7: DayPoint[];
  catches: DayPoint[];
  weeklyMinutes: WeekBar[];
  summary: {
    avgTension: number | null;
    /** Zmiana średniej krocząkiej: pierwszy vs ostatni dostępny punkt w zakresie. */
    tensionChange: number | null;
    totalCatches: number;
    totalMinutes: number;
    activeDays: number;
    /** Dni od pierwszego wpisu w zakresie do końca – mianownik średnich dziennych. */
    trackedDays: number;
  };
  streak: { current: number; longest: number };
}

export function completionMinutes(
  c: { exerciseId: string; durationS: number },
  exerciseMinutes: Map<string, number>,
) {
  return c.durationS > 0 ? c.durationS / 60 : (exerciseMinutes.get(c.exerciseId) ?? 0);
}

export function buildProgress(input: ProgressInput): ProgressData {
  const { from, to } = input;
  const days = eachDay(from, to);
  const logByDate = new Map(input.logs.map((l) => [l.date, l]));

  // Średnia krocząca liczona też z 6 dni przed zakresem, żeby początek wykresu nie był „ucięty”.
  const warmup = eachDay(addDays(from, -6), addDays(from, -1)).map((date) => ({
    date,
    value: logByDate.get(date)?.tension ?? null,
  }));
  const tension = days.map((date) => ({ date, value: logByDate.get(date)?.tension ?? null }));
  const tensionAvg7 = movingAverage([...warmup, ...tension]).slice(warmup.length);
  const catches = days.map((date) => ({ date, value: logByDate.get(date)?.catches ?? 0 }));

  const inRange = input.completions.filter((c) => c.date >= from && c.date <= to);
  const weekMap = new Map<DateKey, number>();
  for (let w = startOfWeek(from); w <= to; w = addDays(w, 7)) weekMap.set(w, 0);
  let totalMinutes = 0;
  for (const c of inRange) {
    const m = completionMinutes(c, input.exerciseMinutes);
    totalMinutes += m;
    const w = startOfWeek(c.date);
    weekMap.set(w, (weekMap.get(w) ?? 0) + m);
  }
  const weeklyMinutes = [...weekMap.entries()].map(([weekStart, minutes]) => ({
    weekStart,
    minutes: Math.round(minutes),
    partial: weekStart < from || diffDays(weekStart, to) < 6,
  }));

  const tensionValues = tension.flatMap((p) => (p.value == null ? [] : [p.value]));
  const avgPoints = tensionAvg7.flatMap((p) => (p.value == null ? [] : [p.value]));
  const streak = computeStreak(input.allActiveDays, input.today);
  const firstTracked = days.find((d) => logByDate.has(d) || inRange.some((c) => c.date === d));
  const trackedDays = firstTracked ? diffDays(firstTracked, to) + 1 : 0;

  return {
    days,
    tension,
    tensionAvg7,
    catches,
    weeklyMinutes,
    summary: {
      avgTension: tensionValues.length
        ? Math.round((tensionValues.reduce((a, b) => a + b, 0) / tensionValues.length) * 10) / 10
        : null,
      tensionChange:
        avgPoints.length >= 2
          ? Math.round((avgPoints[avgPoints.length - 1]! - avgPoints[0]!) * 10) / 10
          : null,
      totalCatches: catches.reduce((a, p) => a + (p.value ?? 0), 0),
      totalMinutes: Math.round(totalMinutes),
      activeDays: new Set(inRange.map((c) => c.date)).size,
      trackedDays,
    },
    streak: { current: streak.current, longest: streak.longest },
  };
}
