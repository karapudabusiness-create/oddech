import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { activeDaysQuery, completionsForDateQuery, dayLogQuery } from '@/db/repositories/days';
import { exercisesQuery } from '@/db/repositories/exercises';
import type { Exercise, Slot } from '@/db/schema';
import { programPhase, SLOT_ORDER, weekPlanFor } from '@/features/program/plan';
import { useSettings } from '@/features/settings/useSettings';
import { dayProgress } from '@/features/stats/dayProgress';
import { computeStreak } from '@/features/stats/streak';
import type { DateKey } from '@/lib/dates';

export interface SlotGroup {
  slot: Slot;
  items: Exercise[];
}

export function useDayData(date: DateKey, today: DateKey) {
  const settings = useSettings();
  const exercisesQ = useLiveQuery(exercisesQuery(db));
  const completionsQ = useLiveQuery(completionsForDateQuery(db, date), [date]);
  const logQ = useLiveQuery(dayLogQuery(db, date), [date]);
  const activeDaysQ = useLiveQuery(activeDaysQuery(db));

  const exercises = exercisesQ.data;
  const completions = completionsQ.data;

  return useMemo(() => {
    const completedIds = new Set(completions.map((c) => c.exerciseId));
    const groups: SlotGroup[] = SLOT_ORDER.map((slot) => ({
      slot,
      items: exercises.filter((e) => e.slot === slot && e.active),
    })).filter((g) => g.items.length > 0);

    const phase = settings ? programPhase(settings.programStartDate, date) : null;
    const plan = phase ? weekPlanFor(phase) : null;

    return {
      loading: !settings,
      error: exercisesQ.error ?? completionsQ.error ?? logQ.error ?? activeDaysQ.error,
      settings,
      exercises,
      groups,
      completions,
      completedIds,
      dayLog: logQ.data[0] ?? null,
      progress: dayProgress(exercises, completedIds, date),
      streak: computeStreak(
        activeDaysQ.data.map((r) => r.date),
        today,
      ),
      phase,
      plan,
      recommendedKeys: new Set(plan?.recommended ?? []),
    };
  }, [
    settings,
    exercises,
    completions,
    logQ.data,
    activeDaysQ.data,
    date,
    today,
    exercisesQ.error,
    completionsQ.error,
    logQ.error,
    activeDaysQ.error,
  ]);
}
