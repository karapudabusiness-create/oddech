import { and, eq, isNull } from 'drizzle-orm';

import {
  addCatch,
  completeExercise,
  dayLogQuery,
  recomputeCatches,
  setNote,
  setTension,
} from '@/db/repositories/days';
import { createExercise, exercisesQuery } from '@/db/repositories/exercises';
import { updateSettings } from '@/db/repositories/settings';
import { notifyLocalChange } from '@/db/changes';
import {
  catchEvents,
  dayLogs,
  exerciseCompletions,
  exercises,
  settings,
  type Slot,
} from '@/db/schema';
import type { Db } from '@/db/types';
import { isDateKey } from '@/lib/dates';
import { uuid } from '@/lib/uuid';
import type { ExportPayload, PrototypePayload } from './format';

export interface ImportSummary {
  exercisesAdded: number;
  exercisesMatched: number;
  days: number;
  completions: number;
  catches: number;
}

const newer = (incoming: string, existing: string) => incoming > existing;

/**
 * Import własnego eksportu: scalanie wiersz po wierszu, „nowszy updated_at wygrywa”.
 * Ćwiczenia startowe dopasowujemy po seed_key (bez duplikatów), dni po dacie,
 * wykonania po parze ćwiczenie + dzień. Zmienione wiersze są oznaczane do synchronizacji.
 */
export async function importOddech(db: Db, data: ExportPayload): Promise<ImportSummary> {
  const summary: ImportSummary = {
    exercisesAdded: 0,
    exercisesMatched: 0,
    days: 0,
    completions: 0,
    catches: 0,
  };
  const idMap = new Map<string, string>();
  const local = await db.select().from(exercises);
  const byId = new Map(local.map((e) => [e.id, e]));
  const bySeed = new Map(local.filter((e) => e.seedKey).map((e) => [e.seedKey!, e]));

  for (const inc of data.exercises) {
    const match = byId.get(inc.id) ?? (inc.seedKey ? bySeed.get(inc.seedKey) : undefined);
    if (match) {
      idMap.set(inc.id, match.id);
      summary.exercisesMatched++;
      if (newer(inc.updatedAt, match.updatedAt)) {
        const { id: _id, createdAt: _c, ...fields } = inc;
        await db
          .update(exercises)
          .set({ ...fields, dirty: true })
          .where(eq(exercises.id, match.id));
      }
    } else {
      idMap.set(inc.id, inc.id);
      summary.exercisesAdded++;
      await db.insert(exercises).values({ ...inc, dirty: true });
    }
  }

  for (const inc of data.dayLogs) {
    const [cur] = await db.select().from(dayLogs).where(eq(dayLogs.date, inc.date));
    if (!cur) {
      await db.insert(dayLogs).values({ ...inc, dirty: true });
      summary.days++;
    } else if (newer(inc.updatedAt, cur.updatedAt)) {
      const { id: _id, ...fields } = inc;
      await db
        .update(dayLogs)
        .set({ ...fields, dirty: true })
        .where(eq(dayLogs.id, cur.id));
      summary.days++;
    }
  }

  const touchedDates = new Set<string>();
  for (const inc of data.catchEvents) {
    const [cur] = await db.select().from(catchEvents).where(eq(catchEvents.id, inc.id));
    if (!cur) {
      await db.insert(catchEvents).values({ ...inc, dirty: true });
      if (!inc.deletedAt) summary.catches++;
      touchedDates.add(inc.date);
    } else if (newer(inc.updatedAt, cur.updatedAt)) {
      await db
        .update(catchEvents)
        .set({ deletedAt: inc.deletedAt, updatedAt: inc.updatedAt, dirty: true })
        .where(eq(catchEvents.id, cur.id));
      touchedDates.add(inc.date);
    }
  }
  for (const date of touchedDates) await recomputeCatches(db, date);

  for (const inc of data.completions) {
    const exerciseId = idMap.get(inc.exerciseId) ?? inc.exerciseId;
    const [cur] = await db
      .select()
      .from(exerciseCompletions)
      .where(
        and(eq(exerciseCompletions.exerciseId, exerciseId), eq(exerciseCompletions.date, inc.date)),
      )
      .orderBy(exerciseCompletions.deletedAt);
    if (!cur) {
      const [idTaken] = await db
        .select({ id: exerciseCompletions.id })
        .from(exerciseCompletions)
        .where(eq(exerciseCompletions.id, inc.id));
      await db
        .insert(exerciseCompletions)
        .values({ ...inc, id: idTaken ? uuid() : inc.id, exerciseId, dirty: true });
      if (!inc.deletedAt) summary.completions++;
    } else if (newer(inc.updatedAt, cur.updatedAt)) {
      const { id: _id, ...fields } = inc;
      await db
        .update(exerciseCompletions)
        .set({ ...fields, exerciseId, dirty: true })
        .where(eq(exerciseCompletions.id, cur.id));
      if (!inc.deletedAt) summary.completions++;
    }
  }

  if (data.settings) {
    const [cur] = await db.select().from(settings).where(eq(settings.id, 1));
    if (cur && newer(data.settings.updatedAt, cur.updatedAt)) {
      await db
        .update(settings)
        .set({ ...data.settings, dirty: true })
        .where(eq(settings.id, 1));
    }
  }
  notifyLocalChange();
  return summary;
}

