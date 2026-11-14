import type { RemoteRow, RemoteTable, SyncRemote } from '@/sync/types';

/**
 * Serwer w pamięci odtwarzający zachowanie migracji Supabase:
 * LWW po updated_at, rosnący server_updated_at, unikalny dzień (user_id, date), ustawienia per użytkownik.
 * Zwraca znaczniki w formacie Postgresa ('+00:00'), żeby testować normalizację.
 */
export class FakeServer {
  tables: Record<RemoteTable, Map<string, RemoteRow>> = {
    exercises: new Map(),
    day_logs: new Map(),
    catch_events: new Map(),
    exercise_completions: new Map(),
    settings: new Map(),
  };
  private clock = Date.UTC(2026, 10, 14, 12, 0, 0);
  online = true;

  private tick(): string {
    this.clock += 1;
    return new Date(this.clock).toISOString().replace('Z', '+00:00');
  }

  private keyOf(table: RemoteTable, row: RemoteRow): string {
    if (table === 'settings') return String(row.user_id);
    if (table === 'day_logs') {
      // Konflikt na (user_id, date) – jak unikalny indeks w Postgresie.
      for (const [k, r] of this.tables.day_logs) {
        if (r.user_id === row.user_id && r.date === row.date) return k;
      }
    }
    return String(row.id);
  }

  client(userId: string): SyncRemote {
    return {
      pull: async (table, since, limit) => {
        if (!this.online) throw new Error('offline');
        return [...this.tables[table].values()]
          .filter(
            (r) => r.user_id === userId && (since == null || String(r.server_updated_at) >= since),
          )
          .sort((a, b) => String(a.server_updated_at).localeCompare(String(b.server_updated_at)))
          .slice(0, limit)
          .map((r) => ({ ...r }));
      },
      push: async (table, rows) => {
        if (!this.online) throw new Error('offline');
        for (const row of rows) {
          if (row.user_id !== userId)
            throw new Error('RLS: new row violates row-level security policy');
          const key = this.keyOf(table, row);
          const existing = this.tables[table].get(key);
          const toMs = (v: unknown) => new Date(String(v)).getTime();
          if (existing && toMs(row.updated_at) < toMs(existing.updated_at)) continue; // trigger LWW
          this.tables[table].set(key, { ...existing, ...row, server_updated_at: this.tick() });
        }
      },
    };
  }

  count(table: RemoteTable, pred: (r: RemoteRow) => boolean = () => true): number {
    return [...this.tables[table].values()].filter(pred).length;
  }
}
