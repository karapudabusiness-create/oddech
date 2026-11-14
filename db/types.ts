import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Wspólny typ bazy dla repozytoriów. Synchroniczny driver SQLite – w aplikacji
 * expo-sqlite, w testach better-sqlite3 (ta sama logika, prawdziwy SQL).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = BaseSQLiteDatabase<'sync', any, typeof schema>;
