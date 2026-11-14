import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Lokalny schemat (SQLite). Odpowiada tabelom w Supabase, z dodatkowymi kolumnami
 * potrzebnymi do synchronizacji offline-first:
 *  - `dirty`   – 1 = zmiana lokalna, jeszcze niewysłana na serwer
 *  - `user_id` – null, dopóki użytkownik się nie zaloguje
 * Znaczniki czasu: ISO 8601 (UTC) jako TEXT. Daty dnia: 'YYYY-MM-DD' (czas lokalny).
 */

export const SLOTS = ['morning', 'day', 'evening', 'post_workout'] as const;
export type Slot = (typeof SLOTS)[number];

export const COMPLETION_SOURCES = ['manual', 'pacer'] as const;
export type CompletionSource = (typeof COMPLETION_SOURCES)[number];

const syncColumns = {
  userId: text('user_id'),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
};

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    /** Stały klucz ćwiczeń startowych (np. 'c1') – zapobiega duplikatom po synchronizacji. */
    seedKey: text('seed_key'),
    name: text('name').notNull(),
    slot: text('slot', { enum: SLOTS }).notNull(),
    minutes: integer('minutes').notNull().default(1),
    inhaleS: integer('inhale_s').notNull().default(0),
    exhaleS: integer('exhale_s').notNull().default(0),
    description: text('description').notNull().default(''),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('exercises_sort_idx').on(t.slot, t.sortOrder)],
);

export const dayLogs = sqliteTable(
  'day_logs',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    /** Licznik zapisywany wprost (LWW). Patrz też `catchEvents`. */
    catches: integer('catches').notNull().default(0),
    tension: integer('tension'),
    note: text('note').notNull().default(''),
    ...syncColumns,
  },
  (t) => [uniqueIndex('day_logs_date_uq').on(t.date)],
);

/**
 * Zdarzenia „złapane wstrzymanie”. Suma zdarzeń (bez usuniętych) = liczba złapań w danym dniu.
 * Dzięki temu +1 z dwóch urządzeń offline nie nadpisują się nawzajem.
 * Cofnięcie = soft delete ostatniego zdarzenia.
 */
export const catchEvents = sqliteTable(
  'catch_events',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    createdAt: text('created_at').notNull(),
    ...syncColumns,
  },
  (t) => [index('catch_events_date_idx').on(t.date)],
);

export const exerciseCompletions = sqliteTable(
  'exercise_completions',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id').notNull(),
    date: text('date').notNull(),
    completedAt: text('completed_at').notNull(),
    durationS: integer('duration_s').notNull().default(0),
    source: text('source', { enum: COMPLETION_SOURCES }).notNull().default('manual'),
    feeling: integer('feeling'),
    ...syncColumns,
  },
  (t) => [
    index('completions_date_idx').on(t.date),
    uniqueIndex('completions_active_uq')
      .on(t.exerciseId, t.date)
      .where(sql`deleted_at IS NULL`),
  ],
);

/** Jeden wiersz (id = 1). */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  userId: text('user_id'),
  programStartDate: text('program_start_date').notNull(),
  catchGoal: integer('catch_goal').notNull().default(5),
  theme: text('theme', { enum: ['system', 'light', 'dark'] })
    .notNull()
    .default('system'),
  /** JSON: ustawienia dźwięku (motyw, włączony, tryb cichy). */
  sound: text('sound', { mode: 'json' }).$type<SoundSettings>().notNull(),
  haptics: integer('haptics', { mode: 'boolean' }).notNull().default(true),
  reminders: text('reminders', { mode: 'json' }).$type<ReminderSettings>().notNull(),
  onboardingDone: integer('onboarding_done', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull(),
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(true),
});

/** Klucz–wartość dla metadanych (kursory synchronizacji itp.). Nie jest synchronizowane. */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type SoundTheme = 'bell' | 'breeze' | 'tone';

export interface SoundSettings {
  enabled: boolean;
  theme: SoundTheme;
  /** Graj także przy wyciszonym telefonie (iOS: przełącznik wyciszenia). */
  playInSilentMode: boolean;
  volume: number;
}

export interface ReminderSettings {
  enabled: boolean;
  morning: { enabled: boolean; time: string };
  evening: { enabled: boolean; time: string };
  breathCheck: {
    enabled: boolean;
    count: number;
    windowStart: string;
    windowEnd: string;
    mode: 'random' | 'even';
    /** 1 = poniedziałek … 7 = niedziela */
    weekdays: number[];
  };
}

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type DayLog = typeof dayLogs.$inferSelect;
export type CatchEvent = typeof catchEvents.$inferSelect;
export type ExerciseCompletion = typeof exerciseCompletions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
