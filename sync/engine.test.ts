/**
 * @jest-environment node
 */
import { eq } from 'drizzle-orm';

import {
  addCatch,
  completeExercise,
  completionsForDateQuery,
  dayLogQuery,
  setNote,
  setTension,
  uncompleteExercise,
} from '@/db/repositories/days';
import { exercisesQuery, setExerciseDeleted, updateExercise } from '@/db/repositories/exercises';
import { getSettings, updateSettings } from '@/db/repositories/settings';
import { exercises } from '@/db/schema';
import { seedIfNeeded } from '@/db/seed';
import type { Db } from '@/db/types';
import { FakeServer } from '@/test/fakeRemote';
import { createTestDb } from '@/test/testDb';
import { pendingCount, syncOnce } from './engine';

const USER = '11111111-1111-4111-8111-111111111111';
const D = '2026-11-14';
const tick = () => new Promise((r) => setTimeout(r, 3));

async function device(): Promise<Db> {
  const db = createTestDb();
  await seedIfNeeded(db);
  return db;
}
const byKey = async (db: Db, key: string) =>
  (await exercisesQuery(db)).find((e) => e.seedKey === key)!;

describe('synchronizacja', () => {
  it('pierwsze logowanie: lokalne dane trafiają na konto, potem nic nie czeka', async () => {
    const server = new FakeServer();
    const a = await device();
    const c1 = await byKey(a, 'c1');
    await completeExercise(a, c1.id, D);
    await addCatch(a, D);
    await setTension(a, D, 5);

    const r = await syncOnce(a, server.client(USER), USER);
    expect(r.pushed).toBeGreaterThan(0);
    expect(server.count('exercises')).toBe(7);
    expect(server.count('exercise_completions')).toBe(1);
    expect(server.count('catch_events')).toBe(1);
    expect(server.count('settings')).toBe(1);
    expect(await pendingCount(a)).toBe(0);

    const again = await syncOnce(a, server.client(USER), USER);
    expect(again.pushed).toBe(0);
  });

  it('drugie urządzenie: ćwiczenia startowe nie dublują się, wykonania przechodzą na właściwe id', async () => {
    const server = new FakeServer();
    const a = await device();
    await syncOnce(a, server.client(USER), USER);
    await updateExercise(a, (await byKey(a, 'c5')).id, { exhaleS: 8 });
    await syncOnce(a, server.client(USER), USER);

    const b = await device(); // własne ćwiczenia startowe z innymi id
    const bC1Before = await byKey(b, 'c1');
    await completeExercise(b, bC1Before.id, D); // odhaczone przed zalogowaniem
    await syncOnce(b, server.client(USER), USER);

    const listB = await exercisesQuery(b);
    expect(listB).toHaveLength(7);
    expect(server.count('exercises')).toBe(7);
    const aC1 = await byKey(a, 'c1');
    expect((await byKey(b, 'c1')).id).toBe(aC1.id);
    expect((await byKey(b, 'c5')).exhaleS).toBe(8); // zmiana z konta wygrywa z wartością startową
    const [comp] = await completionsForDateQuery(b, D);
    expect(comp?.exerciseId).toBe(aC1.id);

    await syncOnce(a, server.client(USER), USER);
    expect((await completionsForDateQuery(a, D)).map((c) => c.exerciseId)).toEqual([aC1.id]);
  });

  it('pierwsze logowanie na nowym urządzeniu: ustawienia z konta mają pierwszeństwo', async () => {
    const server = new FakeServer();
    const a = await device();
    await updateSettings(a, { programStartDate: '2026-10-01', catchGoal: 8 });
    await syncOnce(a, server.client(USER), USER);

    const b = await device();
    await updateSettings(b, { programStartDate: D, onboardingDone: true }); // onboarding na nowym telefonie
    await syncOnce(b, server.client(USER), USER);
    expect(await getSettings(b)).toMatchObject({
      programStartDate: '2026-10-01',
      catchGoal: 8,
      onboardingDone: true,
    });
  });

  it('konflikt offline: nowsza zmiana wygrywa na obu urządzeniach', async () => {
    const server = new FakeServer();
    const a = await device();
    await syncOnce(a, server.client(USER), USER);
    const b = await device();
    await syncOnce(b, server.client(USER), USER);

    await setNote(a, D, 'Notatka z telefonu A');
    await tick();
    await setNote(b, D, 'Nowsza notatka z B');
    await syncOnce(a, server.client(USER), USER);
    await syncOnce(b, server.client(USER), USER);
    await syncOnce(a, server.client(USER), USER);

    expect((await dayLogQuery(a, D))[0]?.note).toBe('Nowsza notatka z B');
    expect((await dayLogQuery(b, D))[0]?.note).toBe('Nowsza notatka z B');
    expect(server.count('day_logs')).toBe(1); // jeden dzień, mimo dwóch różnych id lokalnie
  });

  it('starsza zmiana z długo offline urządzenia nie nadpisuje nowszej', async () => {
    const server = new FakeServer();
    const a = await device();
    await syncOnce(a, server.client(USER), USER);
    const b = await device();
    await syncOnce(b, server.client(USER), USER);
    const id = (await byKey(a, 'c2')).id;

    await updateExercise(b, id, { minutes: 3 }); // B offline, zmiana wcześniej
    await tick();
    await updateExercise(a, id, { minutes: 7 }); // A później
    await syncOnce(a, server.client(USER), USER);
    await syncOnce(b, server.client(USER), USER); // B wysyła starszą – serwer ją odrzuca, B pobiera nowszą

    expect((await db1(b, id)).minutes).toBe(7);
    expect(server.tables.exercises.get(id)?.minutes).toBe(7);
  });

  it('złapane wstrzymania z dwóch urządzeń sumują się', async () => {
    const server = new FakeServer();
    const a = await device();
    await syncOnce(a, server.client(USER), USER);
    const b = await device();
    await syncOnce(b, server.client(USER), USER);

    for (let i = 0; i < 3; i++) await addCatch(a, D);
    for (let i = 0; i < 2; i++) await addCatch(b, D);
    await syncOnce(a, server.client(USER), USER);
    await syncOnce(b, server.client(USER), USER);
    await syncOnce(a, server.client(USER), USER);

    expect((await dayLogQuery(a, D))[0]?.catches).toBe(5);
    expect((await dayLogQuery(b, D))[0]?.catches).toBe(5);
  });

  it('usunięcia (miękkie) i odznaczenia się propagują', async () => {
    const server = new FakeServer();
    const a = await device();
    const c3 = await byKey(a, 'c3');
    await completeExercise(a, c3.id, D);
    await syncOnce(a, server.client(USER), USER);
    const b = await device();
    await syncOnce(b, server.client(USER), USER);
    expect(await completionsForDateQuery(b, D)).toHaveLength(1);

    await uncompleteExercise(a, c3.id, D);
    await setExerciseDeleted(a, c3.id, true);
    await syncOnce(a, server.client(USER), USER);
    await syncOnce(b, server.client(USER), USER);
    expect(await completionsForDateQuery(b, D)).toHaveLength(0);
    expect((await exercisesQuery(b)).some((e) => e.id === c3.id)).toBe(false);
  });

  it('brak sieci: błąd, zmiany czekają i wysyłają się później', async () => {
    const server = new FakeServer();
    const a = await device();
    await syncOnce(a, server.client(USER), USER);
    await addCatch(a, D);
    server.online = false;
    await expect(syncOnce(a, server.client(USER), USER)).rejects.toThrow('offline');
    expect(await pendingCount(a)).toBeGreaterThan(0);
    server.online = true;
    await syncOnce(a, server.client(USER), USER);
    expect(await pendingCount(a)).toBe(0);
    expect(server.count('catch_events')).toBe(1);
  });
});

async function db1(db: Db, id: string) {
  return (await db.select().from(exercises).where(eq(exercises.id, id)))[0]!;
}
