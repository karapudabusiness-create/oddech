import { notifyLocalChange } from '../changes';
import { catchEvents, dayLogs, exerciseCompletions, exercises, meta, settings } from '../schema';
import { seedIfNeeded } from '../seed';
import type { Db } from '../types';

/** Usuwa wszystkie dane z urządzenia i zaczyna od nowa (ćwiczenia startowe, onboarding). */
export async function wipeLocalData(db: Db): Promise<void> {
  db.transaction((tx) => {
    tx.delete(exerciseCompletions).run();
    tx.delete(catchEvents).run();
    tx.delete(dayLogs).run();
    tx.delete(exercises).run();
    tx.delete(settings).run();
    tx.delete(meta).run();
  });
  await seedIfNeeded(db);
  notifyLocalChange();
}
