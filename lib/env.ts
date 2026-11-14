/** Konfiguracja z `.env` (zmienne EXPO_PUBLIC_* są wstrzykiwane do bundla przy starcie serwera). */
export const env = {
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim(),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
};

export type SupabaseUrlIssue = 'dashboard' | 'path' | 'not-https' | 'format' | 'quotes';

/**
 * Wykrywa typowe pomyłki w adresie projektu. Poprawny: https://<ref>.supabase.co (lub własna domena bez ścieżki).
 */
export function supabaseUrlIssue(url: string = env.supabaseUrl): SupabaseUrlIssue | null {
  if (/^["']|["']$/.test(url)) return 'quotes';
  if (!url.startsWith('https://')) return 'not-https';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'format';
  }
  if (/(^|\.)supabase\.com$/.test(parsed.hostname)) return 'dashboard';
  if (parsed.pathname.replace(/\/+$/, '') !== '' || parsed.search) return 'path';
  return null;
}

export const isSupabaseConfigured = (): boolean =>
  env.supabaseUrl.startsWith('https://') && env.supabaseAnonKey.length > 20;