const PROTO_SLOTS: Record<string, Slot> = {
  rano: 'morning',
  dzien: 'day',
  dzień: 'day',
  wieczor: 'evening',
  wieczór: 'evening',
  trening: 'post_workout',
  morning: 'morning',
  day: 'day',
  evening: 'evening',
  post_workout: 'post_workout',
};

const norm = (s: string) => s.toLocaleLowerCase('pl-PL').replace(/\s+/g, ' ').trim();
/** „Ć1. Oddech…” → „ć1” */
const code = (s: string) => /^(ć\d+)\b/.exec(norm(s))?.[1] ?? null;
const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * Import z prototypu HTML. Ćwiczenia dopasowujemy po nazwie lub kodzie „Ćn”, nowe tworzymy.
 * Dane dni są scalane łagodnie: nic lokalnego nie jest kasowane, notatki są łączone.
 */
export async function importPrototype(db: Db, data: PrototypePayload): Promise<ImportSummary> {
  const summary: ImportSummary = {
    exercisesAdded: 0,
    exercisesMatched: 0,
    days: 0,
    completions: 0,
    catches: 0,
  };
  const local = await exercisesQuery(db);
  const idMap = new Map<string, string>();

  for (const p of data.exercises) {
    if (!p || typeof p.name !== 'string' || !p.name.trim()) continue;
    const match =
      local.find((e) => norm(e.name) === norm(p.name)) ??
      (code(p.name) ? local.find((e) => code(e.name) === code(p.name)) : undefined);
    if (match) {
      idMap.set(String(p.id), match.id);
      summary.exercisesMatched++;
      continue;
    }
    const inhale = clampInt(p.inhale, 0, 30, 0);
    const exhale = clampInt(p.exhale, 0, 30, 0);
    const pacer = inhale > 0 && exhale > 0;
    const id = await createExercise(db, {
      name: p.name.trim(),
      slot: PROTO_SLOTS[norm(p.slot ?? '')] ?? 'day',
      minutes: clampInt(p.minutes, 1, 120, 3),
      inhaleS: pacer ? inhale : 0,
      exhaleS: pacer ? exhale : 0,
      description: typeof p.desc === 'string' ? p.desc : '',
      active: p.active !== false,
    });
    idMap.set(String(p.id), id);
    summary.exercisesAdded++;
  }

  for (const [date, log] of Object.entries(data.logs ?? {})) {
    if (!isDateKey(date) || !log || typeof log !== 'object') continue;
    summary.days++;
    for (const doneId of log.done ?? []) {
      const exerciseId = idMap.get(String(doneId));
      if (!exerciseId) continue;
      const [already] = await db
        .select({ id: exerciseCompletions.id })
        .from(exerciseCompletions)
        .where(
          and(
            eq(exerciseCompletions.exerciseId, exerciseId),
            eq(exerciseCompletions.date, date),
            isNull(exerciseCompletions.deletedAt),
          ),
        );
      if (already) continue;
      await completeExercise(db, exerciseId, date, { source: 'manual' });
      summary.completions++;
    }

    const [cur] = await dayLogQuery(db, date);
    const target = clampInt(log.catches, 0, 500, 0);
    for (let n = cur?.catches ?? 0; n < target; n++) {
      await addCatch(db, date);
      summary.catches++;
    }
    if (
      typeof log.tension === 'number' &&
      log.tension >= 1 &&
      log.tension <= 10 &&
      cur?.tension == null
    ) {
      await setTension(db, date, Math.round(log.tension));
    }
    const note = typeof log.note === 'string' ? log.note.trim() : '';
    if (note) {
      const existing = cur?.note.trim() ?? '';
      if (!existing) await setNote(db, date, note);
      else if (!existing.includes(note)) await setNote(db, date, `${existing}\n\n${note}`);
    }
  }

  const s = data.settings;
  if (s && typeof s === 'object') {
    const patch: Parameters<typeof updateSettings>[1] = {};
    if (isDateKey(s.startDate)) patch.programStartDate = s.startDate;
    if (typeof s.catchGoal === 'number' && s.catchGoal >= 1)
      patch.catchGoal = clampInt(s.catchGoal, 1, 30, 5);
    if (Object.keys(patch).length) await updateSettings(db, patch);
  }
  return summary;
}
