import type { SupabaseClient } from '@supabase/supabase-js';

import type { RemoteRow, RemoteTable, SyncRemote } from './types';

const CONFLICT: Record<RemoteTable, string> = {
  exercises: 'id',
  day_logs: 'user_id,date',
  catch_events: 'id',
  exercise_completions: 'id',
  settings: 'user_id',
};

export class SyncHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export function supabaseRemote(client: SupabaseClient): SyncRemote {
  return {
    async pull(table, since, limit) {
      let q = client
        .from(table)
        .select('*')
        .order('server_updated_at', { ascending: true })
        .limit(limit);
      if (since) q = q.gte('server_updated_at', since);
      const { data, error, status } = await q;
      if (error) throw new SyncHttpError(error.message, status);
      return (data ?? []) as RemoteRow[];
    },
    async push(table, rows) {
      if (!rows.length) return;
      const { error, status } = await client
        .from(table)
        .upsert(rows, { onConflict: CONFLICT[table] });
      if (error) throw new SyncHttpError(error.message, status);
    },
  };
}
