import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { nowIso, type DateKey } from '@/lib/dates';
import { uuid } from '@/lib/uuid';
import { notifyLocalChange } from '../changes';
import { catchEvents, dayLogs, exerciseCompletions, type CompletionSource } from '../schema';
import type { Db } from '../types';

// ---------- Dzienniczek dnia ----------

export function dayLogQuery(db: Db, date: DateKey) {
  return db.select().from(dayLogs).where(eq(dayLogs.date, date)).limit(1);
}

async function upsertDayLog(
  db: Db,
  date: DateKey,
  patch: Partial<{ catches: number; tension: number | null; note: string }>,
): Promise<void> {
  const now = nowIso();
  await db
    .insert(dayLogs)
    .values({ id: uuid(), date, ...patch, updatedAt: now, dirty: true })
    .onConflictDoUpdate({
      target: dayLogs.date,
      set: { ...patch, deletedAt: null, updatedAt: now, dirty: true },
    });
  notifyLocalChange();
}

export async function setTension(db: Db, date: DateKey, tension: number | null): Promise<void> {
  if (tension !== null && (!Number.isInteger(tension) || tension < 1 || tension > 10)) {
    throw new RangeError('Napięcie musi być liczbą całkowitą 1–10');
  }
  return upsertDayLog(db, date, { tension });
}

export function setNote(db: Db, date: DateKey, note: string) {
  return upsertDayLog(db, date, { note });
}

// ---------- Złapane wstrzymania ----------

async function countCatches(db: Db, date: DateKey): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(catchEvents)
    .where(and(eq(catchEvents.date, date), isNull(catchEvents.deletedAt)));
  return row?.n ?? 0;
}

/** Przelicza `day_logs.catches` z tabeli zdarzeń (np. po synchronizacji). */
export async function recomputeCatches(db: Db, date: DateKey): Promise<number> {
  const n = await countCatches(db, date);
  const [log] = await dayLogQuery(db, date);
  if (log?.catches !== n) await upsertDayLog(db, date, { catches: n });
  return n;
}

export async function addCatch(db: Db, date: DateKey): Promise<number> {
  const now = nowIso();
  await db
    .insert(catchEvents)
    .values({ id: uuid(), date, createdAt: now, updatedAt: now, dirty: true });
  return recomputeCatches(db, date);
}

export async function undoCatch(db: Db, date: DateKey): Promise<number> {
  const [last] = await db
    .select()
    .from(catchEvents)
    .where(and(eq(catchEvents.date, date), isNull(catchEvents.deletedAt)))
    .orderBy(desc(catchEvents.createdAt))
    .limit(1);
  if (last) {
    const now = nowIso();
    await db
      .update(catchEvents)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(catchEvents.id, last.id));
  }
  return recomputeCatches(db, date);
}

// ---------- Wykonania ćwiczeń ----------

export function completionsForDateQuery(db: Db, date: DateKey) {
  return db
    .select()
    .from(exerciseCompletions)
    .where(and(eq(exerciseCompletions.date, date), isNull(exerciseCompletions.deletedAt)));
}

export interface CompletionDetails {
  source?: CompletionSource;
  durationS?: number;
  feeling?: number | null;
}

/**
 * Oznacza ćwiczenie jako zrobione w danym dniu. Jeśli istnieje wcześniej usunięty
 * wiersz – zostaje „wskrzeszony” (jedno id na parę ćwiczenie+dzień ułatwia synchronizację).
 */
export async function completeExercise(
  db: Db,
  exerciseId: string,
  date: DateKey,
  details: CompletionDetails = {},
): Promise<string> {
  const now = nowIso();
  const [existing] = await db
    .select()
    .from(exerciseCompletions)
    .where(and(eq(exerciseCompletions.exerciseId, exerciseId), eq(exerciseCompletions.date, date)))
    .orderBy(sql`${exerciseCompletions.deletedAt} IS NOT NULL`, desc(exerciseCompletions.updatedAt))
    .limit(1);

  const values = {
    completedAt: now,
    source: details.source ?? 'manual',
    durationS: details.durationS ?? 0,
    feeling: details.feeling ?? null,
    deletedAt: null,
    updatedAt: now,
    dirty: true,
  };

  if (existing) {
    // Przy ponownym ukończeniu (np. drugi raz pacerem) sumujemy czas.
    const durationS = existing.deletedAt ? values.durationS : existing.durationS + values.durationS;
    await db
      .update(exerciseCompletions)
      .set({
        ...values,
        durationS,
        feeling: values.feeling ?? (existing.deletedAt ? null : existing.feeling),
      })
      .where(eq(exerciseCompletions.id, existing.id));
    notifyLocalChange();
    return existing.id;
  }

  const id = uuid();
  await db.insert(exerciseCompletions).values({ id, exerciseId, date, ...values });
  notifyLocalChange();
  return id;
}

export async function uncompleteExercise(db: Db, exerciseId: string, date: DateKey): Promise<void> {
  const now = nowIso();
  await db
    .update(exerciseCompletions)
    .set({ deletedAt: now, updatedAt: now, dirty: true })
    .where(
      and(
        eq(exerciseCompletions.exerciseId, exerciseId),
        eq(exerciseCompletions.date, date),
        isNull(exerciseCompletions.deletedAt),
      ),
    );
  notifyLocalChange();
}

export async function setCompletionFeeling(db: Db, completionId: string, feeling: number | null) {
  const now = nowIso();
  await db
    .update(exerciseCompletions)
    .set({ feeling, updatedAt: now, dirty: true })
    .where(eq(exerciseCompletions.id, completionId));
  notifyLocalChange();
}

// ---------- Zakresy dat (kalendarz, statystyki) ----------

export function completionsInRangeQuery(db: Db, from: DateKey, to: DateKey) {
  return db
    .select({
      exerciseId: exerciseCompletions.exerciseId,
      date: exerciseCompletions.date,
      durationS: exerciseCompletions.durationS,
      feeling: exerciseCompletions.feeling,
    })
    .from(exerciseCompletions)
    .where(
      and(
        isNull(exerciseCompletions.deletedAt),
        sql`${exerciseCompletions.date} >= ${from}`,
        sql`${exerciseCompletions.date} <= ${to}`,
      ),
    );
}

export function dayLogsInRangeQuery(db: Db, from: DateKey, to: DateKey) {
  return db
    .select({
      date: dayLogs.date,
      catches: dayLogs.catches,
      tension: dayLogs.tension,
      note: dayLogs.note,
    })
    .from(dayLogs)
    .where(
      and(
        isNull(dayLogs.deletedAt),
        sql`${dayLogs.date} >= ${from}`,
        sql`${dayLogs.date} <= ${to}`,
      ),
    );
}
