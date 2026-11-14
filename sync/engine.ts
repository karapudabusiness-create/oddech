import { and, eq, isNull, ne } from 'drizzle-orm';

import { notifyLocalChange } from '@/db/changes';
import { recomputeCatches } from '@/db/repositories/days';
import { SETTINGS_ID } from '@/db/repositories/settings';
import { catchEvents, dayLogs, exerciseCompletions, exercises, meta, settings } from '@/db/schema';
import type { Db } from '@/db/types';
import * as m from './mappers';
import type { RemoteRow, RemoteTable, SyncRemote, SyncResult } from './types';

const PAGE = 500;
const PUSH_BATCH = 200;
/** Kolejność ma znaczenie: ćwiczenia przed wykonaniami (przemapowanie id). */
const TABLES: RemoteTable[] = [
  'exercises',
  'day_logs',
  'catch_events',
  'exercise_completions',
  'settings',
];

const cursorKey = (t: RemoteTable) => `sync_cursor:${t}`;
const BOUND_USER_KEY = 'sync_user';

async function getMeta(db: Db, key: string): Promise<string | null> {
  const [row] = await db.select().from(meta).where(eq(meta.key, key));
  return row?.value ?? null;
}

async function setMeta(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(meta)
    .values({ key, value })
    .onConflictDoUpdate({ target: meta.key, set: { value } });
}

export async function clearSyncState(db: Db): Promise<void> {
  for (const t of TABLES) await db.delete(meta).where(eq(meta.key, cursorKey(t)));
  await db.delete(meta).where(eq(meta.key, BOUND_USER_KEY));
}

/** Liczba lokalnych zmian czekających na wysłanie. */
export async function pendingCount(db: Db): Promise<number> {
  const counts = await Promise.all([
    db.select({ id: exercises.id }).from(exercises).where(eq(exercises.dirty, true)),
    db.select({ id: dayLogs.id }).from(dayLogs).where(eq(dayLogs.dirty, true)),
    db.select({ id: catchEvents.id }).from(catchEvents).where(eq(catchEvents.dirty, true)),
    db
      .select({ id: exerciseCompletions.id })
      .from(exerciseCompletions)
      .where(eq(exerciseCompletions.dirty, true)),
    db.select({ id: settings.id }).from(settings).where(eq(settings.dirty, true)),
  ]);
  return counts.reduce((sum, rows) => sum + rows.length, 0);
}

/**
 * Przypisuje lokalne dane do konta. Zwraca true, gdy to pierwsze powiązanie tego urządzenia z kontem
 * (wtedy ustawienia z konta mają pierwszeństwo przed lokalnymi).
 */
async function bindToUser(db: Db, userId: string): Promise<boolean> {
  const bound = await getMeta(db, BOUND_USER_KEY);
  if (bound === userId) return false;
  for (const table of [exercises, dayLogs, catchEvents, exerciseCompletions, settings] as const) {
    await db.update(table).set({ userId }).where(isNull(table.userId));
  }
  await setMeta(db, BOUND_USER_KEY, userId);
  return true;
}

// ------------------------------------------------------------------ pobieranie

interface PullContext {
  db: Db;
  userId: string;
  preferRemoteSettings: boolean;
  touchedCatchDates: Set<string>;
}

/** LWW: zachowujemy lokalną wersję tylko, jeśli ma niewysłaną, nowszą zmianę. */
const localWins = (local: { dirty: boolean; updatedAt: string }, remoteUpdatedAt: string) =>
  local.dirty && local.updatedAt > remoteUpdatedAt;

async function applyExercise(ctx: PullContext, r: RemoteRow): Promise<void> {
  const { db } = ctx;
  const inc = m.exerciseFromRemote(r);
  let [local] = await db.select().from(exercises).where(eq(exercises.id, inc.id));

  // To samo ćwiczenie startowe utworzone niezależnie na dwóch urządzeniach → przyjmujemy id z serwera.
  if (!local && inc.seedKey) {
    const [twin] = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.seedKey, inc.seedKey), ne(exercises.id, inc.id)));
    if (twin) {
      db.transaction((tx) => {
        tx.update(exercises).set({ id: inc.id }).where(eq(exercises.id, twin.id)).run();
        tx.update(exerciseCompletions)
          .set({ exerciseId: inc.id, dirty: true })
          .where(eq(exerciseCompletions.exerciseId, twin.id))
          .run();
      });
      local = { ...twin, id: inc.id };
    }
  }

  if (!local) {
    await db.insert(exercises).values({ ...inc, dirty: false });
  } else if (!localWins(local, inc.updatedAt)) {
    await db
      .update(exercises)
      .set({ ...inc, dirty: false })
      .where(eq(exercises.id, local.id));
  }
}

