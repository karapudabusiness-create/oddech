import { eq } from 'drizzle-orm';

import { nowIso, todayKey } from '@/lib/dates';
import { notifyLocalChange } from '../changes';
import { settings, type ReminderSettings, type Settings, type SoundSettings } from '../schema';
import type { Db } from '../types';

export const SETTINGS_ID = 1;

export const DEFAULT_SOUND: SoundSettings = {
  enabled: true,
  theme: 'bell',
  playInSilentMode: false,
  volume: 0.6,
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  morning: { enabled: true, time: '07:30' },
  evening: { enabled: true, time: '21:00' },
  breathCheck: {
    enabled: true,
    count: 3,
    windowStart: '09:00',
    windowEnd: '17:00',
    mode: 'random',
    weekdays: [1, 2, 3, 4, 5],
  },
};

export const DEFAULT_CATCH_GOAL = 5;

export async function ensureSettings(db: Db, today = todayKey()): Promise<void> {
  await db
    .insert(settings)
    .values({
      id: SETTINGS_ID,
      programStartDate: today,
      catchGoal: DEFAULT_CATCH_GOAL,
      theme: 'system',
      sound: DEFAULT_SOUND,
      haptics: true,
      reminders: DEFAULT_REMINDERS,
      onboardingDone: false,
      // Wartości domyślne przegrywają z każdym zapisem z konta (synchronizacja LWW).
      updatedAt: '1970-01-01T00:00:00.000Z',
      dirty: true,
    })
    .onConflictDoNothing();
}

export function settingsQuery(db: Db) {
  return db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).limit(1);
}

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await settingsQuery(db);
  if (!row) throw new Error('Brak wiersza ustawień – ensureSettings() nie zostało wywołane');
  return row;
}

export type SettingsPatch = Partial<
  Pick<
    Settings,
    | 'programStartDate'
    | 'catchGoal'
    | 'theme'
    | 'sound'
    | 'haptics'
    | 'reminders'
    | 'onboardingDone'
  >
>;

export async function updateSettings(db: Db, patch: SettingsPatch): Promise<void> {
  await db
    .update(settings)
    .set({ ...patch, updatedAt: nowIso(), dirty: true })
    .where(eq(settings.id, SETTINGS_ID));
  notifyLocalChange();
}
