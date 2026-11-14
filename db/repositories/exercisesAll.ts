import { exercises } from '../schema';
import type { Db } from '../types';

/** Wszystkie ćwiczenia łącznie z usuniętymi – do liczenia historii (procent dnia w przeszłości). */
export function allExercisesQuery(db: Db) {
  return db
    .select({
      id: exercises.id,
      active: exercises.active,
      createdAt: exercises.createdAt,
      deletedAt: exercises.deletedAt,
      seedKey: exercises.seedKey,
      minutes: exercises.minutes,
    })
    .from(exercises);
}
