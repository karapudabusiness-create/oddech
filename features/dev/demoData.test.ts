/**
 * @jest-environment node
 */
import { completionsInRangeQuery, dayLogsInRangeQuery } from '@/db/repositories/days';
import { seedIfNeeded } from '@/db/seed';
import { addDays, todayKey } from '@/lib/dates';
import { createTestDb } from '@/test/testDb';
import { seedDemoHistory } from './demoData';

it('dane demo wypełniają historię bez naruszania ograniczeń bazy', async () => {
  const db = createTestDb();
  await seedIfNeeded(db);
  await seedDemoHistory(db, 30);
  const from = addDays(todayKey(), -40);
  const completions = await completionsInRangeQuery(db, from, todayKey());
  const logs = await dayLogsInRangeQuery(db, from, todayKey());
  expect(completions.length).toBeGreaterThan(50);
  expect(logs.length).toBeGreaterThan(20);
  expect(logs.every((l) => l.date < todayKey())).toBe(true);
});
