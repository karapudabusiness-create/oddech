import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { settingsQuery } from '@/db/repositories/settings';
import type { Settings } from '@/db/schema';

/** Ustawienia z bazy (reaktywnie). `null` tylko przez ułamek sekundy przy starcie. */
export function useSettings(): Settings | null {
  const { data } = useLiveQuery(settingsQuery(db));
  return data[0] ?? null;
}
