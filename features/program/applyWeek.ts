import { eq } from 'drizzle-orm';

import { updateExercise } from '@/db/repositories/exercises';
import { updateSettings } from '@/db/repositories/settings';
import { exercises, type Exercise, type ReminderSettings } from '@/db/schema';
import type { Db } from '@/db/types';
import type { WeekPlan } from './plan';

export interface WeekChanges {
  exhale: { exercise: Exercise; to: number }[];
  breathChecks: number | null;
}

/** Różnice między obecną konfiguracją a zaleceniami tygodnia (nic nie zmienia samo). */
export function diffWeekPlan(
  plan: WeekPlan,
  list: Exercise[],
  reminders: ReminderSettings,
): WeekChanges {
  const exhale = Object.entries(plan.exhaleOverrides).flatMap(([key, to]) => {
    const ex = list.find((e) => e.seedKey === key && !e.deletedAt);
    return ex && ex.exhaleS !== to && ex.inhaleS > 0 ? [{ exercise: ex, to }] : [];
  });
  const breathChecks = reminders.breathCheck.count !== plan.breathChecks ? plan.breathChecks : null;
  return { exhale, breathChecks };
}

export function hasWeekChanges(c: WeekChanges): boolean {
  return c.exhale.length > 0 || c.breathChecks !== null;
}

export async function applyWeekChanges(
  db: Db,
  c: WeekChanges,
  reminders: ReminderSettings,
): Promise<void> {
  for (const { exercise, to } of c.exhale) {
    const [fresh] = await db.select().from(exercises).where(eq(exercises.id, exercise.id));
    if (fresh) await updateExercise(db, fresh.id, { exhaleS: to });
  }
  if (c.breathChecks !== null) {
    await updateSettings(db, {
      reminders: { ...reminders, breathCheck: { ...reminders.breathCheck, count: c.breathChecks } },
    });
  }
}
