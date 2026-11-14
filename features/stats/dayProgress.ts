import { isoToDateKey, type DateKey } from '@/lib/dates';

export interface ExerciseLifetime {
  id: string;
  active: boolean;
  createdAt: string;
  deletedAt: string | null;
  /** Ćwiczenia startowe (seed) traktujemy jak istniejące od zawsze. */
  seedKey?: string | null;
}

function deletedBy(e: ExerciseLifetime, date: DateKey): boolean {
  return !!e.deletedAt && isoToDateKey(e.deletedAt) <= date;
}

/**
 * Czy ćwiczenie „liczy się” do planu danego dnia: jest aktywne, nie zostało usunięte przed tym dniem
 * i istniało tego dnia (ćwiczenia startowe – zawsze). Dzięki temu dodanie nowego ćwiczenia
 * nie zaniża procentów w historii.
 * Uwaga: przełącznik „aktywne” nie ma historii – wyłączenie ćwiczenia zmienia też przeszłe dni.
 */
export function countsOnDay(e: ExerciseLifetime, date: DateKey): boolean {
  if (!e.active || deletedBy(e, date)) return false;
  if (!e.seedKey && isoToDateKey(e.createdAt) > date) return false;
  return true;
}

export interface DayProgress {
  done: number;
  total: number;
  /** 0–1 */
  ratio: number;
}

/**
 * Postęp dnia. Wykonania ćwiczeń, których nie ma w planie dnia (np. wyłączonych),
 * nie zawyżają wyniku powyżej 100%.
 */
export function dayProgress(
  exercises: ExerciseLifetime[],
  completedExerciseIds: Iterable<string>,
  date: DateKey,
): DayProgress {
  const doneSet = new Set(completedExerciseIds);
  // Ćwiczenie wykonane danego dnia zawsze należy do planu tego dnia (np. uzupełnianie wstecz, import).
  const planned = new Set(
    exercises
      .filter((e) => countsOnDay(e, date) || (doneSet.has(e.id) && e.active && !deletedBy(e, date)))
      .map((e) => e.id),
  );
  let done = 0;
  planned.forEach((id) => doneSet.has(id) && done++);
  const total = planned.size;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export type IntensityLevel = 0 | 1 | 2 | 3;

/** Skala kalendarza: 0 / <40% / 40–79% / 80–100%. Dzień z jakimkolwiek wykonaniem ma co najmniej poziom 1. */
export function intensityLevel(ratio: number, anyDone: boolean): IntensityLevel {
  if (!anyDone || ratio <= 0) return anyDone ? 1 : 0;
  if (ratio < 0.4) return 1;
  if (ratio < 0.8) return 2;
  return 3;
}
