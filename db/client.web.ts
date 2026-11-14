/**
 * Wariant WYŁĄCZNIE dla podglądu w przeglądarce (development, zrzuty ekranu).
 * Na iOS/Androidzie używany jest `client.ts` (expo-sqlite).
 *
 * Tu: sql.js (SQLite skompilowany do JS) w pamięci + ten sam schemat i API Drizzle.
 * Dane znikają po odświeżeniu strony.
 */
import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js/dist/sql-asm.js';

import migrations from './migrations/migrations';
import * as schema from './schema';

export const DB_NAME = 'oddech-web';

let instance: SQLJsDatabase<typeof schema> | null = null;

function getInstance() {
  if (!instance) throw new Error('prepareDb() musi zakończyć się przed użyciem bazy (web)');
  return instance;
}

export const db = new Proxy({} as SQLJsDatabase<typeof schema>, {
  get(_target, prop) {
    const target = getInstance();
    const value = Reflect.get(target, prop, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

let preparing: Promise<void> | null = null;

export function prepareDb(): Promise<void> {
  preparing ??= (async () => {
    const SQL = await initSqlJs();
    const sqlite = new SQL.Database();
    // Migracje: te same pliki SQL co na urządzeniu.
    const journal = migrations.journal.entries;
    for (const entry of journal) {
      const key = `m${String(entry.idx).padStart(4, '0')}` as keyof typeof migrations.migrations;
      const sql = migrations.migrations[key] as string;
      for (const stmt of sql.split('--> statement-breakpoint')) {
        if (stmt.trim()) sqlite.exec(stmt);
      }
    }
    instance = drizzle(sqlite, { schema });
  })();
  return preparing;
}
