import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import * as schema from '@/db/schema';
import type { Db } from '@/db/types';

/** Świeża baza w pamięci z prawdziwymi migracjami – do testów repozytoriów i synchronizacji. */
export function createTestDb(): Db {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../db/migrations') });
  return db as unknown as Db;
}
