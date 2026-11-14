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

/**
 * Adres bazowy dla klienta: dla *.supabase.co sam host (obcina np. /rest/v1 skopiowane z panelu),
 * w innych przypadkach adres bez końcowego ukośnika.
 */
export function supabaseBaseUrl(url: string = env.supabaseUrl): string {
  const clean = url.replace(/^["']|["']$/g, '').trim();
  try {
    const parsed = new URL(clean);
    if (parsed.hostname.endsWith('.supabase.co')) return `https://${parsed.hostname}`;
  } catch {
    // niepoprawny adres – zwracamy jak jest, ostrzeżenie pokaże ekran Konto
  }
  return clean.replace(/\/+$/, '');
}

/** Pomyłki, których nie da się poprawić automatycznie (ścieżkę w *.supabase.co poprawiamy sami). */
export function blockingUrlIssue(url: string = env.supabaseUrl): SupabaseUrlIssue | null {
  const issue = supabaseUrlIssue(url);
  if ((issue === 'path' || issue === 'quotes') && /\.supabase\.co(\/|$|["'])/.test(url))
    return null;
  return issue;
}

export const isSupabaseConfigured = (): boolean =>
  supabaseBaseUrl().startsWith('https://') && env.supabaseAnonKey.length > 20;
