/** Wiersz w formacie Supabase (snake_case). */
export type RemoteRow = Record<string, unknown> & { server_updated_at?: string };

export type RemoteTable =
  'exercises' | 'day_logs' | 'catch_events' | 'exercise_completions' | 'settings';

/**
 * Dostęp do serwera – w aplikacji Supabase, w testach serwer w pamięci.
 * `pull` zwraca wiersze użytkownika z server_updated_at >= since (rosnąco), maksymalnie `limit`.
 */
export interface SyncRemote {
  pull(table: RemoteTable, since: string | null, limit: number): Promise<RemoteRow[]>;
  push(table: RemoteTable, rows: RemoteRow[]): Promise<void>;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
}
