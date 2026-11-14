/**
 * @jest-environment node
 */
import { createTestDb } from '@/test/testDb';
import { seedIfNeeded } from '../seed';
import {
  exercisesQuery,
  reorderExercises,
  setExerciseDeleted,
  validateExercise,
} from './exercises';
import {
  addCatch,
  completeExercise,
  completionsForDateQuery,
  dayLogQuery,
  setNote,
  setTension,
  uncompleteExercise,
  undoCatch,
} from './days';
import { getSettings } from './settings';

describe('repozytoria', () => {
  it('seed jest idempotentny i tworzy 7 ćwiczeń + ustawienia', async () => {
    const db = createTestDb();
    await seedIfNeeded(db);
    await seedIfNeeded(db);
    const list = await exercisesQuery(db);
    expect(list).toHaveLength(7);
    expect(list.map((e) => e.seedKey)).toEqual(['c1', 'c3', 'c2', 'c6', 'c5', 'c7', 'c4']);
    expect((await getSettings(db)).catchGoal).toBe(5);
  });

  it('usuwanie jest miękkie i można je cofnąć', async () => {
    const db = createTestDb();
    await seedIfNeeded(db);
    const [first] = await exercisesQuery(db);
    await setExerciseDeleted(db, first!.id, true);
    expect(await exercisesQuery(db)).toHaveLength(6);
    await setExerciseDeleted(db, first!.id, false);
    expect(await exercisesQuery(db)).toHaveLength(7);
  });

  it('zmiana kolejności', async () => {
    const db = createTestDb();
    await seedIfNeeded(db);
    const morning = (await exercisesQuery(db)).filter((e) => e.slot === 'morning');
    await reorderExercises(db, morning.map((e) => e.id).reverse());
    const after = (await exercisesQuery(db)).filter((e) => e.slot === 'morning');
    expect(after.map((e) => e.seedKey)).toEqual(['c3', 'c1']);
  });

  it('odhaczanie i odznaczanie zachowuje jedno id', async () => {
    const db = createTestDb();
    await seedIfNeeded(db);
    const [ex] = await exercisesQuery(db);
    const id1 = await completeExercise(db, ex!.id, '2026-11-14');
    await uncompleteExercise(db, ex!.id, '2026-11-14');
    expect(await completionsForDateQuery(db, '2026-11-14')).toHaveLength(0);
    const id2 = await completeExercise(db, ex!.id, '2026-11-14', {
      source: 'pacer',
      durationS: 300,
    });
    expect(id2).toBe(id1);
    const [c] = await completionsForDateQuery(db, '2026-11-14');
    expect(c).toMatchObject({ source: 'pacer', durationS: 300, dirty: true });
  });

  it('licznik wstrzymań: +1, cofnij, nie schodzi poniżej zera', async () => {
    const db = createTestDb();
    expect(await addCatch(db, '2026-11-14')).toBe(1);
    expect(await addCatch(db, '2026-11-14')).toBe(2);
    expect(await undoCatch(db, '2026-11-14')).toBe(1);
    expect(await undoCatch(db, '2026-11-14')).toBe(0);
    expect(await undoCatch(db, '2026-11-14')).toBe(0);
    const [log] = await dayLogQuery(db, '2026-11-14');
    expect(log?.catches).toBe(0);
  });

  it('napięcie i notatka trafiają do jednego wiersza dnia', async () => {
    const db = createTestDb();
    await setTension(db, '2026-11-14', 6);
    await setNote(db, '2026-11-14', 'Barki spięte po pracy');
    const [log] = await dayLogQuery(db, '2026-11-14');
    expect(log).toMatchObject({ tension: 6, note: 'Barki spięte po pracy' });
    await expect(setTension(db, '2026-11-14', 11)).rejects.toThrow(RangeError);
  });

  it('walidacja ćwiczenia', () => {
    const base = {
      name: 'X',
      slot: 'day' as const,
      minutes: 2,
      inhaleS: 4,
      exhaleS: 6,
      description: '',
      active: true,
    };
    expect(validateExercise(base)).toEqual({});
    expect(validateExercise({ ...base, name: ' ' })).toEqual({ name: true });
    expect(validateExercise({ ...base, inhaleS: 0 })).toEqual({ tempo: true });
    expect(validateExercise({ ...base, inhaleS: 0, exhaleS: 0 })).toEqual({});
    expect(validateExercise({ ...base, minutes: 0 })).toEqual({ minutes: true });
  });
});
