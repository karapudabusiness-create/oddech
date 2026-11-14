import { monthGrid, type DateKey } from '@/lib/dates';
import {
  dayProgress,
  intensityLevel,
  type ExerciseLifetime,
  type IntensityLevel,
} from '@/features/stats/dayProgress';

export interface CompletionLite {
  exerciseId: string;
  date: DateKey;
  durationS?: number;
}

export interface DayLogLite {
  date: DateKey;
  catches: number;
  tension: number | null;
  note: string;
}

export interface CalendarDay {
  date: DateKey;
  level: IntensityLevel;
  ratio: number;
  done: number;
  total: number;
  /** Kropka: dzień z notatką lub oceną napięcia. */
  hasEntry: boolean;
  isFuture: boolean;
  isToday: boolean;
}

export interface MonthStats {
  /** Dni z co najmniej jednym wykonanym ćwiczeniem. */
  trainingDays: number;
  /** Dni ze 100% planu. */
  fullDays: number;
  /** Średnie napięcie z dni z oceną, null gdy brak ocen. */
  avgTension: number | null;
  totalCatches: number;
}

export interface MonthData {
  weeks: (CalendarDay | null)[][];
  stats: MonthStats;
}

export function buildMonth(
  monthKey: DateKey,
  today: DateKey,
  exercises: ExerciseLifetime[],
  completions: CompletionLite[],
  logs: DayLogLite[],
): MonthData {
  const byDate = new Map<DateKey, Set<string>>();
  for (const c of completions) {
    const set = byDate.get(c.date) ?? new Set<string>();
    set.add(c.exerciseId);
    byDate.set(c.date, set);
  }
  const logByDate = new Map(logs.map((l) => [l.date, l]));

  let trainingDays = 0;
  let fullDays = 0;
  let tensionSum = 0;
  let tensionCount = 0;
  let totalCatches = 0;

  const weeks = monthGrid(monthKey).map((week) =>
    week.map((date): CalendarDay | null => {
      if (!date) return null;
      const doneIds = byDate.get(date) ?? new Set<string>();
      const p = dayProgress(exercises, doneIds, date);
      const log = logByDate.get(date);
      const anyDone = doneIds.size > 0;
      if (anyDone) trainingDays++;
      if (p.total > 0 && p.done === p.total) fullDays++;
      if (log?.tension != null) {
        tensionSum += log.tension;
        tensionCount++;
      }
      totalCatches += log?.catches ?? 0;
      return {
        date,
        level: intensityLevel(p.ratio, anyDone),
        ratio: p.ratio,
        done: p.done,
        total: p.total,
        hasEntry: !!log && (log.note.trim().length > 0 || log.tension != null),
        isFuture: date > today,
        isToday: date === today,
      };
    }),
  );

  return {
    weeks,
    stats: {
      trainingDays,
      fullDays,
      avgTension: tensionCount ? Math.round((tensionSum / tensionCount) * 10) / 10 : null,
      totalCatches,
    },
  };
}

/** Pomocniczo: ćwiczenia z bazy → format do obliczeń (bez zależności od schematu). */
export function toLifetime(e: {
  id: string;
  active: boolean;
  createdAt: string;
  deletedAt: string | null;
}) {
  return { id: e.id, active: e.active, createdAt: e.createdAt, deletedAt: e.deletedAt };
}
