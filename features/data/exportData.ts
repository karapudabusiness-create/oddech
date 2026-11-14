import { eq } from 'drizzle-orm';

import { catchEvents, dayLogs, exerciseCompletions, exercises, settings } from '@/db/schema';
import type { Db } from '@/db/types';
import { dayProgress } from '@/features/stats/dayProgress';
import { completionMinutes } from '@/features/stats/progress';
import { nowIso } from '@/lib/dates';
import { EXPORT_FORMAT_VERSION, type ExportPayload } from './format';

const strip = <T extends { dirty?: unknown; userId?: unknown }>(row: T) => {
  const { dirty: _d, userId: _u, ...rest } = row;
  return rest;
};

export async function buildExport(db: Db): Promise<ExportPayload> {
  const [ex, logs, events, comps, [s]] = await Promise.all([
    db.select().from(exercises),
    db.select().from(dayLogs),
    db.select().from(catchEvents),
    db.select().from(exerciseCompletions),
    db.select().from(settings).where(eq(settings.id, 1)),
  ]);
  let settingsOut: ExportPayload['settings'] = null;
  if (s) {
    const { id: _id, ...rest } = strip(s);
    settingsOut = rest;
  }
  return {
    app: 'oddech',
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: nowIso(),
    exercises: ex.map(strip),
    dayLogs: logs.map(strip),
    catchEvents: events.map(strip),
    completions: comps.map(strip),
    settings: settingsOut,
  };
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Podsumowanie dzienne w CSV (separator ; i BOM – poprawnie otwiera się w polskim Excelu / Numbers).
 */
export function buildDailyCsv(payload: ExportPayload): string {
  const minutesById = new Map(payload.exercises.map((e) => [e.id, e.minutes]));
  const active = payload.completions.filter((c) => !c.deletedAt);
  const byDate = new Map<string, typeof active>();
  for (const c of active) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c]);
  const logs = new Map(payload.dayLogs.filter((l) => !l.deletedAt).map((l) => [l.date, l]));
  const dates = [...new Set([...byDate.keys(), ...logs.keys()])].sort();

  const header = [
    'data',
    'wykonane',
    'zaplanowane',
    'procent',
    'minuty',
    'wstrzymania',
    'napiecie',
    'notatka',
  ];
  const rows = dates.map((date) => {
    const comps = byDate.get(date) ?? [];
    const p = dayProgress(
      payload.exercises,
      comps.map((c) => c.exerciseId),
      date,
    );
    const minutes = Math.round(
      comps.reduce((sum, c) => sum + completionMinutes(c, minutesById), 0),
    );
    const log = logs.get(date);
    return [
      date,
      p.done,
      p.total,
      Math.round(p.ratio * 100),
      minutes,
      log?.catches ?? 0,
      log?.tension ?? '',
      log?.note ?? '',
    ];
  });
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