async function applyDayLog(ctx: PullContext, r: RemoteRow): Promise<void> {
  const { db } = ctx;
  const inc = m.dayLogFromRemote(r);
  const [local] = await db.select().from(dayLogs).where(eq(dayLogs.date, inc.date));
  if (!local) {
    await db.insert(dayLogs).values({ ...inc, dirty: false });
    return;
  }
  if (local.id !== inc.id)
    await db.update(dayLogs).set({ id: inc.id }).where(eq(dayLogs.id, local.id));
  if (!localWins(local, inc.updatedAt)) {
    await db
      .update(dayLogs)
      .set({ ...inc, dirty: false })
      .where(eq(dayLogs.id, inc.id));
  }
}

async function applyCatch(ctx: PullContext, r: RemoteRow): Promise<void> {
  const { db } = ctx;
  const inc = m.catchFromRemote(r);
  const [local] = await db.select().from(catchEvents).where(eq(catchEvents.id, inc.id));
  if (!local) await db.insert(catchEvents).values({ ...inc, dirty: false });
  else if (!localWins(local, inc.updatedAt)) {
    await db
      .update(catchEvents)
      .set({ ...inc, dirty: false })
      .where(eq(catchEvents.id, inc.id));
  }
  ctx.touchedCatchDates.add(inc.date);
}

async function applyCompletion(ctx: PullContext, r: RemoteRow): Promise<void> {
  const { db } = ctx;
  const inc = m.completionFromRemote(r);
  let [local] = await db
    .select()
    .from(exerciseCompletions)
    .where(eq(exerciseCompletions.id, inc.id));
  if (!local) {
    // To samo ćwiczenie odhaczone tego dnia na dwóch urządzeniach → jeden wiersz z id serwera.
    const [twin] = await db
      .select()
      .from(exerciseCompletions)
      .where(
        and(
          eq(exerciseCompletions.exerciseId, inc.exerciseId),
          eq(exerciseCompletions.date, inc.date),
        ),
      );
    if (twin) {
      await db
        .update(exerciseCompletions)
        .set({ id: inc.id })
        .where(eq(exerciseCompletions.id, twin.id));
      local = { ...twin, id: inc.id };
    }
  }
  if (!local) await db.insert(exerciseCompletions).values({ ...inc, dirty: false });
  else if (!localWins(local, inc.updatedAt)) {
    await db
      .update(exerciseCompletions)
      .set({ ...inc, dirty: false })
      .where(eq(exerciseCompletions.id, inc.id));
  }
}

async function applySettings(ctx: PullContext, r: RemoteRow): Promise<void> {
  const { db } = ctx;
  const [local] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID));
  if (!local) return;
  const inc = m.settingsFromRemote(r, local);
  if (ctx.preferRemoteSettings || !localWins(local, inc.updatedAt)) {
    await db
      .update(settings)
      .set({ ...inc, dirty: false })
      .where(eq(settings.id, SETTINGS_ID));
  }
}

const APPLY: Record<RemoteTable, (ctx: PullContext, r: RemoteRow) => Promise<void>> = {
  exercises: applyExercise,
  day_logs: applyDayLog,
  catch_events: applyCatch,
  exercise_completions: applyCompletion,
  settings: applySettings,
};

async function pullTable(
  ctx: PullContext,
  remote: SyncRemote,
  table: RemoteTable,
): Promise<number> {
  let cursor = await getMeta(ctx.db, cursorKey(table));
  let applied = 0;
  // Zapamiętujemy wiersze z ostatnim znacznikiem – przy `>=` mogą wrócić na następnej stronie.
  let seenAtCursor = new Set<string>();
  for (;;) {
    const rows = await remote.pull(table, cursor, PAGE);
    const fresh = rows.filter(
      (r) => !(r.server_updated_at === cursor && seenAtCursor.has(String(r.id ?? r.user_id))),
    );
    for (const r of fresh) {
      await APPLY[table](ctx, r);
      applied++;
    }
    if (rows.length === 0) break;
    const last = rows[rows.length - 1]!.server_updated_at ?? cursor;
    seenAtCursor = new Set(
      rows.filter((r) => r.server_updated_at === last).map((r) => String(r.id ?? r.user_id)),
    );
    if (last) {
      cursor = last;
      await setMeta(ctx.db, cursorKey(table), last);
    }
    if (rows.length < PAGE || fresh.length === 0) break;
  }
  return applied;
}

