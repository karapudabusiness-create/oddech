import type { CatchEvent, DayLog, Exercise, ExerciseCompletion, Settings } from '@/db/schema';

export const EXPORT_FORMAT_VERSION = 1;

type Strip<T> = Omit<T, 'dirty' | 'userId'>;

/** Plik eksportu aplikacji (JSON). Zawiera też wiersze usunięte – potrzebne do scalania „nowszy wygrywa”. */
export interface ExportPayload {
  app: 'oddech';
  formatVersion: number;
  exportedAt: string;
  exercises: Strip<Exercise>[];
  dayLogs: Strip<DayLog>[];
  catchEvents: Strip<CatchEvent>[];
  completions: Strip<ExerciseCompletion>[];
  settings: Omit<Settings, 'dirty' | 'userId' | 'id'> | null;
}

/** Format prototypu HTML. */
export interface PrototypePayload {
  exercises: {
    id: string | number;
    name: string;
    slot: string;
    minutes?: number;
    inhale?: number;
    exhale?: number;
    desc?: string;
    active?: boolean;
  }[];
  logs: Record<
    string,
    { done?: (string | number)[]; catches?: number; tension?: number | null; note?: string }
  >;
  settings?: { startDate?: string; catchGoal?: number };
}

export type DetectedImport =
  { kind: 'oddech'; data: ExportPayload } | { kind: 'prototype'; data: PrototypePayload };

export class ImportError extends Error {
  constructor(public readonly code: 'json' | 'format' | 'version') {
    super(code);
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function detectImport(text: string): DetectedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    throw new ImportError('json');
  }
  if (!isObj(raw)) throw new ImportError('format');
  if (raw.app === 'oddech') {
    if (typeof raw.formatVersion !== 'number' || raw.formatVersion > EXPORT_FORMAT_VERSION)
      throw new ImportError('version');
    for (const key of ['exercises', 'dayLogs', 'catchEvents', 'completions'] as const) {
      if (!Array.isArray(raw[key])) throw new ImportError('format');
    }
    return { kind: 'oddech', data: raw as unknown as ExportPayload };
  }
  if (Array.isArray(raw.exercises) && isObj(raw.logs)) {
    return { kind: 'prototype', data: raw as unknown as PrototypePayload };
  }
  throw new ImportError('format');
}
