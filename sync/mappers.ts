import type { CatchEvent, DayLog, Exercise, ExerciseCompletion, Settings } from '@/db/schema';
import type { RemoteRow } from './types';

/** Znaczniki czasu z Postgresa ('…+00:00', mikrosekundy) → ISO z 'Z' (porównywalne leksykograficznie). */
export const ts = (v: unknown): string => new Date(String(v)).toISOString();
const tsOrNull = (v: unknown): string | null => (v == null ? null : ts(v));
const str = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' ? v : v == null ? fallback : Number(v);
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));
/** Kolumna `date` może przyjść jako '2026-11-10' albo pełny znacznik – bierzemy datę. */
const day = (v: unknown): string => String(v).slice(0, 10);

export const exerciseToRemote = (e: Exercise, userId: string): RemoteRow => ({
  id: e.id,
  user_id: userId,
  seed_key: e.seedKey,
  name: e.name,
  slot: e.slot,
  minutes: e.minutes,
  inhale_s: e.inhaleS,
  exhale_s: e.exhaleS,
  description: e.description,
  active: e.active,
  sort_order: e.sortOrder,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
  deleted_at: e.deletedAt,
});

export const exerciseFromRemote = (r: RemoteRow): Omit<Exercise, 'dirty'> => ({
  id: str(r.id),
  userId: str(r.user_id),
  seedKey: r.seed_key == null ? null : str(r.seed_key),
  name: str(r.name),
  slot: str(r.slot) as Exercise['slot'],
  minutes: num(r.minutes, 1),
  inhaleS: num(r.inhale_s),
  exhaleS: num(r.exhale_s),
  description: str(r.description),
  active: r.active !== false,
  sortOrder: num(r.sort_order),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
  deletedAt: tsOrNull(r.deleted_at),
});

export const dayLogToRemote = (l: DayLog, userId: string): RemoteRow => ({
  id: l.id,
  user_id: userId,
  date: l.date,
  catches: l.catches,
  tension: l.tension,
  note: l.note,
  updated_at: l.updatedAt,
  deleted_at: l.deletedAt,
});

export const dayLogFromRemote = (r: RemoteRow): Omit<DayLog, 'dirty'> => ({
  id: str(r.id),
  userId: str(r.user_id),
  date: day(r.date),
  catches: num(r.catches),
  tension: numOrNull(r.tension),
  note: str(r.note),
  updatedAt: ts(r.updated_at),
  deletedAt: tsOrNull(r.deleted_at),
});

export const catchToRemote = (c: CatchEvent, userId: string): RemoteRow => ({
  id: c.id,
  user_id: userId,
  date: c.date,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
  deleted_at: c.deletedAt,
});

export const catchFromRemote = (r: RemoteRow): Omit<CatchEvent, 'dirty'> => ({
  id: str(r.id),
  userId: str(r.user_id),
  date: day(r.date),
  createdAt: ts(r.created_at),
  updatedAt: ts(r.updated_at),
  deletedAt: tsOrNull(r.deleted_at),
});

export const completionToRemote = (c: ExerciseCompletion, userId: string): RemoteRow => ({
  id: c.id,
  user_id: userId,
  exercise_id: c.exerciseId,
  date: c.date,
  completed_at: c.completedAt,
  duration_s: c.durationS,
  source: c.source,
  feeling: c.feeling,
  updated_at: c.updatedAt,
  deleted_at: c.deletedAt,
});

export const completionFromRemote = (r: RemoteRow): Omit<ExerciseCompletion, 'dirty'> => ({
  id: str(r.id),
  userId: str(r.user_id),
  exerciseId: str(r.exercise_id),
  date: day(r.date),
  completedAt: ts(r.completed_at),
  durationS: num(r.duration_s),
  source: str(r.source, 'manual') as ExerciseCompletion['source'],
  feeling: numOrNull(r.feeling),
  updatedAt: ts(r.updated_at),
  deletedAt: tsOrNull(r.deleted_at),
});

/** Ustawienia synchronizowane (onboarding zostaje lokalny dla urządzenia). */
export const settingsToRemote = (s: Settings, userId: string): RemoteRow => ({
  user_id: userId,
  program_start_date: s.programStartDate,
  catch_goal: s.catchGoal,
  theme: s.theme,
  sound: s.sound,
  haptics: s.haptics,
  reminders: s.reminders,
  updated_at: s.updatedAt,
});

export const settingsFromRemote = (r: RemoteRow, local: Settings) => ({
  userId: str(r.user_id),
  programStartDate: day(r.program_start_date),
  catchGoal: num(r.catch_goal, local.catchGoal),
  theme: (str(r.theme, local.theme) as Settings['theme']) ?? local.theme,
  // Puste obiekty JSON (domyślne na serwerze) nie nadpisują lokalnej konfiguracji.
  sound: isFilled(r.sound) ? { ...local.sound, ...(r.sound as object) } : local.sound,
  haptics: r.haptics == null ? local.haptics : r.haptics === true,
  reminders: isFilled(r.reminders)
    ? { ...local.reminders, ...(r.reminders as object) }
    : local.reminders,
  updatedAt: ts(r.updated_at),
});

function isFilled(v: unknown): boolean {
  return typeof v === 'object' && v !== null && Object.keys(v).length > 0;
}
