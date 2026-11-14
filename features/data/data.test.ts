/**
 * @jest-environment node
 */
import { eq } from 'drizzle-orm';

import {
  addCatch,
  completeExercise,
  completionsInRangeQuery,
  dayLogQuery,
  setNote,
  setTension,
} from '@/db/repositories/days';
import { exercisesQuery, updateExercise } from '@/db/repositories/exercises';
import { wipeLocalData } from '@/db/repositories/maintenance';
import { getSettings } from '@/db/repositories/settings';
import { exercises } from '@/db/schema';
import { seedIfNeeded } from '@/db/seed';
import { createTestDb } from '@/test/testDb';
import { buildDailyCsv, buildExport } from './exportData';
import { detectImport, ImportError } from './format';
import { importOddech, importPrototype } from './importData';

async function filledDb() {
  const db = createTestDb();
  await seedIfNeeded(db);
  const [c1] = await exercisesQuery(db);
  await completeExercise(db, c1!.id, '2026-11-10', { source: 'pacer', durationS: 300 });
  await addCatch(db, '2026-11-10');
  await addCatch(db, '2026-11-10');
  await setTension(db, '2026-11-10', 6);
  await setNote(db, '2026-11-10', 'Barki; "spięte"');
  return { db, c1: c1! };
}

describe('eksport i import własnego formatu', () => {
  it('pełny cykl: eksport → wyczyszczenie → import odtwarza dane bez duplikatów', async () => {
    const { db } = await filledDb();
    const json = JSON.stringify(await buildExport(db));
    await wipeLocalData(db);
    expect(await completionsInRangeQuery(db, '2026-11-01', '2026-11-30')).toHaveLength(0);

    const detected = detectImport(json);
    expect(detected.kind).toBe('oddech');
    if (detected.kind !== 'oddech') return;
    await importOddech(db, detected.data);

    expect(await exercisesQuery(db)).toHaveLength(7); // ćwiczenia startowe dopasowane po seed_key
    expect(await completionsInRangeQuery(db, '2026-11-01', '2026-11-30')).toHaveLength(1);
    const [log] = await dayLogQuery(db, '2026-11-10');
    expect(log).toMatchObject({ catches: 2, tension: 6, note: 'Barki; "spięte"' });
  });

  it('ponowny import tego samego pliku nic nie dubluje', async () => {
    const { db } = await filledDb();
    const payload = await buildExport(db);
    await importOddech(db, payload);
    await importOddech(db, payload);
    expect(await completionsInRangeQuery(db, '2026-11-01', '2026-11-30')).toHaveLength(1);
    expect((await dayLogQuery(db, '2026-11-10'))[0]?.catches).toBe(2);
  });

  it('konflikt: nowszy updated_at wygrywa, starszy jest ignorowany', async () => {
    const { db, c1 } = await filledDb();
    const old = await buildExport(db);
    await new Promise((r) => setTimeout(r, 5));
    await updateExercise(db, c1.id, { minutes: 9 });
    await importOddech(db, old); // starsza wersja – nie nadpisuje
    expect((await db.select().from(exercises).where(eq(exercises.id, c1.id)))[0]?.minutes).toBe(9);

    const newer = await buildExport(db);
    const edited = {
      ...newer,
      exercises: newer.exercises.map((e) =>
        e.id === c1.id ? { ...e, minutes: 12, updatedAt: '2999-01-01T00:00:00.000Z' } : e,
      ),
    };
    await importOddech(db, edited);
    expect((await db.select().from(exercises).where(eq(exercises.id, c1.id)))[0]?.minutes).toBe(12);
  });

  it('CSV: separator ;, BOM, poprawne cudzysłowy', async () => {
    const { db } = await filledDb();
    const csv = buildDailyCsv(await buildExport(db));
    expect(
      csv.startsWith('﻿data;wykonane;zaplanowane;procent;minuty;wstrzymania;napiecie;notatka'),
    ).toBe(true);
    expect(csv).toContain('2026-11-10;1;7;14;5;2;6;"Barki; ""spięte"""');
  });
});

describe('import z prototypu', () => {
  const proto = {
    exercises: [
      {
        id: 'c1',
        name: 'Ć1. Oddech przeponowy na leżąco',
        slot: 'rano',
        minutes: 5,
        inhale: 4,
        exhale: 6,
        desc: '',
        active: true,
      },
      {
        id: 'x9',
        name: 'Skan ciała',
        slot: 'wieczor',
        minutes: 6,
        inhale: 0,
        exhale: 0,
        desc: 'Od stóp do głowy',
        active: true,
      },
      {
        id: 'c5',
        name: 'ć5. wydłużony WYDECH (zmieniona nazwa)',
        slot: 'wieczor',
        minutes: 4,
        inhale: 4,
        exhale: 8,
      },
    ],
    logs: {
      '2026-10-01': {
        done: ['c1', 'x9', 'nieznane'],
        catches: 4,
        tension: 7,
        note: 'Pierwszy dzień',
      },
      '2026-10-02': { done: ['c5'], catches: 0, tension: null, note: '' },
      'zła-data': { done: ['c1'] },
    },
    settings: { startDate: '2026-10-01', catchGoal: 6 },
  };

  it('mapuje ćwiczenia, dni, licznik i ustawienia', async () => {
    const db = createTestDb();
    await seedIfNeeded(db);
    const detected = detectImport(JSON.stringify(proto));
    expect(detected.kind).toBe('prototype');
    if (detected.kind !== 'prototype') return;
    const summary = await importPrototype(db, detected.data);

    expect(summary).toMatchObject({
      exercisesAdded: 1,
      exercisesMatched: 2,
      days: 2,
      completions: 3,
      catches: 4,
    });
    const list = await exercisesQuery(db);
    expect(list.find((e) => e.name === 'Skan ciała')).toMatchObject({
      slot: 'evening',
      inhaleS: 0,
      exhaleS: 0,
    });
    expect((await dayLogQuery(db, '2026-10-01'))[0]).toMatchObject({
      catches: 4,
      tension: 7,
      note: 'Pierwszy dzień',
    });
    expect(await getSettings(db)).toMatchObject({ programStartDate: '2026-10-01', catchGoal: 6 });
  });

  it('ponowny import nie dubluje, a notatki są łączone, nie nadpisywane', async () => {
    const db = createTestDb();
    await seedIfNeeded(db);
    await setNote(db, '2026-10-01', 'Moja notatka');
    await importPrototype(db, proto);
    await importPrototype(db, proto);
    expect(await completionsInRangeQuery(db, '2026-10-01', '2026-10-02')).toHaveLength(3);
    expect((await dayLogQuery(db, '2026-10-01'))[0]).toMatchObject({
      catches: 4,
      note: 'Moja notatka\n\nPierwszy dzień',
    });
    expect((await exercisesQuery(db)).filter((e) => e.name === 'Skan ciała')).toHaveLength(1);
  });
});

describe('detectImport', () => {
  it('rozpoznaje błędy', () => {
    expect(() => detectImport('nie json')).toThrow(ImportError);
    expect(() => detectImport('[]')).toThrow(ImportError);
    expect(() => detectImport('{"app":"oddech","formatVersion":99}')).toThrow(ImportError);
    expect(() => detectImport('{"foo":1}')).toThrow(ImportError);
  });
});
