import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { nowIso } from '@/lib/dates';
import { uuid } from '@/lib/uuid';
import { notifyLocalChange } from '../changes';
import { exercises, type Exercise, type Slot } from '../schema';
import type { Db } from '../types';

/** Ćwiczenia nieusunięte, w kolejności pory dnia i sort_order. */
export function exercisesQuery(db: Db) {
  return db
    .select()
    .from(exercises)
    .where(isNull(exercises.deletedAt))
    .orderBy(
      sql`CASE ${exercises.slot} WHEN 'morning' THEN 0 WHEN 'day' THEN 1 WHEN 'evening' THEN 2 ELSE 3 END`,
      asc(exercises.sortOrder),
      asc(exercises.createdAt),
    );
}

export function exerciseByIdQuery(db: Db, id: string) {
  return db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
}

export interface ExerciseInput {
  name: string;
  slot: Slot;
  minutes: number;
  inhaleS: number;
  exhaleS: number;
  description: string;
  active: boolean;
}

export type ExerciseErrors = Partial<Record<'name' | 'minutes' | 'tempo', true>>;

export function validateExercise(input: ExerciseInput): ExerciseErrors {
  const errors: ExerciseErrors = {};
  if (!input.name.trim()) errors.name = true;
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 120)
    errors.minutes = true;
  const okS = (n: number) => Number.isInteger(n) && n >= 0 && n <= 30;
  if (
    !okS(input.inhaleS) ||
    !okS(input.exhaleS) ||
    (input.inhaleS === 0) !== (input.exhaleS === 0)
  ) {
    errors.tempo = true;
  }
  return errors;
}

export function hasPacer(e: Pick<Exercise, 'inhaleS' | 'exhaleS'>): boolean {
  return e.inhaleS > 0 && e.exhaleS > 0;
}

async function nextSortOrder(db: Db, slot: Slot): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`MAX(${exercises.sortOrder})` })
    .from(exercises)
    .where(and(eq(exercises.slot, slot), isNull(exercises.deletedAt)));
  return (row?.max ?? -1) + 1;
}

export async function createExercise(
  db: Db,
  input: ExerciseInput,
  extra: { seedKey?: string; sortOrder?: number } = {},
): Promise<string> {
  const now = nowIso();
  const id = uuid();
  await db.insert(exercises).values({
    id,
    seedKey: extra.seedKey ?? null,
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    sortOrder: extra.sortOrder ?? (await nextSortOrder(db, input.slot)),
    createdAt: now,
    updatedAt: now,
    dirty: true,
  });
  notifyLocalChange();
  return id;
}

export async function updateExercise(
  db: Db,
  id: string,
  patch: Partial<ExerciseInput>,
): Promise<void> {
  const [current] = await exerciseByIdQuery(db, id);
  if (!current) return;
  const slotChanged = patch.slot !== undefined && patch.slot !== current.slot;
  await db
    .update(exercises)
    .set({
      ...patch,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(slotChanged ? { sortOrder: await nextSortOrder(db, patch.slot as Slot) } : {}),
      updatedAt: nowIso(),
      dirty: true,
    })
    .where(eq(exercises.id, id));
  notifyLocalChange();
}

export async function setExerciseDeleted(db: Db, id: string, deleted: boolean): Promise<void> {
  const now = nowIso();
  await db
    .update(exercises)
    .set({ deletedAt: deleted ? now : null, updatedAt: now, dirty: true })
    .where(eq(exercises.id, id));
  notifyLocalChange();
}

/** Zapisuje nową kolejność w obrębie jednej pory dnia (lista id w docelowej kolejności). */
export async function reorderExercises(db: Db, orderedIds: string[]): Promise<void> {
  const now = nowIso();
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(exercises)
        .set({ sortOrder: index, updatedAt: now, dirty: true })
        .where(and(eq(exercises.id, id), sql`${exercises.sortOrder} <> ${index}`))
        .run();
    });
  });
  notifyLocalChange();
}
