import { addCatch, completeExercise, setNote, setTension } from '@/db/repositories/days';
import { exercisesQuery } from '@/db/repositories/exercises';
import { updateSettings } from '@/db/repositories/settings';
import type { Db } from '@/db/types';
import { addDays, todayKey } from '@/lib/dates';

/** Prosty deterministyczny generator liczb pseudolosowych (powtarzalne dane demo). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const NOTES = [
  'Barki niżej po Ć7.',
  'Szczęka spięta przy komputerze.',
  'Po bieganiu oddech szybko się uspokoił.',
  'Kilka złapanych wstrzymań na spotkaniu.',
  'Dobry sen po wydłużonym wydechu.',
];

/**
 * TYLKO DO DEVELOPMENTU: wypełnia ostatnie `days` dni realistyczną historią
 * (rosnąca regularność, spadające napięcie). Ustawia start programu na początek historii.
 */
export async function seedDemoHistory(db: Db, days = 45): Promise<void> {
  const random = rng(42);
  const today = todayKey();
  const start = addDays(today, -days + 1);
  const exercises = (await exercisesQuery(db)).filter((e) => e.active);
  await updateSettings(db, { programStartDate: start });

  for (let i = 0; i < days - 1; i++) {
    const date = addDays(start, i);
    const progress = i / days; // z czasem lepiej
    if (random() < 0.12 - progress * 0.08) continue; // dzień przerwy
    const doneChance = 0.35 + progress * 0.55;
    for (const e of exercises) {
      if (random() < doneChance) {
        const pacer = e.inhaleS > 0 && random() < 0.7;
        await completeExercise(db, e.id, date, {
          source: pacer ? 'pacer' : 'manual',
          durationS: e.minutes * 60,
          feeling:
            pacer && random() < 0.6
              ? Math.min(5, 2 + Math.round(random() * 2 + progress * 1.5))
              : null,
        });
      }
    }
    const catches = Math.round(2 + random() * 5 + progress * 3);
    for (let c = 0; c < catches; c++) await addCatch(db, date);
    if (random() < 0.85) {
      const tension = Math.max(
        1,
        Math.min(10, Math.round(7.5 - progress * 4 + (random() - 0.5) * 3)),
      );
      await setTension(db, date, tension);
    }
    if (random() < 0.3) await setNote(db, date, NOTES[Math.floor(random() * NOTES.length)] ?? '');
  }
}