// ------------------------------------------------------------------ wysyłanie

async function pushTable(
  db: Db,
  remote: SyncRemote,
  table: RemoteTable,
  userId: string,
): Promise<number> {
  type Dirty = { id: string | number; updatedAt: string; row: RemoteRow };
  let dirty: Dirty[] = [];
  switch (table) {
    case 'exercises':
      dirty = (await db.select().from(exercises).where(eq(exercises.dirty, true))).map((e) => ({
        id: e.id,
        updatedAt: e.updatedAt,
        row: m.exerciseToRemote(e, userId),
      }));
      break;
    case 'day_logs':
      dirty = (await db.select().from(dayLogs).where(eq(dayLogs.dirty, true))).map((l) => ({
        id: l.id,
        updatedAt: l.updatedAt,
        row: m.dayLogToRemote(l, userId),
      }));
      break;
    case 'catch_events':
      dirty = (await db.select().from(catchEvents).where(eq(catchEvents.dirty, true))).map((c) => ({
        id: c.id,
        updatedAt: c.updatedAt,
        row: m.catchToRemote(c, userId),
      }));
      break;
    case 'exercise_completions':
      dirty = (
        await db.select().from(exerciseCompletions).where(eq(exerciseCompletions.dirty, true))
      ).map((c) => ({
        id: c.id,
        updatedAt: c.updatedAt,
        row: m.completionToRemote(c, userId),
      }));
      break;
    case 'settings':
      dirty = (await db.select().from(settings).where(eq(settings.dirty, true))).map((s) => ({
        id: s.id,
        updatedAt: s.updatedAt,
        row: m.settingsToRemote(s, userId),
      }));
      break;
  }

  for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
    const batch = dirty.slice(i, i + PUSH_BATCH);
    await remote.push(
      table,
      batch.map((d) => d.row),
    );
    // Czyścimy flagę tylko, jeśli wiersz nie zmienił się w trakcie wysyłki.
    for (const d of batch) {
      switch (table) {
        case 'exercises':
          await db
            .update(exercises)
            .set({ dirty: false })
            .where(and(eq(exercises.id, String(d.id)), eq(exercises.updatedAt, d.updatedAt)));
          break;
        case 'day_logs':
          await db
            .update(dayLogs)
            .set({ dirty: false })
            .where(and(eq(dayLogs.id, String(d.id)), eq(dayLogs.updatedAt, d.updatedAt)));
          break;
        case 'catch_events':
          await db
            .update(catchEvents)
            .set({ dirty: false })
            .where(and(eq(catchEvents.id, String(d.id)), eq(catchEvents.updatedAt, d.updatedAt)));
          break;
        case 'exercise_completions':
          await db
            .update(exerciseCompletions)
            .set({ dirty: false })
            .where(
              and(
                eq(exerciseCompletions.id, String(d.id)),
                eq(exerciseCompletions.updatedAt, d.updatedAt),
              ),
            );
          break;
        case 'settings':
          await db
            .update(settings)
            .set({ dirty: false })
            .where(and(eq(settings.id, SETTINGS_ID), eq(settings.updatedAt, d.updatedAt)));
          break;
      }
    }
  }
  return dirty.length;
}

/**
 * Jeden pełny cykl synchronizacji: powiązanie z kontem → pobranie zmian → wysłanie lokalnych zmian.
 * Najpierw pobieramy, żeby przejąć id z serwera (ćwiczenia startowe, dni, wykonania) przed wysyłką.
 */
export async function syncOnce(db: Db, remote: SyncRemote, userId: string): Promise<SyncResult> {
  const firstBind = await bindToUser(db, userId);
  const ctx: PullContext = {
    db,
    userId,
    preferRemoteSettings: firstBind,
    touchedCatchDates: new Set(),
  };

  let pulled = 0;
  for (const t of TABLES) pulled += await pullTable(ctx, remote, t);
  for (const date of ctx.touchedCatchDates) await recomputeCatches(db, date);

  let pushed = 0;
  for (const t of TABLES) pushed += await pushTable(db, remote, t, userId);

  if (pulled > 0) notifyLocalChange('sync');
  return { pulled, pushed };
}
