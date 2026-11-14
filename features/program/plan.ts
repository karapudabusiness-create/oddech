import { diffDays, type DateKey } from '@/lib/dates';
import type { Slot } from '@/db/schema';

export const PROGRAM_WEEKS = 4;

export type ProgramPhase =
  | { kind: 'notStarted'; daysUntilStart: number }
  | { kind: 'week'; week: 1 | 2 | 3 | 4; dayOfProgram: number }
  | { kind: 'maintenance'; dayOfProgram: number };

/** Faza programu dla danego dnia. Dzień startu = dzień 1 tygodnia 1. */
export function programPhase(startDate: DateKey, today: DateKey): ProgramPhase {
  const diff = diffDays(startDate, today);
  if (diff < 0) return { kind: 'notStarted', daysUntilStart: -diff };
  const dayOfProgram = diff + 1;
  const week = Math.floor(diff / 7) + 1;
  if (week > PROGRAM_WEEKS) return { kind: 'maintenance', dayOfProgram };
  return { kind: 'week', week: week as 1 | 2 | 3 | 4, dayOfProgram };
}

export interface WeekPlan {
  /** Klucze ćwiczeń startowych zalecanych w danym tygodniu. */
  recommended: string[];
  /** Zalecana liczba przypomnień „Oddychasz?” dziennie. */
  breathChecks: number;
  /** Zmiany tempa ćwiczeń (seed_key → wydech w s). */
  exhaleOverrides: Record<string, number>;
}

export const WEEK_PLANS: Record<1 | 2 | 3 | 4, WeekPlan> = {
  1: { recommended: ['c1', 'c6', 'c5'], breathChecks: 3, exhaleOverrides: { c5: 6 } },
  2: {
    recommended: ['c1', 'c3', 'c2', 'c6', 'c7', 'c5'],
    breathChecks: 5,
    exhaleOverrides: { c5: 6 },
  },
  3: { recommended: ['c2', 'c4', 'c5'], breathChecks: 6, exhaleOverrides: { c5: 8 } },
  4: { recommended: ['c1', 'c3', 'c7', 'c5'], breathChecks: 2, exhaleOverrides: { c5: 8 } },
};

export function weekPlanFor(phase: ProgramPhase): WeekPlan | null {
  return phase.kind === 'week' ? WEEK_PLANS[phase.week] : null;
}

export const SLOT_ORDER: Slot[] = ['morning', 'day', 'evening', 'post_workout'];
