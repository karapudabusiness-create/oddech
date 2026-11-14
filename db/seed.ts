import { eq } from 'drizzle-orm';

import { strings } from '@/i18n';
import { createExercise } from './repositories/exercises';
import { ensureSettings } from './repositories/settings';
import { meta, type Slot } from './schema';
import type { Db } from './types';

const SEED_FLAG = 'seeded_v1';

/** Idempotentne: ustawienia + 7 ćwiczeń startowych przy pierwszym uruchomieniu. */
export async function seedIfNeeded(db: Db): Promise<void> {
  await ensureSettings(db);
  const [flag] = await db.select().from(meta).where(eq(meta.key, SEED_FLAG));
  if (flag) return;

  const perSlot: Partial<Record<Slot, number>> = {};
  for (const e of strings.seed.exercises) {
    const slot = e.slot as Slot;
    const sortOrder = perSlot[slot] ?? 0;
    perSlot[slot] = sortOrder + 1;
    await createExercise(
      db,
      {
        name: e.name,
        slot,
        minutes: e.minutes,
        inhaleS: e.inhale,
        exhaleS: e.exhale,
        description: e.description,
        active: true,
      },
      { seedKey: e.key, sortOrder },
    );
  }
  await db.insert(meta).values({ key: SEED_FLAG, value: new Date().toISOString() });
}
